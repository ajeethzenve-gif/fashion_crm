from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("designers", "0007_designer_credit_points"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [migrations.AddField(
        model_name="designer", name="user",
        field=models.OneToOneField(blank=True, editable=False, null=True,
            on_delete=django.db.models.deletion.SET_NULL,
            related_name="designer_profile", to=settings.AUTH_USER_MODEL),
    )]
