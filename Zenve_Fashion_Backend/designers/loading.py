from collections import defaultdict
from django.db.models import Q
from orders.models import OrderItem


def designer_list_context(designers, request):
    """Fetch matching orders once, preserving the serializer's matching rules."""
    by_product = defaultdict(set)
    by_sku = defaultdict(set)
    by_brand = defaultdict(set)
    grouped = {designer.pk: [] for designer in designers}
    for designer in designers:
        by_brand[designer.brand_name].add(designer.pk)
        for product in designer.products.all():
            by_product[str(product.pk)].add(designer.pk)
            if product.sku:
                by_sku[product.sku].add(designer.pk)
    if designers:
        items = OrderItem.objects.filter(
            Q(product_id__in=list(by_product)) |
            Q(product_data__sku__in=list(by_sku)) |
            Q(product_data__brand_name__in=list(by_brand))
        ).select_related("order")
        for item in items:
            data = item.product_data if isinstance(item.product_data, dict) else {}
            matched = (by_product.get(str(item.product_id), set()) |
                by_sku.get(data.get("sku"), set()) |
                by_brand.get(data.get("brand_name"), set()))
            for pk in matched:
                grouped[pk].append(item)
    return {"request": request, "designer_order_items": grouped}
