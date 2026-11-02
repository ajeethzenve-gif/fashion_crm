from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Rename zf_* tables in the default source database to unprefixed names."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **opts):
        tables = set(connection.introspection.table_names())
        pairs = [(name, name[3:]) for name in sorted(tables)
                 if name.startswith("zf_") and name != "zf_django_migrations"]
        conflicts = [new for _, new in pairs if new in tables]
        if conflicts:
            raise CommandError("Unprefixed target tables already exist: " + ", ".join(conflicts))
        for old, new in pairs:
            self.stdout.write(f"{old} -> {new}")
        if not opts["apply"]:
            self.stdout.write(self.style.WARNING("Dry run only. Use --apply to rename tables."))
            return
        with transaction.atomic():
            with connection.cursor() as cursor:
                for old, new in pairs:
                    cursor.execute(
                        f"RENAME TABLE {connection.ops.quote_name(old)} "
                        f"TO {connection.ops.quote_name(new)}"
                    )
        self.stdout.write(self.style.SUCCESS(f"Renamed {len(pairs)} source tables."))
