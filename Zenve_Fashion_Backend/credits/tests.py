from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from designers.models import Designer
from .models import OfflineFashionCredit
from .views import get_or_create_designer_wallet


class DesignerWalletRegressionTests(TestCase):
    def setUp(self):
        self.plan = OfflineFashionCredit.objects.create(plan="SILVER", credit_points=10000, min_days=30)
        self.designer = Designer.objects.create(designer_code="WALLET-REG", designer_name="Wallet Test", offline_membership_plan="SILVER", credit_points=2000)

    def test_offline_plan_loads_without_allocating_credits(self):
        wallet = get_or_create_designer_wallet(self.designer)
        self.assertEqual(wallet.offline_plan, "Silver")
        self.assertEqual(wallet.offline_credits, 0)
        self.assertEqual(wallet.online_credits, 2000)
        get_or_create_designer_wallet(self.designer)
        wallet.refresh_from_db()
        self.assertEqual(wallet.offline_credits, 0)

    def test_existing_offline_balance_and_expiry_are_preserved(self):
        wallet = get_or_create_designer_wallet(self.designer)
        expiry = timezone.localdate() + timedelta(days=12)
        wallet.offline_credits = 1500
        wallet.offline_pack_expiry = expiry
        wallet.save()
        for _ in range(2):
            get_or_create_designer_wallet(self.designer)
        wallet.refresh_from_db()
        self.assertEqual(wallet.offline_credits, 1500)
        self.assertEqual(wallet.offline_pack_expiry, expiry)

    def test_plan_metadata_sync_does_not_refill_balance(self):
        wallet = get_or_create_designer_wallet(self.designer)
        wallet.offline_plan = "Old plan"
        wallet.offline_credits = 500
        wallet.save()
        wallet = get_or_create_designer_wallet(self.designer)
        self.assertEqual(wallet.offline_plan, "Silver")
        self.assertEqual(wallet.offline_credits, 500)

    def test_dashboard_returns_success_with_offline_plan(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user("wallet-staff", is_staff=True))
        response = client.get(f"/api/designers/{self.designer.pk}/portal-dashboard/")
        self.assertEqual(response.status_code, 200, response.data)
