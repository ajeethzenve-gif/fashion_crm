from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("designers", "0017_alter_designeremail_kind")]

    operations = [
        # The original migration recorded the OneToOne field under the
        # unprefixed table name. The production table was renamed to zf_*;
        # apply only the OTP uniqueness change against that explicit table.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE `designers_designerloginotp` "
                        "DROP FOREIGN KEY `designers_designerloginotp_designer_id_6747f638_fk_designer_id`, "
                        "DROP INDEX `designer_id`, "
                        "ADD INDEX `zf_otp_designer_id_idx` (`designer_id`), "
                        "ADD CONSTRAINT `zf_otp_designer_fk` FOREIGN KEY (`designer_id`) "
                        "REFERENCES `designer` (`id`) ON DELETE CASCADE"
                    ),
                    reverse_sql=(
                        "ALTER TABLE `designers_designerloginotp` "
                        "DROP FOREIGN KEY `zf_otp_designer_fk`, "
                        "DROP INDEX `zf_otp_designer_id_idx`, "
                        "ADD UNIQUE INDEX `designer_id` (`designer_id`), "
                        "ADD CONSTRAINT `designers_designerloginotp_designer_id_6747f638_fk_designer_id` FOREIGN KEY (`designer_id`) "
                        "REFERENCES `designer` (`id`) ON DELETE CASCADE"
                    ),
                ),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="designerloginotp",
                    name="designer",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_otp_challenges",
                        to="designers.designer",
                    ),
                ),
            ],
        ),
    ]
