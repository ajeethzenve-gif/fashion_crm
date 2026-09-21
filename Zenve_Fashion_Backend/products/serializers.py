from decimal import Decimal
from django.db import transaction
from rest_framework import serializers

from .models import Product, ProductImage
from designers.models import Designer


class FlexibleDesignerField(serializers.PrimaryKeyRelatedField):
    """
    Accepts either a Designer ID (integer or string digit)
    or a designer brand_name / designer_name / designer_code.
    """

    def to_internal_value(self, data):
        if isinstance(data, int) or (
            isinstance(data, str) and data.isdigit()
        ):
            return super().to_internal_value(int(data))

        if isinstance(data, str) and data.strip():
            designer = (
                Designer.objects.filter(
                    brand_name__iexact=data.strip()
                ).first()
                or Designer.objects.filter(
                    designer_name__iexact=data.strip()
                ).first()
                or Designer.objects.filter(
                    designer_code__iexact=data.strip()
                ).first()
            )

            if designer:
                return designer

            raise serializers.ValidationError(
                f"Designer '{data}' not found."
            )

        return super().to_internal_value(data)


class FlexibleLocationField(serializers.CharField):
    def to_internal_value(self, data):
        mapping = {
            "mumbai fc": Product.FulfilmentLocation.MUMBAI_FC,
            "mumbai_fc": Product.FulfilmentLocation.MUMBAI_FC,
            "bangalore fc": Product.FulfilmentLocation.BANGALORE_FC,
            "bangalore_fc": Product.FulfilmentLocation.BANGALORE_FC,
            "delhi fc": Product.FulfilmentLocation.DELHI_FC,
            "delhi_fc": Product.FulfilmentLocation.DELHI_FC,
            "designer studio": Product.FulfilmentLocation.DESIGNER_STUDIO,
            "designer_studio": Product.FulfilmentLocation.DESIGNER_STUDIO,
        }

        clean_key = str(data).strip().lower()

        if clean_key in mapping:
            return mapping[clean_key]

        return super().to_internal_value(data)


class FlexibleSizeField(serializers.CharField):
    def to_internal_value(self, data):
        mapping = {
            "xs": Product.Size.XS,
            "s": Product.Size.S,
            "m": Product.Size.M,
            "l": Product.Size.L,
            "xl": Product.Size.XL,
            "xxl": Product.Size.XXL,
            "free": Product.Size.FREE,
            "free size": Product.Size.FREE,
        }

        clean_key = str(data).strip().lower()

        if clean_key in mapping:
            return mapping[clean_key]

        return super().to_internal_value(data)


class FlexibleReturnPolicyField(serializers.CharField):
    def to_internal_value(self, data):
        if data is True or str(data).strip().lower() in [
            "true",
            "returnable",
            "yes",
        ]:
            return Product.ReturnPolicy.RETURNABLE

        if data is False or str(data).strip().lower() in [
            "false",
            "final_sale",
            "final sale",
            "no",
        ]:
            return Product.ReturnPolicy.FINAL_SALE

        return super().to_internal_value(data)


class ProductSerializer(serializers.ModelSerializer):
    designer = FlexibleDesignerField(queryset=Designer.objects.all())

    designer_name = serializers.ReadOnlyField(
        source="designer.designer_name"
    )
    designer_brand = serializers.ReadOnlyField(
        source="designer.brand_name"
    )
    designer_code = serializers.ReadOnlyField(
        source="designer.designer_code"
    )

    fulfilment_location = FlexibleLocationField(
        required=False,
        default=Product.FulfilmentLocation.MUMBAI_FC,
    )

    size = FlexibleSizeField(
        required=False,
        default=Product.Size.FREE,
    )

    return_policy = FlexibleReturnPolicyField(
        required=False,
        default=Product.ReturnPolicy.RETURNABLE,
    )

    discount_amount = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    is_fast_delivery = serializers.ReadOnlyField()
    available_quantity = serializers.ReadOnlyField()
    physical_quantity = serializers.ReadOnlyField()
    units_sold = serializers.ReadOnlyField()
    days_of_stock = serializers.ReadOnlyField()
    qa_status = serializers.ReadOnlyField()

    # Added: React submits four files using FormData key: images
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    # Added: never expose the private image path or image.url
    product_images = serializers.SerializerMethodField()

    def get_product_images(self, product):
        return [
            {
                "id": image.id,
                "position": image.position,
            }
            for image in product.product_images.all()
        ]

    def to_internal_value(self, data):
        data_copy = data.copy() if hasattr(data, "copy") else dict(data)

        if "name" in data_copy and "product_name" not in data_copy:
            data_copy["product_name"] = data_copy["name"]

        if "price" in data_copy and "selling_price" not in data_copy:
            data_copy["selling_price"] = data_copy["price"]

        if "fabric" in data_copy and "material" not in data_copy:
            data_copy["material"] = data_copy["fabric"]

        if "petSafety" in data_copy and "pet_safety" not in data_copy:
            data_copy["pet_safety"] = data_copy["petSafety"]

        if "location" in data_copy and "fulfilment_location" not in data_copy:
            data_copy["fulfilment_location"] = data_copy["location"]

        if "fastDelivery" in data_copy and "fast_delivery" not in data_copy:
            data_copy["fast_delivery"] = data_copy["fastDelivery"]

        if "returnable" in data_copy and "return_policy" not in data_copy:
            data_copy["return_policy"] = (
                "RETURNABLE"
                if data_copy["returnable"]
                else "FINAL_SALE"
            )

        if "designerId" in data_copy and "designer" not in data_copy:
            data_copy["designer"] = data_copy["designerId"]

        if "gstRate" in data_copy and "gst_rate" not in data_copy:
            data_copy["gst_rate"] = data_copy["gstRate"]

        if "weightG" in data_copy and "weight_g" not in data_copy:
            data_copy["weight_g"] = data_copy["weightG"]

        if "altText" in data_copy and "alt_text" not in data_copy:
            data_copy["alt_text"] = data_copy["altText"]

        if "seoTitle" in data_copy and "seo_title" not in data_copy:
            data_copy["seo_title"] = data_copy["seoTitle"]

        if "seoDescription" in data_copy and "seo_description" not in data_copy:
            data_copy["seo_description"] = data_copy["seoDescription"]

        if "newArrival" in data_copy and "new_arrival" not in data_copy:
            data_copy["new_arrival"] = data_copy["newArrival"]

        if "limitedEdition" in data_copy and "limited_edition" not in data_copy:
            data_copy["limited_edition"] = data_copy["limitedEdition"]

        if "qaScores" in data_copy and "qa_scores" not in data_copy:
            data_copy["qa_scores"] = data_copy["qaScores"]

        if "qaNote" in data_copy and "qa_note" not in data_copy:
            data_copy["qa_note"] = data_copy["qaNote"]

        return super().to_internal_value(data_copy)

    def to_representation(self, instance):
        res = super().to_representation(instance)

        res["gstRate"] = float(instance.gst_rate) if instance.gst_rate else 12.0
        res["weightG"] = instance.weight_g
        res["altText"] = instance.alt_text
        res["seoTitle"] = instance.seo_title
        res["seoDescription"] = instance.seo_description
        res["newArrival"] = instance.new_arrival
        res["limitedEdition"] = instance.limited_edition
        res["petSafety"] = instance.pet_safety
        res["fabric"] = instance.material
        res["location"] = instance.fulfilment_location
        res["fastDelivery"] = instance.fast_delivery
        res["returnable"] = (
            instance.return_policy == Product.ReturnPolicy.RETURNABLE
        )
        res["live"] = instance.is_live or instance.status == "LIVE"
        res["qaStatus"] = instance.status
        res["qaScore"] = instance.qa_score
        res["qaScores"] = instance.qa_scores or {}
        res["qaNote"] = instance.qa_note or ""
        res["name"] = instance.product_name
        res["price"] = (
            float(instance.selling_price)
            if instance.selling_price
            else 0.0
        )

        return res

    class Meta:
        model = Product

        fields = [
            "id",
            "product_name",
            "sku",
            "description",
            "designer",
            "designer_name",
            "designer_brand",
            "designer_code",
            "category",
            "subcategory",
            "colour",
            "size",
            "material",
            "pet_safety",
            "barcode",
            "hsn",
            "gst_rate",
            "weight_g",
            "dimensions",
            "origin",
            "manufacturer",
            "care",
            "image",
            "video",
            "alt_text",
            "seo_title",
            "seo_description",
            "keywords",
            "collection",
            "occasion",
            "season",
            "bestseller",
            "new_arrival",
            "featured",
            "limited_edition",
            "mrp",
            "selling_price",
            "discount_percentage",
            "inventory_quantity",
            "reserved_quantity",
            "damaged_quantity",
            "quarantined_quantity",
            "in_transit_quantity",
            "returned_quantity",
            "available_quantity",
            "physical_quantity",
            "units_sold",
            "days_of_stock",
            "qa_status",
            "low_stock_threshold",
            "fulfilment_location",
            "fast_delivery",
            "return_policy",
            "status",
            "qa_score",
            "qa_scores",
            "qa_note",
            "is_active",
            "is_live",
            "primary_image",
            "created_at",
            "updated_at",
            "discount_amount",
            "stock_status",
            "is_fast_delivery",

            # Added fields
            "images",
            "product_images",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "designer_name",
            "designer_brand",
            "designer_code",
            "available_quantity",
            "physical_quantity",
            "units_sold",
            "days_of_stock",
            "qa_status",
            "product_images",
        ]

    def validate(self, attrs):
        mrp = attrs.get(
            "mrp",
            getattr(self.instance, "mrp", Decimal("0")),
        )

        selling_price = attrs.get(
            "selling_price",
            getattr(self.instance, "selling_price", Decimal("0")),
        )

        if selling_price > mrp:
            raise serializers.ValidationError({
                "selling_price": "Selling price cannot be greater than MRP."
            })

        if mrp > Decimal("0"):
            calc_disc = (
                (Decimal(str(mrp)) - Decimal(str(selling_price)))
                / Decimal(str(mrp))
            ) * Decimal("100")

            attrs["discount_percentage"] = round(calc_disc, 2)
        else:
            attrs["discount_percentage"] = Decimal("0")

        # Added: enforce exactly four images for a new product only.
        if self.instance is None:
            images = attrs.get("images", [])

            if len(images) != 4:
                raise serializers.ValidationError({
                    "images": "Exactly four product images are required."
                })

            for image in images:
                if image.size > 5 * 1024 * 1024:
                    raise serializers.ValidationError({
                        "images": "Each image must be 5 MB or smaller."
                    })

        return attrs

    # Added: saves the four uploaded files in ProductImage.
    @transaction.atomic
    def create(self, validated_data):
        images = validated_data.pop("images", [])

        product = super().create(validated_data)

        for position, image in enumerate(images, start=1):
            ProductImage.objects.create(
                product=product,
                position=position,
                image=image,
            )

        return product