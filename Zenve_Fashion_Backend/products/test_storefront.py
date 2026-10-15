from django.test import TestCase
from rest_framework.test import APIClient
from designers.models import Designer
from .models import Product, MediaJob, MediaAsset, ProductImage


class StorefrontMediaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.designer = Designer.objects.create(designer_code="SF-MEDIA", designer_name="Designer", brand_name="Brand")

    def product(self, sku, status="APPROVED"):
        return Product.objects.create(designer=self.designer, sku=sku, product_name=sku, status=status, mrp=100, selling_price=80)

    def test_only_qa_approved_products_with_generated_assets_are_listed(self):
        originals_only = self.product("ORIGINALS")
        ProductImage.objects.create(product=originals_only, position=1, image="original.png")
        self.product("NO-IMAGE")
        empty = self.product("EMPTY-ASSET")
        MediaAsset.objects.create(job=MediaJob.objects.create(product=empty), image="")
        pending = self.product("PENDING", "PENDING_QA")
        MediaAsset.objects.create(job=MediaJob.objects.create(product=pending), image="pending.png")
        ready = self.product("READY")
        job = MediaJob.objects.create(product=ready)
        MediaAsset.objects.create(job=job, image="generated.png")
        MediaAsset.objects.create(job=job, image="generated-2.png")
        response = self.client.get("/api/products/?storefront=true")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([p["id"] for p in response.data], [ready.pk])
        self.assertEqual(len(response.data[0]["media_assets"]), 2)
        self.assertEqual(len(self.client.get("/api/products/").data), 5)
