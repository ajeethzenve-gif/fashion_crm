from decimal import Decimal
from datetime import timedelta

from django.db import models
from django.utils import timezone
from rest_framework import serializers

from .models import Designer, DesignerAccountDetails


# =========================================================
# DESIGNER ACCOUNT DETAILS SERIALIZER
# =========================================================

class DesignerAccountDetailsSerializer(serializers.ModelSerializer):
    designer_id = serializers.IntegerField(
        source="designer.id",
        read_only=True,
    )

    designer_name = serializers.CharField(
        source="designer.designer_name",
        read_only=True,
    )

    brand_name = serializers.CharField(
        source="designer.brand_name",
        read_only=True,
    )

    class Meta:
        model = DesignerAccountDetails

        fields = [
            "id",
            "designer_id",
            "designer_name",
            "brand_name",
            "account_holder_name",
            "account_number",
            "ifsc_code",
            "pan_number",
            "is_verified",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "designer_id",
            "designer_name",
            "brand_name",
            "is_verified",
            "created_at",
            "updated_at",
        ]

    def validate_account_holder_name(self, value):
        return value.strip()

    def validate_account_number(self, value):
        return value.strip()

    def validate_ifsc_code(self, value):
        return value.strip().upper()

    def validate_pan_number(self, value):
        return value.strip().upper()


# =========================================================
# DESIGNER SERIALIZER
# =========================================================

class DesignerSerializer(serializers.ModelSerializer):

    is_kyc_verified = serializers.ReadOnlyField()
    is_live = serializers.ReadOnlyField()
    contract_is_active = serializers.ReadOnlyField()

    designer_ltv = serializers.ReadOnlyField()
    designer_cac = serializers.ReadOnlyField()
    ltv_cac_ratio = serializers.ReadOnlyField()

    effective_sku_productivity = serializers.ReadOnlyField()
    overdue_tasks_count = serializers.ReadOnlyField()

    account_details = DesignerAccountDetailsSerializer(
        read_only=True
    )

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
            "sku_productivity",

            "logo",
            "profile_image",

            "description",
            "website",

            "instagram_url",
            "facebook_url",

            "account_details",

            "created_at",
            "updated_at",

            "is_kyc_verified",
            "is_live",
            "contract_is_active",

            "designer_ltv",
            "designer_cac",
            "ltv_cac_ratio",

            "effective_sku_productivity",
            "overdue_tasks_count",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",

            "is_kyc_verified",
            "is_live",
            "contract_is_active",

            "designer_ltv",
            "designer_cac",
            "ltv_cac_ratio",

            "effective_sku_productivity",
            "overdue_tasks_count",
        ]

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        try:
            from products.models import Product
            from orders.models import OrderItem

            thirty_days_ago = (
                timezone.now() - timedelta(days=30)
            )

            products = list(
                Product.objects.filter(
                    designer=instance
                )
            )

            product_ids = [
                str(product.id)
                for product in products
            ]

            product_skus = [
                product.sku
                for product in products
                if product.sku
            ]

            items = OrderItem.objects.filter(
                models.Q(
                    product_id__in=product_ids
                )
                |
                models.Q(
                    product_data__sku__in=product_skus
                )
                |
                models.Q(
                    product_data__brand_name=
                    instance.brand_name
                )
            ).select_related("order")

            lifetime_gmv = Decimal("0.00")
            monthly_gmv = Decimal("0.00")

            for order_item in items:

                if not order_item.order:
                    continue

                order_status = str(
                    order_item.order.order_status
                ).upper()

                if order_status == "CANCELLED":
                    continue

                item_total = (
                    order_item.total
                    or Decimal("0.00")
                )

                lifetime_gmv += item_total

                if (
                    order_item.order.created_at
                    and
                    order_item.order.created_at
                    >= thirty_days_ago
                ):
                    monthly_gmv += item_total

            live_skus = sum(
                1
                for product in products
                if product.status in [
                    "LIVE",
                    "APPROVED",
                ]
            )

            if live_skus > 0:
                sku_productivity = round(
                    lifetime_gmv
                    / Decimal(live_skus),
                    2,
                )
            else:
                sku_productivity = Decimal(
                    "0.00"
                )

            total_products = len(products)

            qa_approved = sum(
                1
                for product in products
                if product.status in [
                    "LIVE",
                    "APPROVED",
                ]
            )

            qa_rate = (
                qa_approved
                / total_products
                * 100
                if total_products > 0
                else 0
            )

            in_stock = sum(
                1
                for product in products
                if getattr(
                    product,
                    "available_quantity",
                    0,
                ) > 0
            )

            stock_rate = (
                in_stock
                / total_products
                * 100
                if total_products > 0
                else 0
            )

            is_kyc = instance.is_kyc_verified

            renewal_probability = (
                instance.renewal_likelihood
                or 0
            )

            if (
                total_products > 0
                or lifetime_gmv > 0
            ):
                health = max(
                    0,
                    min(
                        100,
                        round(
                            qa_rate * 0.25
                            + stock_rate * 0.20
                            + min(
                                100.0,
                                float(monthly_gmv)
                                / 500.0,
                            )
                            * 0.25
                            + (
                                100
                                if is_kyc
                                else 0
                            )
                            * 0.10
                            + renewal_probability
                            * 0.20
                        ),
                    ),
                )

            else:
                health = max(
                    0,
                    min(
                        100,
                        round(
                            (
                                100
                                if is_kyc
                                else 0
                            )
                            * 0.30
                            + renewal_probability
                            * 0.40
                            + (
                                30
                                if instance.contract_signed
                                else 0
                            )
                        ),
                    ),
                )

            take_rate = (
                instance.take_rate
                or Decimal("0.00")
            )

            ltv = round(
                lifetime_gmv
                * (
                    take_rate
                    / Decimal("100")
                ),
                2,
            )

            cac = (
                instance.acquisition_cost
                or Decimal("0.00")
            )

            ratio = (
                float(ltv / cac)
                if cac > 0 and ltv > 0
                else 0.0
            )

            ret["lifetime_gmv"] = str(
                lifetime_gmv
            )

            ret["monthly_gmv"] = str(
                monthly_gmv
            )

            ret["sku_productivity"] = str(
                sku_productivity
            )

            ret[
                "effective_sku_productivity"
            ] = float(sku_productivity)

            ret["health_score"] = health

            ret["designer_ltv"] = float(
                ltv
            )

            ret["designer_cac"] = float(
                cac
            )

            ret["ltv_cac_ratio"] = (
                f"{ratio:.2f}x"
                if ratio > 0
                else "0x"
            )

            ret["live_skus_count"] = (
                live_skus
            )

        except Exception:
            # Do not break normal designer API
            # if analytics calculation fails.
            pass

        return ret