from unittest.mock import Mock, patch
import requests
from django.test import SimpleTestCase, override_settings
from .apitxt_kyc import verify_identity
from .kyc_provider import KYCProviderUnavailable, provider_configured


@override_settings(APITXT_AUTH_KEY="test-auth-key", APITXT_KYC_HANDLER="designers.apitxt_kyc.verify_identity")
class APITXTKYCTests(SimpleTestCase):
    def response(self, body, status=200):
        response = Mock(status_code=status)
        response.json.return_value = body
        return response

    @patch("designers.apitxt_kyc.requests.post")
    def test_pan_request_and_explicit_verified_response(self, post):
        post.return_value = self.response({"status": 200, "request_id": "pan-ref", "data": {"verified": True, "name": "Holder Name"}})
        result = verify_identity("pan", {"pan_number": "ABCDE1234F", "name": "Holder Name", "date_of_birth": "1990-05-12"})
        self.assertTrue(result["verified"])
        self.assertEqual(post.call_args.kwargs["json"], {"authkey": "test-auth-key", "pan": "ABCDE1234F", "name": "Holder Name", "dob": "12/05/1990"})
        self.assertFalse(post.call_args.kwargs["allow_redirects"])

    @patch("designers.apitxt_kyc.requests.post")
    def test_aadhaar_send_uses_number_and_returns_reference_only(self, post):
        post.return_value = self.response({"status": 200, "data": {"reference_id": "otp-reference"}})
        self.assertEqual(verify_identity("aadhaar_send", {"aadhaar_number": "234567891234", "consent": True}), {"transaction_id": "otp-reference"})
        self.assertEqual(post.call_args.kwargs["json"]["aadhaar_number"], "234567891234")

    @patch("designers.apitxt_kyc.requests.post")
    def test_aadhaar_verify_discards_address_and_photo(self, post):
        post.return_value = self.response({"status": 200, "data": {"verified": True, "reference_id": "aadhaar-ref", "name": "Holder Name", "date_of_birth": "1990-05-12", "full_address": "Sensitive address", "photo": "base64-image"}})
        result = verify_identity("aadhaar_verify", {"transaction_id": "otp-reference", "otp": "123456"})
        self.assertEqual(post.call_args.kwargs["json"]["reference_id"], "otp-reference")
        self.assertNotIn("photo", result)
        self.assertNotIn("full_address", result)
        self.assertNotIn("otp", result)

    @patch("designers.apitxt_kyc.requests.post")
    def test_http_success_does_not_prove_verification(self, post):
        for data in [{"name": "Holder Name"}, {"verified": "true", "name": "Holder Name"}]:
            post.return_value = self.response({"status": 200, "data": data})
            with self.assertRaises(KYCProviderUnavailable):
                verify_identity("pan", {"pan_number": "ABCDE1234F", "name": "Holder Name", "date_of_birth": "1990-05-12"})

    @patch("designers.apitxt_kyc.requests.post")
    def test_provider_errors_redact_credentials_and_identity(self, post):
        post.return_value = self.response({"status": "error", "message": "test-auth-key ABCDE1234F 234567891234 failed"}, 400)
        with self.assertRaises(KYCProviderUnavailable) as raised:
            verify_identity("pan", {"pan_number": "ABCDE1234F", "name": "Holder Name", "date_of_birth": "1990-05-12"})
        self.assertNotIn("test-auth-key", str(raised.exception))
        self.assertNotIn("ABCDE1234F", str(raised.exception))
        self.assertNotIn("234567891234", str(raised.exception))

    @patch("designers.apitxt_kyc.requests.post", side_effect=requests.Timeout)
    def test_timeout_returns_safe_error(self, post):
        with self.assertRaises(KYCProviderUnavailable):
            verify_identity("pan", {"pan_number": "ABCDE1234F", "name": "Holder Name", "date_of_birth": "1990-05-12"})

    @override_settings(APITXT_AUTH_KEY="", SMS_AUTH_KEY="", SMS_API_KEY="")
    def test_no_credentials_means_not_connected(self):
        self.assertFalse(provider_configured())

    @patch("designers.apitxt_kyc.requests.post")
    def test_aadhaar_otp_needs_no_holder_name_or_new_reference(self, post):
        post.return_value = self.response({"status": 200, "data": {"verified": True}})
        result = verify_identity("aadhaar_verify", {"transaction_id": "server-session", "otp": "123456"})
        self.assertEqual(result, {"verified": True, "reference": "server-session", "verification_type": "OTP"})
        post.return_value = self.response({"status": 200, "data": {"verified": False}})
        self.assertFalse(verify_identity("aadhaar_verify", {"transaction_id": "server-session", "otp": "123456"})["verified"])

    @patch("designers.apitxt_kyc.requests.post")
    def test_pan_requires_name_or_explicit_input_matches(self, post):
        payload = {"pan_number": "ABCDE1234F", "name": "Holder Name", "date_of_birth": "1990-05-12"}
        post.return_value = self.response({"status": 200, "data": {"verified": True}})
        with self.assertRaises(KYCProviderUnavailable):
            verify_identity("pan", payload)
        post.return_value = self.response({"status": 200, "data": {"verified": True, "name_match": True, "dob_match": True}})
        result = verify_identity("pan", payload)
        self.assertEqual(result["name_source"], "provider_matched_input")
        self.assertEqual(result["reference_source"], "local_audit")
        self.assertEqual(result["date_of_birth"], "1990-05-12")

    @patch("designers.apitxt_kyc.requests.post")
    def test_http_200_provider_failure_is_not_otp_success(self, post):
        post.return_value = self.response({"status": "error", "request_id": "AADH-VER-support", "message": "Aadhaar OTP verification failed. Please try again later."})
        with self.assertRaises(KYCProviderUnavailable) as raised:
            verify_identity("aadhaar_verify", {"transaction_id": "otp-reference", "otp": "123456"})
        message = str(raised.exception)
        self.assertNotIn("HTTP 200", message)
        self.assertNotIn("123456", message)
        self.assertIn("request a new OTP", message)
        self.assertIn("AADH-VER-support", message)
        self.assertEqual(post.call_count, 1)

    @patch("designers.apitxt_kyc.requests.post")
    def test_transport_failures_have_distinct_safe_errors(self, post):
        payload = {"transaction_id": "private-reference", "otp": "123456"}
        for error, code in [(requests.ReadTimeout("123456"), "provider_read_timeout"),
                            (requests.ConnectTimeout("123456"), "provider_connect_timeout"),
                            (requests.ConnectionError("123456"), "provider_connection_error"),
                            (requests.exceptions.SSLError("123456"), "provider_tls_error")]:
            post.reset_mock()
            post.side_effect = error
            with self.assertRaises(KYCProviderUnavailable) as raised:
                verify_identity("aadhaar_verify", payload)
            self.assertEqual(raised.exception.code, code)
            self.assertNotIn("123456", str(raised.exception))
            self.assertEqual(post.call_count, 1)

    @override_settings(APITXT_CONNECT_TIMEOUT=10, APITXT_AADHAAR_VERIFY_TIMEOUT=300)
    @patch("designers.apitxt_kyc.requests.post")
    def test_aadhaar_verification_waits_longer_and_handles_non_json(self, post):
        response = self.response({}, status=502)
        response.json.side_effect = ValueError("private response")
        post.return_value = response
        with self.assertRaises(KYCProviderUnavailable) as raised:
            verify_identity("aadhaar_verify", {"transaction_id": "otp-reference", "otp": "123456"})
        self.assertEqual(post.call_args.kwargs["timeout"], (10, 300))
        self.assertEqual(raised.exception.code, "provider_invalid_response")
        self.assertEqual(raised.exception.status_code, 502)
        self.assertNotIn("private response", str(raised.exception))
