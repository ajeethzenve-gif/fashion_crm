from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from designers.models import DesignerEmail
from designers.emails import deliver_email


class Command(BaseCommand):
    help = "Retry pending designer welcome/approval emails, SMS and order emails (at most 100 per run)."

    def handle(self, *args, **options):
        if not settings.DESIGNER_EMAIL_ENABLED and not settings.DESIGNER_SMS_ENABLED:
            raise CommandError("Configure and enable designer email or SMS delivery first.")
        ids = list(DesignerEmail.objects.filter(status="PENDING").order_by("created_at").values_list("pk", flat=True)[:100])
        sent = sum(deliver_email(pk) for pk in ids)
        self.stdout.write(f"Sent: {sent}. Still pending from this batch: {len(ids) - sent}.")
