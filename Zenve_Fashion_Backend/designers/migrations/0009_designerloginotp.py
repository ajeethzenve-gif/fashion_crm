from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("designers", "0008_designer_user")]
    operations = [migrations.CreateModel(
        name="DesignerLoginOTP",
        fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("phone", models.CharField(blank=True, max_length=15)),
            ("otp_hash", models.CharField(blank=True, max_length=255)),
            ("sent_at", models.DateTimeField(null=True)),
            ("expires_at", models.DateTimeField(null=True)),
            ("attempts", models.PositiveSmallIntegerField(default=0)),
            ("designer", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to="designers.designer")),
        ],
    )]
