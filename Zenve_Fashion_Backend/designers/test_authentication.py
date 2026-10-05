from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import UserRole
from .models import Designer, DesignerLoginOTP


@override_settings(DESIGNER_OTP_SMS_SENDER="tests.sms.send")
class DesignerAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.designer = Designer.objects.create(
            designer_code="DSG-TEST", designer_name="Test Designer",
            owner_name="Test Owner", brand_name="Test Brand",
            email="test@example.com", phone="9876543210", city="Mumbai",
            primary_category="Fashion", stage="REVIEW",
        )

    def approve(self):
        self.designer.stage = "APPROVED"
        self.designer.save()

    def send(self):
        with patch("accounts.designer_login.import_string") as sender:
            response = self.client.post("/api/designer/send-otp/", {"phone_number": "+91 9876543210"})
            otp = sender.return_value.call_args.args[1] if sender.return_value.called else None
        return response, otp

    def verify(self, otp):
        return self.client.post("/api/designer/verify-otp/", {"phone_number": "9876543210", "otp": otp})

    def test_approval_is_idempotent_and_creates_role(self):
        self.assertIsNone(self.designer.user_id)
        self.approve()
        user_id = self.designer.user_id
        self.approve()
        self.assertEqual(self.designer.user_id, user_id)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(UserRole.objects.get(user_id=user_id).role.name, "Designer")
        self.assertEqual(self.designer.user.email, "test@example.com")
        self.assertFalse(self.designer.user.has_usable_password())

    def test_stale_instances_reuse_existing_account(self):
        stale = Designer.objects.get(pk=self.designer.pk)
        self.approve()
        stale.stage = "APPROVED"
        stale.save()
        self.assertEqual(stale.user_id, self.designer.user_id)
        self.assertEqual(User.objects.count(), 1)

    def test_unapproved_account_cannot_request_otp(self):
        self.assertEqual(self.send()[0].status_code, 400)

    def test_login_and_single_use(self):
        self.approve()
        response, otp = self.send()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("otp", response.data)
        self.assertNotEqual(DesignerLoginOTP.objects.get().otp_hash, otp)
        self.assertEqual(self.send()[0].status_code, 429)
        response = self.verify(otp)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["designer"]["id"], self.designer.pk)
        self.assertIn("access", response.data)
        self.assertEqual(self.verify(otp).status_code, 400)

    def test_expiry_and_attempt_limit(self):
        self.approve()
        _, otp = self.send()
        wrong = "000000" if otp != "000000" else "111111"
        for _ in range(5):
            self.assertEqual(self.verify(wrong).status_code, 400)
        self.assertEqual(self.verify(otp).status_code, 400)
        DesignerLoginOTP.objects.update(attempts=0, expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.verify(otp).status_code, 400)

    def test_revoked_and_ambiguous_mobile_are_rejected(self):
        self.approve()
        _, otp = self.send()
        self.designer.stage = "REJECTED"
        self.designer.save()
        self.assertEqual(self.verify(otp).status_code, 400)
        self.approve()
        Designer.objects.create(designer_code="DSG-OTHER", designer_name="Other", owner_name="Other",
            brand_name="Other", email="other@example.com", phone="+919876543210",
            city="Mumbai", primary_category="Fashion", stage="APPROVED")
        self.assertEqual(self.send()[0].status_code, 400)

    @override_settings(DESIGNER_OTP_SMS_SENDER="")
    def test_missing_sms_configuration(self):
        self.approve()
        self.assertEqual(self.send()[0].status_code, 503)
