from unittest.mock import patch
from django.core import mail
from django.db import transaction
from django.test import TestCase, override_settings
from products.models import Product
from orders.models import Order, OrderItem
from .models import Designer, DesignerEmail
from .emails import queue_welcome, queue_order, deliver_email


@override_settings(DESIGNER_EMAIL_ENABLED=True, DESIGNER_SMS_ENABLED=False, DESIGNER_FROM_EMAIL="zenvefashion-noreply@zenvevet.com")
class DesignerEmailTests(TestCase):
    def setUp(self):
        self.designer = Designer.objects.create(designer_code="MAIL-1", designer_name="First", brand_name="First Brand", email="first@example.com", phone="9876543210", stage="REVIEW")
        self.other = Designer.objects.create(designer_code="MAIL-2", designer_name="Second", brand_name="Second Brand", email="second@example.com", phone="9876543211", stage="REVIEW")

    def test_approval_email_once(self):
        self.assertEqual(DesignerEmail.objects.count(), 0)
        with self.captureOnCommitCallbacks(execute=True):
            self.designer.stage = "APPROVED"
            self.designer.save()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["first@example.com"])
        self.assertEqual(mail.outbox[0].from_email, "zenvefashion-noreply@zenvevet.com")
        self.assertIn("designer-login/", mail.outbox[0].body)
        with self.captureOnCommitCallbacks(execute=True):
            self.designer.save()
        self.assertEqual(len(mail.outbox), 1)

    def test_order_grouped_per_designer_without_customer_details(self):
        first = Product.objects.create(designer=self.designer, sku="FIRST-SKU", product_name="First product", mrp=100, selling_price=80)
        second = Product.objects.create(designer=self.other, sku="SECOND-SKU", product_name="Second product", mrp=100, selling_price=80)
        with self.captureOnCommitCallbacks(execute=True):
            with transaction.atomic():
                order = Order.objects.create(shipping_full_name="PRIVATE CUSTOMER", shipping_email="buyer@example.com", shipping_phone="9990001112", shipping_address_line1="PRIVATE ADDRESS")
                OrderItem.objects.create(order=order, product_id=str(first.pk), product_name="PRIVATE SNAPSHOT", product_data={"customer": "PRIVATE SNAPSHOT"}, quantity=2, price=80)
                OrderItem.objects.create(order=order, product_id=str(first.pk), product_name="PRIVATE SNAPSHOT", quantity=1, price=80)
                OrderItem.objects.create(order=order, product_id=str(second.pk), product_name="PRIVATE SNAPSHOT", quantity=1, price=80)
        self.assertEqual(len(mail.outbox), 2)
        first_mail = next(m for m in mail.outbox if m.to == ["first@example.com"])
        self.assertEqual(first_mail.body.count("FIRST-SKU"), 2)
        self.assertIn("INR 240.00", first_mail.body)
        self.assertNotIn("SECOND-SKU", first_mail.body)
        for message in mail.outbox:
            for secret in ["PRIVATE CUSTOMER", "buyer@example.com", "9990001112", "PRIVATE ADDRESS", "PRIVATE SNAPSHOT"]:
                self.assertNotIn(secret, message.body)
            self.assertEqual(len(message.to), 1)
        queue_order(order.pk)
        self.assertEqual(len(mail.outbox), 2)

    def test_smtp_failure_remains_pending_and_can_retry(self):
        with patch("designers.emails.EmailMessage.send", side_effect=RuntimeError("private password")):
            queue_welcome(self.designer.pk)
        job = DesignerEmail.objects.get(channel="EMAIL")
        self.assertEqual(job.status, "PENDING")
        self.assertEqual(job.last_error, "RuntimeError")
        self.assertTrue(deliver_email(job.pk))
        self.assertFalse(deliver_email(job.pk))
        self.assertEqual(len(mail.outbox), 1)

    def test_rollback_does_not_send(self):
        with self.captureOnCommitCallbacks(execute=True):
            try:
                with transaction.atomic():
                    self.designer.stage = "APPROVED"
                    self.designer.save()
                    raise ValueError("rollback")
            except ValueError:
                pass
        self.assertEqual(DesignerEmail.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(DESIGNER_EMAIL_ENABLED=False)
    def test_disabled_delivery_keeps_pending(self):
        queue_welcome(self.designer.pk)
        self.assertEqual(DesignerEmail.objects.filter(status="PENDING").count(), 2)
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(DESIGNER_SMS_ENABLED=True)
    @patch("accounts.sms.send_designer_message")
    def test_creation_sends_pending_welcome_email_and_sms(self, send_sms):
        with self.captureOnCommitCallbacks(execute=True):
            designer = Designer.objects.create(designer_code="NEW-MAIL", designer_name="New Designer", brand_name="New", email="new@example.com", phone="9876543212", stage="REVIEW")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("review", mail.outbox[0].body)
        self.assertNotIn("Password:", mail.outbox[0].body)
        self.assertIn("waiting for team approval", send_sms.call_args.args[1])
        self.assertEqual(send_sms.call_args.args[0], "919876543212")
        self.assertEqual(send_sms.call_args.args[2], "WELCOME")
        with self.captureOnCommitCallbacks(execute=True):
            designer.save()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(send_sms.call_count, 1)

    @override_settings(DESIGNER_SMS_ENABLED=True)
    @patch("accounts.sms.send_designer_message")
    def test_approval_sends_credentials_and_mobile_login_in_both_channels(self, send_sms):
        with self.captureOnCommitCallbacks(execute=True):
            self.designer.stage = "APPROVED"
            self.designer.save()
        for text in [mail.outbox[0].body, send_sms.call_args.args[1]]:
            self.assertIn("first@zf", text)
            self.assertIn("first@zf3210", text)
            self.assertIn("9876543210", text)
            self.assertIn("designer-login/", text)
        self.assertEqual(send_sms.call_args.args[2], "APPROVAL")
        self.assertNotIn("first@zf3210", str(list(DesignerEmail.objects.values())))

    def test_changed_password_is_not_replaced_or_emailed_as_initial_password(self):
        with override_settings(DESIGNER_EMAIL_ENABLED=False):
            with self.captureOnCommitCallbacks(execute=True):
                self.designer.stage = "APPROVED"
                self.designer.save()
        self.designer.user.set_password("PrivateChangedPassword")
        self.designer.user.save()
        job = DesignerEmail.objects.get(channel="EMAIL", kind="APPROVAL")
        self.assertTrue(deliver_email(job.pk))
        self.assertIn("Use your current password", mail.outbox[0].body)
        self.assertNotIn("first@zf3210", mail.outbox[0].body)
        self.assertNotIn("PrivateChangedPassword", mail.outbox[0].body)

    @override_settings(DESIGNER_SMS_ENABLED=True)
    @patch("accounts.sms.send_designer_message", side_effect=RuntimeError("private message"))
    def test_sms_failure_does_not_repeat_successful_email(self, send_sms):
        queue_welcome(self.designer.pk)
        self.assertEqual(len(mail.outbox), 1)
        sms = DesignerEmail.objects.get(channel="SMS")
        self.assertEqual(sms.status, "PENDING")
        send_sms.side_effect = None
        queue_welcome(self.designer.pk)
        self.assertEqual(len(mail.outbox), 1)
        sms.refresh_from_db()
        self.assertEqual(sms.status, "SENT")
