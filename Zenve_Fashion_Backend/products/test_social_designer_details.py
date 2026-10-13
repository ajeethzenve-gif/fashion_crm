from django.test import TestCase
from rest_framework.test import APIClient
from designers.models import Designer
from .models import Product
from .serializers import ProductSerializer


class SocialDesignerDetailsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.designer = Designer.objects.create(designer_code="SOCIAL-1",
            designer_name="Designer One", brand_name="Brand One",
            owner_name="Owner One", email="one@example.com", phone="9876543210")
        self.product = Product.objects.create(designer=self.designer,
            sku="SOCIAL-P1", product_name="Social Product", mrp=100,
            selling_price=80, growth_social_promotion=True)

    def assert_designer(self, data):
        self.assertEqual(data["designer"]["id"], self.designer.pk)
        self.assertEqual(data["designer"]["designer_name"], "Designer One")
        self.assertEqual(data["designer"]["brand_name"], "Brand One")
        self.assertEqual(data["designer"]["email"], "one@example.com")
        self.assertEqual(data["designer"]["phone_number"], "9876543210")

    def test_campaign_list_includes_linked_designer(self):
        other = Designer.objects.create(designer_code="SOCIAL-2", designer_name="Designer Two", email="two@example.com")
        Product.objects.create(designer=other, sku="SOCIAL-P2", product_name="Other", mrp=100,
            selling_price=80, growth_social_promotion=True)
        response = self.client.get("/api/products/social-media/")
        self.assertEqual(response.status_code, 200)
        own = next(item for item in response.data["results"] if item["id"] == self.product.pk)
        self.assert_designer(own)

    def test_campaign_update_retains_designer_details(self):
        response = self.client.patch(f"/api/products/{self.product.pk}/social-media/",
            {"social_media_notes": "Contact designer"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assert_designer(response.data)

    def test_standard_product_serializer_keeps_designer_id(self):
        self.assertEqual(ProductSerializer(self.product).data["designer"], self.designer.pk)
