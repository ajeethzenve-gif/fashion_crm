from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from .models import Designer


class DesignerEditSectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(User.objects.create_user("editor", is_staff=True))
        self.designer = Designer.objects.create(
            designer_code="SECTION-TEST", designer_name="Original", owner_name="Owner",
            brand_name="Brand", email="editor@example.com", phone="9876543210",
            city="Chennai", primary_category="Fashion", stage="REVIEW",
        )
        self.url = f"/api/designers/{self.designer.pk}/"

    def test_contract_dates_are_two_calendar_years_apart(self):
        for start, end in [("2026-10-15", "2028-10-15"), ("2028-02-29", "2030-02-28")]:
            response = self.client.patch(self.url, {"contract_start_date": start}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data["contract_end_date"], end)

    def test_new_contract_defaults_to_today_plus_two_years(self):
        from django.utils import timezone
        from .serializers import DesignerSerializer
        serializer = DesignerSerializer(data={})
        values = serializer.validate({})
        start = timezone.localdate()
        self.assertEqual(values["contract_start_date"], start)
        self.assertEqual(values["contract_end_date"].year, start.year + 2)

    def test_lower_controls_persist_without_saving_upper_fields(self):
        changes = {"sales_owner": "Nisha Kapoor", "online_membership_plan": "GOLD",
                   "renewal_preference": "High", "fulfillment": "Dropship",
                   "lost_reason": "Budget Constraints", "stage": "APPROVED",
                   "kyc_status": "VERIFIED"}
        for field, value in changes.items():
            response = self.client.patch(self.url, {field: value}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.designer_name, "Original")
        for field, value in changes.items():
            self.assertEqual(getattr(self.designer, field), value)
        response = self.client.patch(self.url, {"designer_name": "Updated"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.fulfillment, "Dropship")
        self.assertEqual(self.designer.renewal_preference, "High")

    def test_add_and_remove_task_persist(self):
        response = self.client.patch(self.url, {"add_task": {
            "title": "Contact designer", "due_date": "2026-10-20",
        }}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        task = response.data["follow_up_tasks"][0]
        self.assertEqual(task["title"], "Contact designer")
        response = self.client.patch(self.url, {"remove_task_id": task["id"]}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.follow_up_tasks, [])

    def test_gst_request_is_persistent_and_does_not_assign_gstin(self):
        response = self.client.patch(self.url, {"request_company_gst": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.designer.refresh_from_db()
        timestamp = self.designer.gst_requested_at
        self.assertIsNotNone(timestamp)
        self.assertFalse(self.designer.gst_number)
        self.client.patch(self.url, {"request_company_gst": True}, format="json")
        self.designer.refresh_from_db()
        self.assertEqual(self.designer.gst_requested_at, timestamp)
