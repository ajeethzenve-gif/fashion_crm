from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from django.utils import timezone
from designers.models import Designer
from .models import Role, UserRole, RoleLayerAccess


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user("inbox-staff")
        role = Role.objects.create(name="Inbox staff")
        UserRole.objects.create(user=self.user, role=role)
        for layer in ["01", "16"]:
            RoleLayerAccess.objects.create(role=role, layer=layer)
        self.client.force_authenticate(self.user)
        self.designer = Designer.objects.create(designer_code="INBOX", designer_name="Designer",
            brand_name="Brand", owner_name="Owner", email="inbox@example.com", phone="9876543210",
            city="Chennai", primary_category="people", gst_requested_at=timezone.now())

    def test_gst_request_and_read_status_are_scoped_to_user(self):
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, 200, response.data)
        item = response.data[0]
        self.assertEqual(item["category"], "GST")
        self.assertFalse(item["read"])
        self.assertEqual(self.client.post("/api/notifications/", {"ids": [item["id"]]}, format="json").status_code, 200)
        self.assertTrue(self.client.get("/api/notifications/").data[0]["read"])
        other = User.objects.create_user("another-staff", is_staff=True)
        self.client.force_authenticate(other)
        self.assertFalse(self.client.get("/api/notifications/").data[0]["read"])

    def test_source_access_is_required(self):
        self.user.user_role.role.layer_access.filter(layer="01").delete()
        self.assertEqual(self.client.get("/api/notifications/").data, [])
        self.assertEqual(self.client.post("/api/notifications/", {"ids": [f"gst-{self.designer.pk}"]}, format="json").status_code, 400)

    def test_designer_and_anonymous_cannot_open_staff_inbox(self):
        role = Role.objects.create(name="Designer")
        UserRole.objects.filter(user=self.user).update(role=role)
        RoleLayerAccess.objects.create(role=role, layer="16")
        self.client.force_authenticate(User.objects.get(pk=self.user.pk))
        self.assertEqual(self.client.get("/api/notifications/").status_code, 403)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get("/api/notifications/").status_code, [401, 403])
