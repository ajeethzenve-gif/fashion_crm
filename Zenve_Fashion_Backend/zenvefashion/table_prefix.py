"""Runtime table-name prefix support.

The physical rename is performed by ``prefix_database_tables``.  This module
keeps Django's model metadata in sync after the rename, including implicit
many-to-many through tables.
"""

from django.conf import settings


def apply_table_prefix():
    prefix = getattr(settings, "DB_TABLE_PREFIX", "")
    if not prefix:
        return

    from django.apps import apps

    for model in apps.get_models(include_auto_created=True):
        table = model._meta.db_table
        if table and not table.startswith(prefix):
            model._meta.db_table = f"{prefix}{table}"
