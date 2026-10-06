from django.test import TestCase
from rest_framework.test import APIClient
from designers.models import Designer
from .models import Product


class DesignerProductAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.designer = Designer.objects.create(designer_code="OWN", designer_name="Own",
            owner_name="Own", stage="APPROVED", kyc_status="VERIFIED")
        self.other = Designer.objects.create(designer_code="OTHER", designer_name="Other")
        self.own_product = Product.objects.create(designer=self.designer, sku="OWN-1", product_name="Own product", mrp=100, selling_price=80)
        self.other_product = Product.objects.create(designer=self.other, sku="OTHER-1", product_name="Other product", mrp=100, selling_price=80)
        self.client.force_authenticate(user=self.designer.user)

    def test_list_is_scoped_even_with_other_designer_filter(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p["id"] for p in response.data], [self.own_product.pk])
        self.assertEqual(self.client.get(f"/api/products/?designer={self.other.pk}").data, [])

    def test_detail_and_changes_cannot_access_other_product(self):
        url = f"/api/products/{self.other_product.pk}/"
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"product_name": "Changed"}).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_cannot_reassign_own_product(self):
        url = f"/api/products/{self.own_product.pk}/"
        self.assertEqual(self.client.patch(url, {"designer": self.other.pk}).status_code, 400)
        self.own_product.refresh_from_db()
        self.assertEqual(self.own_product.designer_id, self.designer.pk)

    def test_other_roles_keep_existing_product_visibility(self):
        from django.contrib.auth.models import User
        member = User.objects.create_user("staff-member")
        self.client.force_authenticate(user=member)
        self.assertEqual(len(self.client.get("/api/products/").data), 2)

    def test_designer_role_has_only_three_layers(self):
        self.assertEqual(list(self.designer.user.user_role.role.layer_access.values_list("layer", flat=True)), ["02", "03", "06"])
