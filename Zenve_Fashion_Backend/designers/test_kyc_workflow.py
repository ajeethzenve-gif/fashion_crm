from unittest.mock import patch
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import Designer, DesignerKYC


class KYCCallWorkflowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user("call-reviewer", is_staff=True))
        self.designer = Designer.objects.create(designer_code="CALL-KYC", designer_name="Designer Name",
            owner_name="Holder Name", brand_name="Brand", phone="9876543210", kyc_status="PENDING")
        response = self.client.post(f"/api/designers/kyc/designer/{self.designer.pk}/start/")
        self.assertEqual(response.status_code, 200, response.data)
        self.record = DesignerKYC.objects.get(designer=self.designer)
        self.check_url = f"/api/designers/kyc/{self.record.pk}/check/"
        self.confirm_url = f"/api/designers/kyc/{self.record.pk}/confirm/"

    def check(self, body):
        if body.get("action") == "pan":
            body = {"pan_dob": "1990-05-12", **body}
        return self.client.post(self.check_url, {"consent": True, **body}, format="json")

    def test_pan_date_of_birth_is_required_and_must_be_in_past(self):
        with patch("designers.kyc_workflow.verify_identity") as provider:
            for dob in ["", "invalid-date", "2999-01-01"]:
                response = self.check({"action": "pan", "pan_number": "ABCDE1234F", "pan_dob": dob})
                self.assertEqual(response.status_code, 400)
            provider.assert_not_called()

    def verify_both(self, pan_name="Holder Name"):
        with patch("designers.kyc_workflow.verify_identity", return_value={"verified": True, "name": pan_name, "reference": "pan-ref"}):
            self.assertEqual(self.check({"action": "pan", "pan_number": "ABCDE1234F"}).status_code, 200)

    def test_all_unverified_designers_are_in_call_queue_without_documents(self):
        response = self.client.get("/api/designers/kyc/")
        designer = next(item for item in response.data["designers"] if item["id"] == self.designer.pk)
        self.assertEqual(designer["phone"], "9876543210")
        self.assertEqual(designer["owner_name"], "Holder Name")
        self.assertEqual(self.record.verification_method, "APITXT")

    def test_successful_checks_require_staff_confirmation(self):
        self.verify_both()
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")
        response = self.client.post(self.confirm_url, {"details_confirmed": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.designer.refresh_from_db()
        self.record.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "VERIFIED")
        self.assertEqual(self.record.aadhaar_status, "PENDING")
        self.assertNotIn("234567891234", str(self.record.api_checks))
        self.assertNotIn("123456", str(self.record.api_checks))

    def test_cannot_confirm_without_checks_or_with_mismatched_names(self):
        self.assertEqual(self.client.post(self.confirm_url, {"details_confirmed": True}, format="json").status_code, 400)
        self.verify_both(pan_name="Another Holder")
        self.assertEqual(self.client.post(self.confirm_url, {"details_confirmed": True}, format="json").status_code, 400)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")

    @override_settings(APITXT_KYC_HANDLER="")
    def test_unconfigured_api_does_not_verify_identity(self):
        response = self.check({"action": "pan", "pan_number": "ABCDE1234F"})
        self.assertEqual(response.status_code, 503)
        self.record.refresh_from_db()
        self.assertNotIn("pan", self.record.api_checks)

    def test_pan_check_sends_holder_name_and_rejects_blank_name(self):
        with patch("designers.kyc_workflow.verify_identity", return_value={"verified": True, "name": "Holder Name", "reference": "name-ref"}) as provider:
            response = self.check({"action": "pan", "pan_number": "ABCDE1234F", "pan_name": "Holder Name"})
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(provider.call_args.args[1]["name"], "Holder Name")
            response = self.check({"action": "pan", "pan_number": "ABCDE1234F", "pan_name": ""})
            self.assertEqual(response.status_code, 400)

    def test_consent_and_server_otp_session_required(self):
        self.assertEqual(self.client.post(self.check_url, {"action": "pan", "pan_number": "ABCDE1234F"}).status_code, 400)
        self.assertEqual(self.check({"action": "aadhaar_verify", "otp": "123456", "session_token": "fake"}).status_code, 400)
        self.assertEqual(self.client.post(f"/api/designers/kyc/{self.record.pk}/review/", {"document": "pan", "decision": "VERIFIED"}).status_code, 400)

    def test_submitted_pan_dob_must_match_pan_result(self):
        self.verify_both()
        self.record.refresh_from_db()
        self.record.api_checks["pan"]["date_of_birth"] = "1991-01-01"
        self.record.save()
        response = self.client.post(self.confirm_url, {"details_confirmed": True}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_designer_request_is_single_use_and_does_not_verify_identity(self):
        issued = self.client.post(f"/api/designers/kyc/{self.record.pk}/request-details/")
        self.assertEqual(issued.status_code, 200)
        public = APIClient()
        body = {"token": issued.data["token"], "name": "Holder Name", "pan": "ABCDE1234F",
                "dob": "1990-05-12", "consent": True}
        url = "/api/designers/kyc/requested-details/"
        self.assertEqual(public.post(url, {**body, "token": "invalid"}, format="json").status_code, 400)
        self.assertEqual(public.post(url, body, format="json").status_code, 200)
        self.assertEqual(public.post(url, body, format="json").status_code, 400)
        self.record.refresh_from_db()
        self.assertNotIn("pan", self.record.api_checks)
        self.assertEqual(self.record.pan_status, "PENDING")
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")
        self.assertEqual(public.post(f"/api/designers/kyc/{self.record.pk}/request-details/").status_code, 401)

    def test_notification_and_authenticated_designer_submission(self):
        self.designer.stage = "APPROVED"
        self.designer.save()
        self.client.post(f"/api/designers/kyc/{self.record.pk}/request-details/")
        owner = APIClient()
        owner.force_authenticate(self.designer.user)
        dashboard = owner.get(f"/api/designers/{self.designer.pk}/portal-dashboard/")
        self.assertEqual(dashboard.status_code, 200, dashboard.data)
        self.assertTrue(any(n.get("kind") == "KYC_DETAILS_REQUEST" for n in dashboard.data["notifications"]))
        body = {"name": "Holder Name", "pan": "ABCDE1234F", "dob": "1990-05-12", "consent": True}
        other = APIClient()
        other.force_authenticate(User.objects.create_user("unrelated"))
        self.assertEqual(other.post("/api/designers/kyc/my-details/", body, format="json").status_code, 404)
        self.assertEqual(owner.post("/api/designers/kyc/my-details/", body, format="json").status_code, 200)
        self.assertEqual(owner.post("/api/designers/kyc/my-details/", body, format="json").status_code, 400)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")


    def test_pan_alone_matches_designer_submission(self):
        self.designer.owner_name = "Different CRM Display Name"
        self.designer.save()
        self.record.api_checks = {"designer_details": {"name": "Holder Name", "pan": "ABCDE1234F", "date_of_birth": "1990-05-12"}}
        self.record.save()
        self.verify_both()
        response = self.client.post(self.confirm_url, {"details_confirmed": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)

    def test_submitted_identity_numbers_cannot_be_swapped(self):
        self.verify_both()
        self.record.refresh_from_db()
        self.record.api_checks["designer_details"] = {"name": "Holder Name", "pan": "ZZZZZ1234F"}
        self.record.save()
        self.assertEqual(self.client.post(self.confirm_url, {"details_confirmed": True}, format="json").status_code, 400)


    def test_negative_results_explain_pan_mismatch_without_verifying(self):
        with patch("designers.kyc_workflow.verify_identity", return_value={"verified": False, "failure_code": "pan_name_mismatch"}):
            response = self.check({"action": "pan", "pan_number": "ABCDE1234F"})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "pan_name_mismatch")
        self.record.refresh_from_db()
        self.assertNotIn("pan", self.record.api_checks)
        self.assertEqual(self.record.api_checks["pan_failure"]["code"], "pan_name_mismatch")


    def test_missing_evidence_is_mapping_error_not_identity_rejection(self):
        with patch("designers.kyc_workflow.verify_identity", return_value={"verified": True}):
            response = self.check({"action": "pan", "pan_number": "ABCDE1234F"})
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["code"], "provider_missing_evidence")



    def test_aadhaar_actions_are_disabled(self):
        with patch("designers.kyc_workflow.verify_identity") as provider:
            for action in ("aadhaar_send", "aadhaar_verify"):
                response = self.check({"action": action})
                self.assertEqual(response.status_code, 400)
                self.assertIn("Only PAN", response.data["detail"])
            provider.assert_not_called()
        self.assertEqual(self.client.post(f"/api/designers/kyc/{self.record.pk}/aadhaar/").status_code, 404)
