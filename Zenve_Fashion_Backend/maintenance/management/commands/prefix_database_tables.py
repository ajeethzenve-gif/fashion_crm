from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Rename every application/Django table to zf_<old name>."

    def add_arguments(self, parser):
        parser.add_argument("--prefix", default="zf_")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--include-migrations", action="store_true")
        parser.add_argument("--database", default="default", help="Django database alias to rename")

    def handle(self, *args, **options):
        prefix = options["prefix"]
        if not prefix or any(ch in prefix for ch in "`'\"; "):
            raise CommandError("Prefix must be a simple SQL identifier prefix")

        db = __import__("django.db", fromlist=["connections"]).connections[options["database"]]
        tables = db.introspection.table_names()
        excluded = set()
        if not options["include_migrations"]:
            # Django's migration recorder is deliberately left unchanged. It
            # is infrastructure, and renaming it requires a custom recorder.
            excluded.add("django_migrations")

        pairs = [(old, f"{prefix}{old}") for old in tables
                 if old not in excluded and not old.startswith(prefix)]
        existing = set(tables)
        conflicts = [new for _, new in pairs if new in existing]
        if conflicts:
            raise CommandError("Target tables already exist: " + ", ".join(conflicts))

        if not pairs:
            self.stdout.write(self.style.SUCCESS("No tables need renaming."))
            return

        for old, new in pairs:
            self.stdout.write(f"{old} -> {new}")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING(
                "Dry run only. Re-run with --apply after taking a database backup."
            ))
            return

        with transaction.atomic(using=options["database"]):
            with db.cursor() as cursor:
                for old, new in pairs:
                    cursor.execute(
                        f"RENAME TABLE {db.ops.quote_name(old)} "
                        f"TO {db.ops.quote_name(new)}"
                    )
        self.stdout.write(self.style.SUCCESS(
            f"Renamed {len(pairs)} tables. Set DB_TABLE_PREFIX={prefix} and restart Django."
        ))
