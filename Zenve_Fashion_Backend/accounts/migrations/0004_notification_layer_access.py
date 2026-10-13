from django.db import migrations


def grant_access(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Access = apps.get_model("accounts", "RoleLayerAccess")
    alias = schema_editor.connection.alias
    for role in Role.objects.using(alias).exclude(name__iexact="Designer").filter(layer_access__isnull=False).distinct():
        Access.objects.using(alias).get_or_create(role=role, layer="16")


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_alter_rolelayeraccess_layer_notificationread")]
    operations = [migrations.RunPython(grant_access, migrations.RunPython.noop)]
