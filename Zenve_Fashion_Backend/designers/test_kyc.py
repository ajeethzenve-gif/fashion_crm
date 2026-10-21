import tempfile
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import Role, UserRole, RoleLayerAccess
from .models import Designer, DesignerKYC
from .kyc_storage import kyc_storage


def pdf(name):
    return SimpleUploadedFile(name, b"%PDF-1.4\nKYC document\n%%EOF", content_type="application/pdf")


class DesignerKYCTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        old = kyc_storage._location
        kyc_storage._location = self.directory.name
        for key in ["location", "base_location"]:
            kyc_storage.__dict__.pop(key, None)
        def cleanup():
            kyc_storage._location = old
            for key in ["location", "base_location"]:
                kyc_storage.__dict__.pop(key, None)
            self.directory.cleanup()
        self.addCleanup(cleanup)
        self.client = APIClient()
        self.staff = User.objects.create_user("kyc-reviewer", is_staff=True)
        self.client.force_authenticate(self.staff)
        self.designer = Designer.objects.create(designer_code="KYC-TEST", designer_name="Test", brand_name="Brand", phone="9876543210")

    def submit(self, **changes):
        body = {"designer": self.designer.pk, "holder_name": "Holder", "pan_number": "ABCDE1234F",
                "pan_document": pdf("pan.pdf"), **changes}
        return self.client.post("/api/designers/kyc/", body, format="multipart")

    def test_pan_review_is_sufficient_and_resubmit_resets_kyc(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201, response.data)
        pk = response.data["id"]
        self.assertNotIn("aadhaar_document", response.data)
        self.assertEqual(self.client.post(f"/api/designers/kyc/{pk}/review/", {"document": "aadhaar", "decision": "VERIFIED"}).status_code, 400)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")
        self.assertEqual(self.client.patch(f"/api/designers/{self.designer.pk}/", {"kyc_status": "VERIFIED"}).status_code, 400)
        self.assertEqual(self.client.post(f"/api/designers/kyc/{pk}/review/", {"document": "pan", "decision": "VERIFIED"}).status_code, 200)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "VERIFIED")
        record = DesignerKYC.objects.get(pk=pk)
        self.assertEqual(record.pan_reviewed_by, self.staff)
        self.assertIsNotNone(record.pan_reviewed_at)
        self.assertEqual(self.client.patch(f"/api/designers/kyc/{pk}/", {"holder_name": "Corrected"}).status_code, 200)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "PENDING")

    def test_invalid_identity_fields_and_documents_rejected(self):
        self.assertEqual(self.submit(pan_number="invalid").status_code, 400)
        self.assertEqual(self.submit(pan_document=SimpleUploadedFile("file.pdf", b"not a pdf")).status_code, 400)
        self.assertEqual(DesignerKYC.objects.count(), 0)

    def test_permissions_and_private_download(self):
        pk = self.submit().data["id"]
        response = self.client.get(f"/api/designers/kyc/{pk}/documents/pan/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        response.close()
        member = User.objects.create_user("member")
        self.client.force_authenticate(member)
        self.assertEqual(self.client.get("/api/designers/kyc/").status_code, 403)
        self.assertEqual(self.client.get(f"/api/designers/kyc/{pk}/documents/pan/").status_code, 403)
        role = Role.objects.get_or_create(name="Designer")[0]
        UserRole.objects.create(user=member, role=role)
        RoleLayerAccess.objects.get_or_create(role=role, layer="17")
        self.client.force_authenticate(User.objects.get(pk=member.pk))
        self.assertEqual(self.client.get("/api/designers/kyc/").status_code, 403)

    def test_rejection_requires_reason(self):
        pk = self.submit().data["id"]
        url = f"/api/designers/kyc/{pk}/review/"
        self.assertEqual(self.client.post(url, {"document": "pan", "decision": "REJECTED"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"document": "pan", "decision": "REJECTED", "notes": "Name does not match"}).status_code, 200)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.kyc_status, "REJECTED")

    def test_assigned_reviewer_gets_kyc_notification(self):
        record_id = self.submit().data["id"]
        member = User.objects.create_user("assigned-reviewer")
        role = Role.objects.get(name="KYC Reviewer")
        UserRole.objects.create(user=member, role=role)
        self.client.force_authenticate(member)
        self.assertEqual(self.client.get("/api/designers/kyc/").status_code, 200)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["path"] == "/designer-kyc" for item in response.data))
        self.assertEqual(self.client.post(f"/api/designers/kyc/{record_id}/review/", {"document": "pan", "decision": "VERIFIED"}).status_code, 200)
