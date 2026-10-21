from unittest.mock import patch
from django.db import OperationalError
from django.test import SimpleTestCase
from rest_framework.test import APIClient


class DesignerDatabaseUnavailableTests(SimpleTestCase):
    def test_password_login_returns_safe_database_error(self):
        with patch("accounts.designer_login.Designer.objects.select_related", side_effect=OperationalError(2003, "Connection refused")):
            response = APIClient().post("/api/designer/login/", {"username": "designer@zf", "password": "example"})
        self.assertEqual(response.status_code, 503)
        self.assertIn("database connection failed", response.data["detail"])

    def test_otp_endpoints_return_safe_database_error(self):
        with patch("accounts.designer_login.find_designer", side_effect=OperationalError(1045, "Access denied")):
            for action in ["send-otp", "verify-otp"]:
                response = APIClient().post(f"/api/designer/{action}/", {"phone_number": "9876543210", "otp": "123456"})
                self.assertEqual(response.status_code, 503)
                self.assertNotIn("Access denied", response.data["detail"])
