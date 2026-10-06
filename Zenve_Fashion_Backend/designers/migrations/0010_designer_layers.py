from django.db import migrations


def restrict_designer_layers(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Access = apps.get_model("accounts", "RoleLayerAccess")
    for role in Role.objects.filter(name="Designer"):
        Access.objects.filter(role=role).exclude(layer__in=("02", "03", "06")).delete()
        for layer in ("02", "03", "06"):
            Access.objects.get_or_create(role=role, layer=layer)


class Migration(migrations.Migration):
    dependencies = [("designers", "0009_designerloginotp"), ("accounts", "0002_rolelayeraccess")]
    operations = [migrations.RunPython(restrict_designer_layers, migrations.RunPython.noop)]
