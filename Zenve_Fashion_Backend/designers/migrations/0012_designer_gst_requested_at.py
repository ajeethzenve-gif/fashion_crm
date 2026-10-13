from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("designers", "0011_designer_edit_preferences")]
    operations = [migrations.AddField(
        model_name="designer", name="gst_requested_at",
        field=models.DateTimeField(null=True, blank=True, editable=False),
    )]
