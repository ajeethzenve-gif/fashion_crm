"""One-time recovery for an existing pre-KYC schema with an empty migration table.

Run through manage.py shell. Backs up MySQL before writing migration records.
Does not fake the new KYC migrations. Refuses missing columns/tables.
"""
import os
import subprocess
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.db import connection, transaction
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder

recorder = MigrationRecorder(connection)
if recorder.migration_qs.exists():
    raise RuntimeError("Migration history is not empty; this recovery must not be repeated.")
loader = MigrationLoader(connection)
targets = [("designers", "0012_designer_gst_requested_at"), ("accounts", "0004_notification_layer_access")]
targets += [leaf for leaf in loader.graph.leaf_nodes() if leaf[0] not in {"designers", "accounts"}]
state = loader.project_state(targets)
tables = set(connection.introspection.table_names())
issues = []
permissive_null_columns = []
with connection.cursor() as cursor:
    for model in state.apps.get_models(include_auto_created=True):
        if not model._meta.managed or model._meta.proxy:
            continue
        table = model._meta.db_table
        if table not in tables:
            issues.append(f"Missing table: {table}")
            continue
        columns = {item.name: item for item in connection.introspection.get_table_description(cursor, table)}
        for field in model._meta.local_fields:
            actual = columns.get(field.column)
            if actual is None:
                issues.append(f"Missing column: {table}.{field.column}")
                continue
            if field.max_length and field.max_length != actual.internal_size:
                issues.append(f"Length mismatch: {table}.{field.column}")
            if field.null and not actual.null_ok:
                issues.append(f"Nullability too restrictive: {table}.{field.column}")
            if not field.null and actual.null_ok:
                permissive_null_columns.append(f"{table}.{field.column}")
if issues:
    raise RuntimeError("Schema does not match the recovery baseline: " + "; ".join(issues))
if set(permissive_null_columns) - {"designer.follow_up_tasks", "product.colour"}:
    raise RuntimeError("Unexpected nullable columns; inspect before recovery.")

dump = Path(r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe")
if not dump.is_file():
    raise RuntimeError("MySQL backup utility is missing. No database records changed.")
config = settings.DATABASES["default"]
backup_dir = settings.BASE_DIR.parent / "database_backups"
backup_dir.mkdir(exist_ok=True)
backup = backup_dir / f"before_migration_history_recovery_{datetime.now():%Y%m%d_%H%M%S}.sql"
environment = os.environ.copy()
environment["MYSQL_PWD"] = config["PASSWORD"]
command = [str(dump), "--single-transaction", "--skip-lock-tables", "--no-tablespaces", "--column-statistics=0",
           "--host", str(config["HOST"]), "--port", str(config["PORT"]), "--user", str(config["USER"]), str(config["NAME"])]
with backup.open("wb") as output:
    result = subprocess.run(command, env=environment, stdout=output, stderr=subprocess.PIPE)
if result.returncode or not backup.stat().st_size:
    raise RuntimeError("Database backup failed. No migration records changed. Check mysqldump permissions.")
print("Backup saved:", backup)
plan = []
for target in targets:
    for key in loader.graph.forwards_plan(target):
        if key not in plan:
            plan.append(key)
with transaction.atomic():
    for app, name in plan:
        recorder.record_applied(app, name)
print("Restored migration history entries:", len(plan))
print("Existing nullable-column differences preserved:", permissive_null_columns)
print("Now run python manage.py migrate to apply the new KYC migrations normally.")
