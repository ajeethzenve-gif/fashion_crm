from django.core.management.base import BaseCommand
from django.db import transaction
from designers.authentication import LOGIN_STAGES, provision_designer_user
from designers.models import Designer


class Command(BaseCommand):
    help = "Create linked login accounts and Designer roles for existing approved designers."

    def handle(self, *args, **options):
        count = 0
        for pk in Designer.objects.filter(stage__in=LOGIN_STAGES).values_list("pk", flat=True):
            with transaction.atomic():
                designer = Designer.objects.select_for_update().get(pk=pk)
                provision_designer_user(designer)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"Provisioned {count} designer accounts."))
