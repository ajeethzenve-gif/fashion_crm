from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from .models import Designer
from .serializers import DesignerSerializer
from .loading import designer_list_context


class DesignerLoadingTests(TestCase):
    def add_designer(self, number):
        return Designer.objects.create(designer_code=f"PERF-{number}",
            designer_name=f"Designer {number}", brand_name=f"Brand {number}")

    def test_list_query_count_does_not_grow_per_designer(self):
        self.add_designer(1)
        client = APIClient()
        with CaptureQueriesContext(connection) as first:
            response = client.get("/api/designers/")
        self.assertEqual(response.status_code, 200)
        for number in range(2, 12):
            self.add_designer(number)
        with CaptureQueriesContext(connection) as larger:
            response = client.get("/api/designers/")
        self.assertEqual(len(response.data), 11)
        self.assertEqual(len(first), len(larger))
        self.assertLessEqual(len(larger), 4)

    def test_batch_representation_preserves_metrics(self):
        from products.models import Product
        from orders.models import Order, OrderItem
        designer = self.add_designer(1)
        product = Product.objects.create(designer=designer, sku="PERF-SKU", product_name="Product",
            mrp=100, selling_price=80, status="LIVE")
        order = Order.objects.create(order_status="Delivered")
        OrderItem.objects.create(order=order, product_id=str(product.pk), price=80,
            quantity=2, product_data={"sku": product.sku, "brand_name": designer.brand_name})
        cancelled = Order.objects.create(order_status="Cancelled")
        OrderItem.objects.create(order=cancelled, product_id=str(product.pk), price=100)
        expected = DesignerSerializer(designer).data
        designers = list(Designer.objects.select_related("account_details").prefetch_related("products"))
        actual = DesignerSerializer(designers[0], context=designer_list_context(designers, None)).data
        self.assertEqual(actual, expected)
        self.assertEqual(float(actual["lifetime_gmv"]), 160)
