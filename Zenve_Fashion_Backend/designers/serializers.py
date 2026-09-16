from rest_framework import serializers
from .models import Designer


class DesignerSerializer(serializers.ModelSerializer):
    is_kyc_verified = serializers.ReadOnlyField()
    is_live = serializers.ReadOnlyField()
    contract_is_active = serializers.ReadOnlyField()
    designer_ltv = serializers.ReadOnlyField()
    designer_cac = serializers.ReadOnlyField()
    ltv_cac_ratio = serializers.ReadOnlyField()
    effective_sku_productivity = serializers.ReadOnlyField()
    overdue_tasks_count = serializers.ReadOnlyField()

    class Meta:
        model = Designer
        fields = [
            "id",
            "designer_code",
            "designer_name",
            "brand_name",
            "owner_name",
            "email",
            "phone",
            "city",
            "state",
            "country",
            "primary_category",
            "tier",
            "take_rate",
            "gst_number",
            "kyc_status",
            "kyc_verified_at",
            "contract_start_date",
            "contract_end_date",
            "contract_signed",
            "stage",
            "is_active",
            "lead_source",
            "sales_owner",
            "next_followup_date",
            "acquisition_cost",
            "renewal_likelihood",
            "lost_reason",
            "health_score",
            "follow_up_tasks",
            "monthly_gmv",
            "lifetime_gmv",
            "logo",
            "profile_image",
            "description",
            "website",
            "instagram_url",
            "facebook_url",
            "created_at",
            "updated_at",
            "is_kyc_verified",
            "is_live",
            "contract_is_active",
            "designer_ltv",
            "designer_cac",
            "ltv_cac_ratio",
            "sku_productivity",
            "effective_sku_productivity",
            "overdue_tasks_count",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            from decimal import Decimal
            from django.db import models
            from django.utils import timezone
            from datetime import timedelta
            from products.models import Product
            from orders.models import OrderItem

            thirty_days_ago = timezone.now() - timedelta(days=30)
            prods = list(Product.objects.filter(designer=instance))
            p_ids = [str(p.id) for p in prods]
            p_skus = [p.sku for p in prods if p.sku]

            items = OrderItem.objects.filter(
                models.Q(product_id__in=p_ids) |
                models.Q(product_data__sku__in=p_skus) |
                models.Q(product_data__brand_name=instance.brand_name)
            ).select_related("order")

            lifetime_gmv = Decimal("0.00")
            monthly_gmv = Decimal("0.00")
            for oi in items:
                if oi.order and str(oi.order.order_status).upper() not in ["CANCELLED"]:
                    item_tot = oi.total or Decimal("0.00")
                    lifetime_gmv += item_tot
                    if oi.order.created_at and oi.order.created_at >= thirty_days_ago:
                        monthly_gmv += item_tot

            live_skus = sum(1 for p in prods if p.status in ["LIVE", "APPROVED"])
            sku_prod = round(lifetime_gmv / Decimal(max(1, live_skus)), 2) if live_skus > 0 else Decimal("0.00")

            total_prods = len(prods)
            qa_approved = sum(1 for p in prods if p.status in ["LIVE", "APPROVED"])
            qa_rate = (qa_approved / total_prods * 100) if total_prods > 0 else 0
            in_stock = sum(1 for p in prods if getattr(p, "available_quantity", 0) > 0)
            stock_rate = (in_stock / total_prods * 100) if total_prods > 0 else 0
            is_kyc = instance.is_kyc_verified
            renewal_prob = instance.renewal_likelihood or 0

            if total_prods > 0 or lifetime_gmv > 0:
                health = max(0, min(100, round(
                    qa_rate * 0.25 +
                    stock_rate * 0.20 +
                    min(100.0, float(monthly_gmv) / 500.0) * 0.25 +
                    (100 if is_kyc else 0) * 0.10 +
                    renewal_prob * 0.20
                )))
            else:
                health = max(0, min(100, round(
                    (100 if is_kyc else 0) * 0.30 +
                    renewal_prob * 0.40 +
                    (30 if instance.contract_signed else 0)
                )))

            take_rate = instance.take_rate or Decimal("0.00")
            ltv = round(lifetime_gmv * (take_rate / Decimal("100")), 2)
            cac = instance.acquisition_cost or Decimal("0.00")
            ratio = float(ltv / cac) if cac > 0 and ltv > 0 else 0.0

            ret["lifetime_gmv"] = str(lifetime_gmv)
            ret["monthly_gmv"] = str(monthly_gmv)
            ret["sku_productivity"] = str(sku_prod)
            ret["effective_sku_productivity"] = float(sku_prod)
            ret["health_score"] = health
            ret["designer_ltv"] = float(ltv)
            ret["designer_cac"] = float(cac)
            ret["ltv_cac_ratio"] = f"{ratio:.2f}x" if ratio > 0 else "0x"
            ret["live_skus_count"] = live_skus
        except Exception:
            pass
        return ret