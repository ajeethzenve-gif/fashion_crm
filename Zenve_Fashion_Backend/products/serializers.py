from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from .models import Product, ProductImage
from designers.models import Designer


# =========================================================
# DESIGNER FIELD
# =========================================================

class FlexibleDesignerField(serializers.PrimaryKeyRelatedField):
    """
    Accepts:
    - Designer ID
    - Designer ID as string
    - brand_name
    - designer_name
    - designer_code
    """

    def to_internal_value(self, data):

        # Designer ID
        if isinstance(data, int):
            return super().to_internal_value(data)

        if isinstance(data, str):

            value = data.strip()

            if value.isdigit():
                return super().to_internal_value(int(value))

            if value:

                designer = (
                    Designer.objects.filter(
                        brand_name__iexact=value
                    ).first()
                    or Designer.objects.filter(
                        designer_name__iexact=value
                    ).first()
                    or Designer.objects.filter(
                        designer_code__iexact=value
                    ).first()
                )

                if designer:
                    return designer

                raise serializers.ValidationError(
                    f"Designer '{value}' not found."
                )

        return super().to_internal_value(data)


# =========================================================
# FULFILMENT LOCATION
# =========================================================

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


# =========================================================
# SIZE
# =========================================================

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


# =========================================================
# RETURN POLICY
# =========================================================

class FlexibleReturnPolicyField(serializers.CharField):

    def to_internal_value(self, data):

        if data is True:
            return Product.ReturnPolicy.RETURNABLE

        if data is False:
            return Product.ReturnPolicy.FINAL_SALE

        value = str(data).strip().lower()

        if value in [
            "true",
            "returnable",
            "yes",
        ]:
            return Product.ReturnPolicy.RETURNABLE

        if value in [
            "false",
            "final_sale",
            "final sale",
            "no",
        ]:
            return Product.ReturnPolicy.FINAL_SALE

        return super().to_internal_value(data)


# =========================================================
# PRODUCT IMAGE SERIALIZER
# =========================================================

class ProductImageSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProductImage

        fields = [
            "id",
            "position",
        ]

        read_only_fields = [
            "id",
            "position",
        ]


# =========================================================
# PRODUCT SERIALIZER
# =========================================================

class ProductSerializer(serializers.ModelSerializer):

    designer = FlexibleDesignerField(
        queryset=Designer.objects.all()
    )

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

    # -----------------------------------------------------
    # Calculated / read-only fields
    # -----------------------------------------------------

    discount_amount = serializers.ReadOnlyField()
    stock_status = serializers.ReadOnlyField()
    is_fast_delivery = serializers.ReadOnlyField()
    available_quantity = serializers.ReadOnlyField()
    physical_quantity = serializers.ReadOnlyField()
    units_sold = serializers.ReadOnlyField()
    days_of_stock = serializers.ReadOnlyField()
    qa_status = serializers.ReadOnlyField()

    # -----------------------------------------------------
    # Uploaded images
    #
    # IMPORTANT:
    # The view explicitly passes request.FILES.getlist()
    # as a Python list to this field.
    # -----------------------------------------------------

    images = serializers.ListField(
        child=serializers.ImageField(
            allow_empty_file=False
        ),
        write_only=True,
        required=False,
    )

    # -----------------------------------------------------
    # Existing product images
    # -----------------------------------------------------

    product_images = serializers.SerializerMethodField()

    def get_product_images(self, product):

        return [
            {
                "id": image.id,
                "position": image.position,
            }
            for image in product.product_images.all()
        ]

    # =====================================================
    # INPUT NORMALIZATION
    # =====================================================

    def to_internal_value(self, data):

        # Make a normal dictionary so multipart files can
        # safely be passed as a Python list.
        if hasattr(data, "dict"):
            data_copy = data.dict()
        else:
            data_copy = dict(data)

        # -------------------------------------------------
        # Old / frontend aliases
        # -------------------------------------------------

        if (
            "name" in data_copy
            and "product_name" not in data_copy
        ):
            data_copy["product_name"] = data_copy["name"]

        if (
            "price" in data_copy
            and "selling_price" not in data_copy
        ):
            data_copy["selling_price"] = data_copy["price"]

        if (
            "fabric" in data_copy
            and "material" not in data_copy
        ):
            data_copy["material"] = data_copy["fabric"]

        if (
            "petSafety" in data_copy
            and "pet_safety" not in data_copy
        ):
            data_copy["pet_safety"] = data_copy["petSafety"]

        if (
            "location" in data_copy
            and "fulfilment_location" not in data_copy
        ):
            data_copy["fulfilment_location"] = data_copy["location"]

        if (
            "fastDelivery" in data_copy
            and "fast_delivery" not in data_copy
        ):
            data_copy["fast_delivery"] = data_copy["fastDelivery"]

        if (
            "returnable" in data_copy
            and "return_policy" not in data_copy
        ):
            value = data_copy["returnable"]

            data_copy["return_policy"] = (
                "RETURNABLE"
                if str(value).lower() in [
                    "true",
                    "1",
                    "yes",
                    "returnable",
                ]
                else "FINAL_SALE"
            )

        if (
            "designerId" in data_copy
            and "designer" not in data_copy
        ):
            data_copy["designer"] = data_copy["designerId"]

        if (
            "gstRate" in data_copy
            and "gst_rate" not in data_copy
        ):
            data_copy["gst_rate"] = data_copy["gstRate"]

        if (
            "weightG" in data_copy
            and "weight_g" not in data_copy
        ):
            data_copy["weight_g"] = data_copy["weightG"]

        if (
            "altText" in data_copy
            and "alt_text" not in data_copy
        ):
            data_copy["alt_text"] = data_copy["altText"]

        if (
            "seoTitle" in data_copy
            and "seo_title" not in data_copy
        ):
            data_copy["seo_title"] = data_copy["seoTitle"]

        if (
            "seoDescription" in data_copy
            and "seo_description" not in data_copy
        ):
            data_copy["seo_description"] = data_copy[
                "seoDescription"
            ]

        if (
            "newArrival" in data_copy
            and "new_arrival" not in data_copy
        ):
            data_copy["new_arrival"] = data_copy["newArrival"]

        if (
            "limitedEdition" in data_copy
            and "limited_edition" not in data_copy
        ):
            data_copy["limited_edition"] = data_copy[
                "limitedEdition"
            ]

        if (
            "qaScores" in data_copy
            and "qa_scores" not in data_copy
        ):
            data_copy["qa_scores"] = data_copy["qaScores"]

        if (
            "qaNote" in data_copy
            and "qa_note" not in data_copy
        ):
            data_copy["qa_note"] = data_copy["qaNote"]

        return super().to_internal_value(data_copy)

    # =====================================================
    # VALIDATION
    # =====================================================

    def validate(self, attrs):

        mrp = attrs.get(
            "mrp",
            getattr(
                self.instance,
                "mrp",
                Decimal("0"),
            ),
        )

        selling_price = attrs.get(
            "selling_price",
            getattr(
                self.instance,
                "selling_price",
                Decimal("0"),
            ),
        )

        # -------------------------------------------------
        # Price validation
        # -------------------------------------------------

        if selling_price > mrp:

            raise serializers.ValidationError({
                "selling_price": (
                    "Selling price cannot be greater than MRP."
                )
            })

        # -------------------------------------------------
        # Calculate discount automatically
        # -------------------------------------------------

        if mrp > Decimal("0"):

            calculated_discount = (
                (
                    Decimal(str(mrp))
                    - Decimal(str(selling_price))
                )
                / Decimal(str(mrp))
            ) * Decimal("100")

            attrs["discount_percentage"] = round(
                calculated_discount,
                2,
            )

        else:

            attrs["discount_percentage"] = Decimal("0")

        # -------------------------------------------------
        # New product image validation
        # -------------------------------------------------

        if self.instance is None:

            images = attrs.get("images", [])

            if len(images) != 4:

                raise serializers.ValidationError({
                    "images": (
                        "Exactly 4 product images are required."
                    )
                })

            for image in images:

                if image.size > 5 * 1024 * 1024:

                    raise serializers.ValidationError({
                        "images": (
                            "Each image must be 5 MB or smaller."
                        )
                    })

        return attrs

    # =====================================================
    # CREATE
    # =====================================================

    @transaction.atomic
    def create(self, validated_data):

        images = validated_data.pop(
            "images",
            [],
        )

        # -----------------------------------------------
        # Create product
        # -----------------------------------------------

        product = Product.objects.create(
            **validated_data
        )

        # -----------------------------------------------
        # Create exactly 4 ProductImage records
        # -----------------------------------------------

        for position, image in enumerate(
            images,
            start=1,
        ):

            ProductImage.objects.create(
                product=product,
                position=position,
                image=image,
            )

        # -----------------------------------------------
        # Set first image as primary image
        # -----------------------------------------------

        if images:

            first_image = (
                ProductImage.objects
                .filter(
                    product=product,
                    position=1,
                )
                .first()
            )

            if first_image:

                product.primary_image = first_image.image

                product.save(
                    update_fields=[
                        "primary_image",
                    ]
                )

        return product

    # =====================================================
    # UPDATE
    # =====================================================

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):

        # Remove uploaded images from normal Product update.
        # Image replacement can be handled separately.
        validated_data.pop(
            "images",
            None,
        )

        for attr, value in validated_data.items():

            setattr(
                instance,
                attr,
                value,
            )

        instance.save()

        return instance

    # =====================================================
    # REPRESENTATION
    # =====================================================

    def to_representation(self, instance):

        res = super().to_representation(instance)

        res["gstRate"] = (
            float(instance.gst_rate)
            if instance.gst_rate is not None
            else 12.0
        )

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
            instance.return_policy
            == Product.ReturnPolicy.RETURNABLE
        )

        res["live"] = (
            instance.is_live
            or instance.status == Product.ProductStatus.LIVE
        )

        res["qaStatus"] = instance.status
        res["qaScore"] = instance.qa_score

        res["qaScores"] = (
            instance.qa_scores
            if instance.qa_scores
            else {}
        )

        res["qaNote"] = (
            instance.qa_note
            if instance.qa_note
            else ""
        )

        res["name"] = instance.product_name

        res["price"] = (
            float(instance.selling_price)
            if instance.selling_price is not None
            else 0.0
        )

        return res

    # =====================================================
    # META
    # =====================================================

    class Meta:

        model = Product

        fields = [
            "id",

            # Basic
            "product_name",
            "sku",
            "description",

            # Designer
            "designer",
            "designer_name",
            "designer_brand",
            "designer_code",

            # Classification
            "category",
            "subcategory",

            # Attributes
            "colour",
            "size",
            "material",
            "pet_safety",

            # Compliance
            "barcode",
            "hsn",
            "gst_rate",
            "weight_g",
            "dimensions",
            "origin",
            "manufacturer",

            # Care
            "care",

            # Media
            "image",
            "video",
            "alt_text",

            # SEO
            "seo_title",
            "seo_description",
            "keywords",

            # Discovery
            "collection",
            "occasion",
            "season",

            # Flags
            "bestseller",
            "new_arrival",
            "featured",
            "limited_edition",

            # Pricing
            "mrp",
            "selling_price",
            "discount_percentage",

            # Inventory
            "inventory_quantity",
            "reserved_quantity",
            "damaged_quantity",
            "quarantined_quantity",
            "in_transit_quantity",
            "returned_quantity",

            # Calculated inventory
            "available_quantity",
            "physical_quantity",
            "units_sold",
            "days_of_stock",

            # QA
            "qa_status",
            "qa_score",
            "qa_scores",
            "qa_note",

            # Stock
            "low_stock_threshold",

            # Fulfilment
            "fulfilment_location",
            "fast_delivery",

            # Return
            "return_policy",

            # Status
            "status",
            "is_active",
            "is_live",

            # Images
            "primary_image",
            "images",
            "product_images",

            # Dates
            "created_at",
            "updated_at",

            # Calculated
            "discount_amount",
            "stock_status",
            "is_fast_delivery",
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

            "discount_amount",
            "stock_status",
            "is_fast_delivery",

            "product_images",
        ]