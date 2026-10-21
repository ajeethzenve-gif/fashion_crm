from django.db import migrations


def grant_kyc_access(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Access = apps.get_model("accounts", "RoleLayerAccess")
    db = schema_editor.connection.alias
    for role in Role.objects.using(db).exclude(name__iexact="Designer").filter(layer_access__layer__in=["01", "12"]).distinct():
        Access.objects.using(db).get_or_create(role=role, layer="17")
    role, _ = Role.objects.using(db).get_or_create(name="KYC Reviewer")
    for layer in ["17", "16"]:
        Access.objects.using(db).get_or_create(role=role, layer=layer)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_alter_rolelayeraccess_layer")]
    operations = [migrations.RunPython(grant_kyc_access, migrations.RunPython.noop)]
