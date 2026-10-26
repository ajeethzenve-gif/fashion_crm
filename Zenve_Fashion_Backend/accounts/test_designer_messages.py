from unittest.mock import Mock, patch
from django.test import SimpleTestCase, override_settings
from .sms import send_designer_message, SMSDeliveryError, SMSConfigurationError


@override_settings(SMS_AUTH_KEY="test-key", DESIGNER_SMS_SENDER_ID="ZENVE", DESIGNER_SMS_PE_ID="entity", DESIGNER_SMS_WELCOME_TEMPLATE_ID="welcome-template", DESIGNER_SMS_APPROVAL_TEMPLATE_ID="approval-template", DESIGNER_SMS_ROUTE="4")
class DesignerMessagesTests(SimpleTestCase):
    @patch("accounts.sms.requests.post")
    def test_documented_sendmsg_fields_and_template(self, post):
        response = Mock(status_code=200)
        response.json.return_value = {"status": 200}
        post.return_value = response
        send_designer_message("919876543210", "Welcome", "WELCOME")
        self.assertEqual(post.call_args.args[0], "https://apitxt.com/api/sendMsg")
        self.assertEqual(post.call_args.kwargs["json"]["template_id"], "welcome-template")
        self.assertEqual(post.call_args.kwargs["json"]["mobiles"], "919876543210")
        response.json.return_value = {"status": "error", "message": "private contents"}
        with self.assertRaises(SMSDeliveryError):
            send_designer_message("919876543210", "Welcome", "WELCOME")

    @override_settings(DESIGNER_SMS_WELCOME_TEMPLATE_ID="")
    @patch("accounts.sms.requests.post")
    def test_missing_template_does_not_send(self, post):
        with self.assertRaises(SMSConfigurationError):
            send_designer_message("919876543210", "Welcome", "WELCOME")
        post.assert_not_called()
