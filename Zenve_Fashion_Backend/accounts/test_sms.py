from unittest.mock import Mock, patch
from django.test import SimpleTestCase, override_settings
from .sms import send_designer_otp, SMSConfigurationError, SMSDeliveryError


@override_settings(
    SMS_API_KEY="test-key", SMS_API_URL="https://apitxt.com/api/sendOTP",
    SMS_SENDER_ID="ZENVE", SMS_ROUTE="otp", SMS_AUTH_KEY="",
)
class SMSDeliveryTests(SimpleTestCase):
    @patch("accounts.sms.requests.post")
    def test_sends_otp_without_extra_payload_configuration(self, post):
        post.return_value = Mock(status_code=200)
        post.return_value.json.return_value = {"status": 200}
        send_designer_otp("+919876543210", "012345")
        self.assertEqual(post.call_args.kwargs["json"], {"authkey": "test-key", "mobile": "919876543210", "otp": "012345", "sender": "ZENVE", "route": "otp"})
        self.assertEqual(post.call_args.kwargs["timeout"], 15)
        self.assertFalse(post.call_args.kwargs["allow_redirects"])

    @patch("accounts.sms.requests.post")
    def test_provider_failure_is_not_success(self, post):
        post.return_value = Mock(status_code=200)
        post.return_value.json.return_value = {"status": 400}
        with self.assertRaises(SMSDeliveryError):
            send_designer_otp("+919876543210", "012345")

    @override_settings(SMS_AUTH_KEY="test-auth")
    @patch("accounts.sms.requests.post")
    def test_optional_auth_key(self, post):
        post.return_value = Mock(status_code=200)
        post.return_value.json.return_value = {"status": "success"}
        send_designer_otp("+919876543210", "012345")
        self.assertEqual(post.call_args.kwargs["json"]["authkey"], "test-auth")
        self.assertEqual(post.call_args.kwargs["headers"], {"authkey": "test-auth"})

    @patch("accounts.sms.requests.post")
    def test_auth_error_reports_reason_without_secrets(self, post):
        post.return_value = Mock(status_code=401)
        post.return_value.json.return_value = {"status": "MISSING_AUTH", "message": "Authentication Key is required test-key"}
        with self.assertRaises(SMSDeliveryError) as error:
            send_designer_otp("+919876543210", "012345")
        self.assertIn("Authentication Key is required", str(error.exception))
        self.assertNotIn("test-key", str(error.exception))

    @patch("accounts.sms.requests.post")
    def test_success_type_response(self, post):
        post.return_value = Mock(status_code=200)
        post.return_value.json.return_value = {"type": "success", "message": "request-id"}
        send_designer_otp("+919876543210", "012345")

    @override_settings(SMS_API_KEY="")
    def test_missing_key(self):
        with self.assertRaises(SMSConfigurationError):
            send_designer_otp("+919876543210", "012345")
