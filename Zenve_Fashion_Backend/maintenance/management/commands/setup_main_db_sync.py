"""Create one-way MySQL triggers from the CRM database to the main database.

Only tables with the same columns and a primary key are synchronized. This is
intentional: the main database contains unrelated legacy tables that must not
be overwritten.
"""

import os
import re

import pymysql
from django.core.management.base import BaseCommand


IDENT = re.compile(r"^[A-Za-z0-9_]+$")


class Command(BaseCommand):
    help = "Mirror unprefixed source tables into matching zf_-prefixed main tables."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--create-missing", action="store_true")
        parser.add_argument("--target-prefix", default="zf_")
        parser.add_argument("--copy-data", action="store_true")

    def handle(self, *args, **opts):
        source = pymysql.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3307")),
            user=os.getenv("DB_USER"), password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "zenvefashion"),
        )
        target = pymysql.connect(
            host=os.getenv("MAIN_DB_HOST", "127.0.0.1"),
            port=int(os.getenv("MAIN_DB_PORT", "3307")),
            user=os.getenv("MAIN_DB_USER"), password=os.getenv("MAIN_DB_PASSWORD"),
            database=os.getenv("MAIN_DB_NAME", "zenve_main"),
        )
        try:
            if opts["create_missing"]:
                self._create_missing(source, target, opts["apply"], opts["target_prefix"])
            if opts["copy_data"] and opts["apply"]:
                self._copy_data(source, target, opts["target_prefix"])
            pairs = self._compatible_pairs(source, target, opts["target_prefix"])
            if not pairs:
                self.stdout.write("No compatible source/target tables found.")
                return
            for table, target_table, pk in pairs:
                self.stdout.write(f"{table} -> {target_table}")
            if not opts["apply"]:
                self.stdout.write("Dry run only. Re-run with --apply to create triggers.")
                return
            self._create_triggers(source, target, pairs)
            self._align_otp_target_index(target)
            self.stdout.write(self.style.SUCCESS(f"Created synchronization triggers for {len(pairs)} tables."))
        finally:
            source.close()
            target.close()

    def _create_missing(self, source, target, apply, target_prefix):
        source_db = os.getenv("DB_NAME", "zenvefashion")
        target_db = os.getenv("MAIN_DB_NAME", "zenve_main")
        with source.cursor() as cur:
            cur.execute("SHOW TABLES")
            source_tables = [row[0] for row in cur.fetchall()
                             if row[0] != "django_migrations" and not row[0].startswith("zf_")]
        with target.cursor() as cur:
            cur.execute("SHOW TABLES")
            target_tables = {row[0] for row in cur.fetchall()}
            for table in source_tables:
                target_table = f"{target_prefix}{table}"
                if target_table in target_tables:
                    continue
                self.stdout.write(f"missing: {target_table}")
                if apply:
                    cur.execute(
                        f"CREATE TABLE `{target_db}`.`{target_table}` "
                        f"LIKE `{source_db}`.`{table}`"
                    )
        if apply:
            target.commit()

    @staticmethod
    def _columns(conn, table):
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s ORDER BY ORDINAL_POSITION",
                (table,),
            )
            return [row[0] for row in cur.fetchall()]

    def _compatible_pairs(self, source, target, target_prefix):
        with source.cursor() as cur:
            cur.execute("SHOW TABLES")
            source_tables = [row[0] for row in cur.fetchall()]
        with target.cursor() as cur:
            cur.execute("SHOW TABLES")
            target_tables = {row[0] for row in cur.fetchall()}
        pairs = []
        for table in source_tables:
            if table == "django_migrations" or table.startswith("zf_"):
                continue
            target_table = f"{target_prefix}{table}"
            if target_table not in target_tables or not IDENT.match(target_table):
                continue
            source_cols = self._columns(source, table)
            target_cols = self._columns(target, target_table)
            if source_cols != target_cols:
                continue
            with source.cursor() as cur:
                cur.execute(f"SHOW KEYS FROM `{table}` WHERE Key_name='PRIMARY'")
                pk = [row[4] for row in cur.fetchall()]
            if len(pk) == 1:
                pairs.append((table, target_table, pk[0]))
        return pairs

    def _copy_data(self, source, target, target_prefix):
        with source.cursor() as cur:
            cur.execute("SHOW TABLES")
            tables = [row[0] for row in cur.fetchall()
                      if row[0] != "django_migrations" and not row[0].startswith("zf_")]
        with target.cursor() as out:
            for table in tables:
                target_table = f"{target_prefix}{table}"
                cols = self._columns(source, table)
                if not cols:
                    continue
                with source.cursor() as cur:
                    cur.execute(f"SELECT * FROM `{table}`")
                    rows = cur.fetchall()
                if not rows:
                    continue
                quoted = ", ".join(f"`{c}`" for c in cols)
                marks = ", ".join(["%s"] * len(cols))
                out.executemany(
                    f"INSERT IGNORE INTO `{target_table}` ({quoted}) VALUES ({marks})",
                    rows,
                )
                self.stdout.write(f"copied {len(rows)} rows: {target_table}")
        target.commit()

    def _create_triggers(self, source, target, pairs):
        target_db = os.getenv("MAIN_DB_NAME", "zenve_main")
        with source.cursor() as cur:
            for table, target_table, pk in pairs:
                cols = self._columns(source, table)
                quoted = ", ".join(f"`{c}`" for c in cols)
                new_values = ", ".join(f"NEW.`{c}`" for c in cols)
                set_values = ", ".join(f"`{c}`=NEW.`{c}`" for c in cols if c != pk)
                safe = re.sub(r"[^A-Za-z0-9_]", "_", table)
                for suffix in ("ins", "upd", "del"):
                    # Remove both current and legacy trigger names. Earlier
                    # configurations used the source's zf_ name in the trigger
                    # even after the source table itself was renamed.
                    legacy_safe = re.sub(r"[^A-Za-z0-9_]", "_", f"zf_{table}")
                    cur.execute(f"DROP TRIGGER IF EXISTS `zf_sync_{safe}_{suffix}`")
                    cur.execute(f"DROP TRIGGER IF EXISTS `zf_sync_{legacy_safe}_{suffix}`")
                cur.execute(
                    f"CREATE TRIGGER `zf_sync_{safe}_ins` AFTER INSERT ON `{table}` "
                    f"FOR EACH ROW INSERT INTO `{target_db}`.`{target_table}` ({quoted}) VALUES ({new_values})"
                )
                cur.execute(
                    f"CREATE TRIGGER `zf_sync_{safe}_upd` AFTER UPDATE ON `{table}` "
                    f"FOR EACH ROW UPDATE `{target_db}`.`{target_table}` SET {set_values} WHERE `{pk}`=OLD.`{pk}`"
                )
                cur.execute(
                    f"CREATE TRIGGER `zf_sync_{safe}_del` AFTER DELETE ON `{table}` "
                    f"FOR EACH ROW DELETE FROM `{target_db}`.`{target_table}` WHERE `{pk}`=OLD.`{pk}`"
                )
        source.commit()

    @staticmethod
    def _align_otp_target_index(target):
        """Keep the mirror OTP table compatible with multiple source challenges."""
        table = "zf_designers_designerloginotp"
        with target.cursor() as cursor:
            cursor.execute(
                "SELECT NON_UNIQUE, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME='designer_id'",
                (table,),
            )
            indexes = cursor.fetchall()
            unique_names = {name for non_unique, name in indexes if non_unique == 0 and name != "PRIMARY"}
            for index_name in unique_names:
                cursor.execute(f"ALTER TABLE `{table}` DROP INDEX `{index_name}`")
            if not any(non_unique == 1 for non_unique, _ in indexes):
                cursor.execute(f"ALTER TABLE `{table}` ADD INDEX `zf_otp_designer_id_idx` (`designer_id`)")
        target.commit()
