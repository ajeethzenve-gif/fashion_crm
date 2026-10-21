from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from .serializers import ProductSerializer
from .test_media import image_file


class ProductImageLimitTests(TestCase):
    def test_serializer_accepts_one_through_four_images(self):
        for count in range(1, 5):
            values = {"images": [image_file(f"{i}.png") for i in range(count)],
                      "size_stocks": [{"size": "M", "online_quantity": 1, "offline_quantity": 0}]}
            ProductSerializer().validate(values)

    def test_zero_and_five_images_are_rejected(self):
        for count in [0, 5]:
            images = [image_file(f"{i}.png") for i in range(count)]
            with self.assertRaises(ValidationError) as raised:
                ProductSerializer().validate({"images": images})
            self.assertIn("images", raised.exception.detail)
            response = APIClient().post("/api/products/", {"images": images}, format="multipart")
            self.assertEqual(response.status_code, 400)
            self.assertIn("images", response.data)
