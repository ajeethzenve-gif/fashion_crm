import tempfile
from io import BytesIO
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from designers.models import Designer
from .models import Product, ProductImage, MediaAsset, MediaJob, private_storage


def image_file(name="image.png"):
    stream = BytesIO()
    Image.new("RGB", (16, 16), "red").save(stream, format="PNG")
    return SimpleUploadedFile(name, stream.getvalue(), content_type="image/png")


class MediaWorkflowTests(TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.old_location = private_storage._location
        private_storage._location = self.directory.name
        private_storage.__dict__.pop("base_location", None)
        private_storage.__dict__.pop("location", None)
        self.addCleanup(self.restore_storage)
        self.client = APIClient()
        self.designer = Designer.objects.create(designer_code="MEDIA-1", designer_name="Designer", brand_name="Brand")
        self.product = Product.objects.create(designer=self.designer, sku="MEDIA-SKU", product_name="Dress", mrp=100, selling_price=100)
        for position in range(1, 5):
            ProductImage.objects.create(product=self.product, position=position, image=image_file())
        self.url = f"/api/products/{self.product.pk}/media/"

    def restore_storage(self):
        private_storage._location = self.old_location
        private_storage.__dict__.pop("base_location", None)
        private_storage.__dict__.pop("location", None)
        self.directory.cleanup()

    def test_delivery_revision_and_approval(self):
        queue = self.client.get("/api/products/media/")
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(queue.data[0]["status"], "QUEUED")
        self.assertEqual(len(queue.data[0]["originals"]), 4)
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)
        delivery = self.client.post(self.url, {"action": "send", "images": [image_file()], "figma_url": "https://www.figma.com/design/example"}, format="multipart")
        self.assertEqual(delivery.status_code, 200, delivery.data)
        self.assertEqual(delivery.data["status"], "IN_REVIEW")
        inbox = self.client.get(f"/api/products/media/?designer={self.designer.pk}")
        self.assertEqual(len(inbox.data), 1)
        self.assertEqual(self.client.get(f"/api/products/media/?designer={self.designer.pk + 1}").data, [])
        file_response = self.client.get(f"/api/products/media-files/generated/{MediaAsset.objects.get().pk}/")
        self.assertEqual(file_response.status_code, 200)
        file_response.close()
        self.assertEqual(self.client.post(self.url, {"action": "save"}).status_code, 400)
        self.assertEqual(self.client.post(self.url, {"action": "changes"}).status_code, 400)
        response = self.client.post(self.url, {"action": "changes", "feedback": "Use a lighter background"})
        self.assertEqual(response.data["status"], "CHANGES_REQUESTED")
        self.assertEqual(self.client.post(self.url, {"action": "send", "images": [image_file("revision.png")]}, format="multipart").status_code, 200)
        self.assertEqual(MediaAsset.objects.count(), 1)
        self.assertEqual(self.client.post(self.url, {"action": "approve"}).data["status"], "APPROVED")
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)
        self.assertEqual(self.product.product_images.count(), 4)

    def test_drafts_filters_and_invalid_uploads(self):
        self.assertEqual(self.client.post(self.url, {"action": "save", "images": [image_file()]}, format="multipart").status_code, 200)
        self.assertEqual(self.client.get(f"/api/products/media/?designer={self.designer.pk}").data, [])
        self.assertEqual(self.client.get("/api/products/media/?designer=bad").status_code, 400)
        self.assertEqual(self.client.post(self.url, {"action": "save", "figma_url": "https://evil.test/file"}).status_code, 400)
        fake = SimpleUploadedFile("fake.png", b"not an image", content_type="image/png")
        self.assertEqual(self.client.post(self.url, {"action": "send", "images": [fake]}, format="multipart").status_code, 400)
        self.assertEqual(MediaJob.objects.get().status, "IN_PROGRESS")
        self.product.product_images.first().delete()
        self.assertEqual(self.client.get("/api/products/media/").data, [])
        self.assertEqual(self.client.post(self.url, {"action": "send"}).status_code, 400)
