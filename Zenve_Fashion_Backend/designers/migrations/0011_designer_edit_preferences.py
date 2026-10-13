from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("designers", "0010_designer_layers")]

    operations = [
        migrations.AddField(
            model_name="designer", name="renewal_preference",
            field=models.CharField(max_length=30, blank=True, default=""),
        ),
        migrations.AddField(
            model_name="designer", name="fulfillment",
            field=models.CharField(max_length=30, blank=True, default=""),
        ),
    ]
