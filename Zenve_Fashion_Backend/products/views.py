from django.db import models
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import (
    JSONParser,
    FormParser,
    MultiPartParser,
)

from .models import (
    Product,
    ProductSizeStock,
)

from .serializers import ProductSerializer


# =========================================================
# PRODUCT LIST + CREATE
# =========================================================

class ProductListCreateAPIView(APIView):

    permission_classes = [
        AllowAny
    ]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    # =====================================================
    # GET PRODUCTS
    # =====================================================

    def get(self, request):

        designer = (
            request.query_params.get(
                "designer"
            )
        )

        category = (
            request.query_params.get(
                "category"
            )
        )

        status_filter = (
            request.query_params.get(
                "status"
            )
        )

        is_live = (
            request.query_params.get(
                "is_live"
            )
        )

        sales_channel = (
            request.query_params.get(
                "sales_channel"
            )
        )

        size = (
            request.query_params.get(
                "size"
            )
        )

        products = (
            Product.objects
            .select_related(
                "designer"
            )
            .prefetch_related(
                "product_images",
                "size_stocks",
            )
            .all()
            .order_by(
                "-created_at"
            )
        )

        # -------------------------------------------------
        # DESIGNER FILTER
        # -------------------------------------------------

        if designer:

            designer_value = str(
                designer
            ).strip()

            if designer_value.isdigit():

                products = products.filter(
                    designer_id=int(
                        designer_value
                    )
                )

            else:

                products = products.filter(
                    models.Q(
                        designer__brand_name__iexact=
                        designer_value
                    )
                    |
                    models.Q(
                        designer__designer_name__iexact=
                        designer_value
                    )
                    |
                    models.Q(
                        designer__designer_code__iexact=
                        designer_value
                    )
                )

        # -------------------------------------------------
        # CATEGORY FILTER
        # -------------------------------------------------

        if category:

            products = products.filter(
                category__iexact=
                category.strip()
            )

        # -------------------------------------------------
        # STATUS FILTER
        # -------------------------------------------------

        if status_filter:

            products = products.filter(
                status__iexact=
                status_filter.strip()
            )

        # -------------------------------------------------
        # LIVE FILTER
        # -------------------------------------------------

        if is_live is not None:

            is_live_bool = (
                str(is_live)
                .strip()
                .lower()
                in [
                    "true",
                    "1",
                    "yes",
                ]
            )

            products = products.filter(
                is_live=is_live_bool
            )

        # -------------------------------------------------
        # SALES CHANNEL FILTER
        # -------------------------------------------------

        if sales_channel:

            products = products.filter(
                sales_channel__iexact=
                str(
                    sales_channel
                ).strip()
            )

        # -------------------------------------------------
        # SIZE FILTER
        # -------------------------------------------------

        if size:

            products = products.filter(
                size_stocks__size__iexact=
                str(size).strip()
            )

        products = products.distinct()

        serializer = ProductSerializer(
            products,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=
            status.HTTP_200_OK,
        )

    # =====================================================
    # CREATE PRODUCT
    # =====================================================

    def post(self, request):

        # -------------------------------------------------
        # FILES
        # -------------------------------------------------

        images = request.FILES.getlist(
            "images"
        )

        # -------------------------------------------------
        # EXACTLY FOUR IMAGES
        # -------------------------------------------------

        if len(images) != 4:

            return Response(
                {
                    "images": [
                        (
                            "Exactly 4 product "
                            "images are required."
                        )
                    ]
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # IMAGE VALIDATION
        # -------------------------------------------------

        for image in images:

            if not getattr(
                image,
                "content_type",
                "",
            ).startswith(
                "image/"
            ):

                return Response(
                    {
                        "images": [
                            (
                                "Only image files "
                                "are allowed."
                            )
                        ]
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            if (
                image.size
                >
                5 * 1024 * 1024
            ):

                return Response(
                    {
                        "images": [
                            (
                                "Each image must "
                                "be 5 MB or smaller."
                            )
                        ]
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

        # -------------------------------------------------
        # NORMALIZE MULTIPART DATA
        # -------------------------------------------------

        serializer_data = {}

        for key in request.data.keys():

            if key == "images":
                continue

            serializer_data[key] = (
                request.data.get(key)
            )

        serializer_data[
            "images"
        ] = images

        # -------------------------------------------------
        # SERIALIZER
        # -------------------------------------------------

        serializer = ProductSerializer(
            data=serializer_data,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():

            print(
                "PRODUCT VALIDATION ERRORS:",
                serializer.errors,
            )

            return Response(
                serializer.errors,
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # SAVE
        # -------------------------------------------------

        try:

            product = (
                serializer.save()
            )

        except Exception as exc:

            print(
                "PRODUCT CREATE ERROR:",
                repr(exc),
            )

            return Response(
                {
                    "detail": str(exc)
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # GROWTH ADD-ONS & CREDITS PROCESSING
        # -------------------------------------------------
        try:
            from credits.models import DesignerCreditStatement
            from credits.views import get_or_create_designer_wallet
            from django.utils import timezone

            today_str = timezone.now().strftime("%d/%m/%Y")
            designer = product.designer
            wallet = get_or_create_designer_wallet(designer)

            # 1. Catalogue listing deduction (-500 pts)
            cat_desc = f"Catalogue listing {product.sku}"
            if not DesignerCreditStatement.objects.filter(designer=designer, description=cat_desc).exists():
                DesignerCreditStatement.objects.create(
                    wallet=wallet,
                    designer=designer,
                    description=cat_desc,
                    channel="ONLINE",
                    points=-500,
                    date_str=today_str,
                )

            # 2. Exclusive video & photo shoot (-5,000 pts)
            growth_video_shoot = str(
                request.data.get("growth_video_shoot", "")
            ).strip().lower() in ["true", "1", "yes"]

            if growth_video_shoot:
                video_desc = f"Exclusive video & photo shoot — {product.sku}"
                if not DesignerCreditStatement.objects.filter(designer=designer, description=video_desc).exists():
                    DesignerCreditStatement.objects.create(
                        wallet=wallet,
                        designer=designer,
                        description=video_desc,
                        channel="ONLINE",
                        points=-5000,
                        date_str=today_str,
                    )

            # 3. Exclusive social media promotion (-5,000 pts)
            growth_social_promotion = str(
                request.data.get("growth_social_promotion", "")
            ).strip().lower() in ["true", "1", "yes"]

            if growth_social_promotion:
                social_desc = f"Exclusive social media promotion — {product.sku}"
                if not DesignerCreditStatement.objects.filter(designer=designer, description=social_desc).exists():
                    DesignerCreditStatement.objects.create(
                        wallet=wallet,
                        designer=designer,
                        description=social_desc,
                        channel="ONLINE",
                        points=-5000,
                        date_str=today_str,
                    )

            # Re-sync wallet
            get_or_create_designer_wallet(designer)

        except Exception as credit_err:
            print("CREDITS DEDUCTION ERROR ON SKU UPLOAD:", repr(credit_err))

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        product = (
            Product.objects
            .select_related(
                "designer"
            )
            .prefetch_related(
                "product_images",
                "size_stocks",
            )
            .get(
                pk=product.pk
            )
        )

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,

            status=
            status.HTTP_201_CREATED,
        )


# =========================================================
# PRODUCT DETAIL
# =========================================================

class ProductDetailAPIView(APIView):

    permission_classes = [
        AllowAny
    ]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    # =====================================================
    # GET OBJECT
    # =====================================================

    def get_object(
        self,
        pk,
    ):

        try:

            return (
                Product.objects
                .select_related(
                    "designer"
                )
                .prefetch_related(
                    "product_images",
                    "size_stocks",
                )
                .get(
                    pk=pk
                )
            )

        except Product.DoesNotExist:

            return None

    # =====================================================
    # GET
    # =====================================================

    def get(
        self,
        request,
        pk,
    ):

        product = self.get_object(
            pk
        )

        if product is None:

            return Response(
                {
                    "detail":
                        "Product not found."
                },
                status=
                status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=
            status.HTTP_200_OK,
        )

    # =====================================================
    # PUT
    # =====================================================

    def put(
        self,
        request,
        pk,
    ):

        product = self.get_object(
            pk
        )

        if product is None:

            return Response(
                {
                    "detail":
                        "Product not found."
                },
                status=
                status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        try:

            product = serializer.save()

        except Exception as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,

            status=
            status.HTTP_200_OK,
        )

    # =====================================================
    # PATCH
    # =====================================================

    def patch(
        self,
        request,
        pk,
    ):

        product = self.get_object(
            pk
        )

        if product is None:

            return Response(
                {
                    "detail":
                        "Product not found."
                },
                status=
                status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        try:

            product = serializer.save()

        except Exception as exc:

            return Response(
                {
                    "detail": str(exc)
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,

            status=
            status.HTTP_200_OK,
        )

    # =====================================================
    # DELETE
    # =====================================================

    def delete(
        self,
        request,
        pk,
    ):

        product = self.get_object(
            pk
        )

        if product is None:

            return Response(
                {
                    "detail":
                        "Product not found."
                },
                status=
                status.HTTP_404_NOT_FOUND,
            )

        product.delete()

        return Response(
            status=
            status.HTTP_204_NO_CONTENT
        )


# =========================================================
# PRODUCT STOCK ADJUSTMENT
# =========================================================

class ProductStockAdjustmentAPIView(APIView):

    permission_classes = [
        AllowAny
    ]

    # =====================================================
    # POST
    # =====================================================

    def post(
        self,
        request,
        pk,
    ):

        try:

            product = (
                Product.objects
                .select_related(
                    "designer"
                )
                .prefetch_related(
                    "product_images",
                    "size_stocks",
                )
                .get(
                    pk=pk
                )
            )

        except Product.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Product not found."
                },
                status=
                status.HTTP_404_NOT_FOUND,
            )

        action = str(
            request.data.get(
                "action",
                "",
            )
        ).strip().lower()

        size = str(
            request.data.get(
                "size",
                "",
            )
        ).strip().upper()

        channel = str(
            request.data.get(
                "channel",
                "online",
            )
        ).strip().lower()

        try:

            quantity = int(
                request.data.get(
                    "quantity",
                    0,
                )
            )

        except (
            ValueError,
            TypeError,
        ):

            return Response(
                {
                    "detail":
                        "Invalid quantity provided."
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:

            return Response(
                {
                    "detail": (
                        "Quantity must be "
                        "greater than zero."
                    )
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # SIZE-LEVEL RECEIVE
        # =================================================

        if action == "receive":

            if not size:

                return Response(
                    {
                        "detail": (
                            "Size is required "
                            "when receiving stock."
                        )
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            valid_sizes = {
                choice[0]
                for choice
                in Product.Size.choices
            }

            if size not in valid_sizes:

                return Response(
                    {
                        "detail":
                            "Invalid product size."
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            if channel not in [
                "online",
                "offline",
            ]:

                return Response(
                    {
                        "detail": (
                            "Channel must be "
                            "'online' or 'offline'."
                        )
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            # ---------------------------------------------
            # Validate product sales channel
            # ---------------------------------------------

            if (
                channel == "offline"
                and
                product.sales_channel
                ==
                Product.SalesChannel.ONLINE
            ):

                return Response(
                    {
                        "detail": (
                            "Offline stock cannot "
                            "be added to an "
                            "online-only product."
                        )
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            if (
                channel == "online"
                and
                product.sales_channel
                ==
                Product.SalesChannel.OFFLINE
            ):

                return Response(
                    {
                        "detail": (
                            "Online stock cannot "
                            "be added to an "
                            "offline-only product."
                        )
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            size_stock, _ = (
                ProductSizeStock.objects
                .get_or_create(
                    product=product,
                    size=size,
                    defaults={
                        "online_quantity": 0,
                        "offline_quantity": 0,
                    },
                )
            )

            if channel == "online":

                size_stock.online_quantity += (
                    quantity
                )

            else:

                size_stock.offline_quantity += (
                    quantity
                )

            size_stock.save()

            # ---------------------------------------------
            # Synchronize total inventory
            # ---------------------------------------------

            product.inventory_quantity = sum(
                stock.total_quantity
                for stock
                in product.size_stocks.all()
            )

            product.save(
                update_fields=[
                    "inventory_quantity"
                ]
            )

        # =================================================
        # DAMAGE
        # =================================================

        elif action in [
            "damage",
            "mark_damaged",
            "damaged",
        ]:

            available = (
                product.available_quantity
            )

            quantity_to_damage = min(
                quantity,
                available,
            )

            if quantity_to_damage <= 0:

                return Response(
                    {
                        "detail":
                            "No available stock to damage."
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            product.damaged_quantity += (
                quantity_to_damage
            )

            product.save(
                update_fields=[
                    "damaged_quantity"
                ]
            )

        # =================================================
        # QUARANTINE
        # =================================================

        elif action in [
            "quarantine",
            "quarantined",
        ]:

            available = (
                product.available_quantity
            )

            quantity_to_quarantine = min(
                quantity,
                available,
            )

            if quantity_to_quarantine <= 0:

                return Response(
                    {
                        "detail": (
                            "No available stock "
                            "to quarantine."
                        )
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            product.quarantined_quantity += (
                quantity_to_quarantine
            )

            product.save(
                update_fields=[
                    "quarantined_quantity"
                ]
            )

        # =================================================
        # RELEASE QUARANTINE
        # =================================================

        elif action in [
            "release_quarantine",
            "release",
        ]:

            quantity_to_release = min(
                quantity,
                product.quarantined_quantity,
            )

            if quantity_to_release <= 0:

                return Response(
                    {
                        "detail":
                            "No quarantined stock to release."
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            product.quarantined_quantity -= (
                quantity_to_release
            )

            product.save(
                update_fields=[
                    "quarantined_quantity"
                ]
            )

        # =================================================
        # RESERVE
        # =================================================

        elif action == "reserve":

            available = (
                product.available_quantity
            )

            quantity_to_reserve = min(
                quantity,
                available,
            )

            if quantity_to_reserve <= 0:

                return Response(
                    {
                        "detail":
                            "No available stock to reserve."
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            product.reserved_quantity += (
                quantity_to_reserve
            )

            product.save(
                update_fields=[
                    "reserved_quantity"
                ]
            )

        # =================================================
        # RELEASE RESERVE
        # =================================================

        elif action in [
            "release_reserve",
            "unreserve",
        ]:

            quantity_to_release = min(
                quantity,
                product.reserved_quantity,
            )

            if quantity_to_release <= 0:

                return Response(
                    {
                        "detail":
                            "No reserved stock to release."
                    },
                    status=
                    status.HTTP_400_BAD_REQUEST,
                )

            product.reserved_quantity -= (
                quantity_to_release
            )

            product.save(
                update_fields=[
                    "reserved_quantity"
                ]
            )

        # =================================================
        # INVALID ACTION
        # =================================================

        else:

            return Response(
                {
                    "detail": (
                        "Unsupported inventory action: "
                        f"{action}"
                    )
                },
                status=
                status.HTTP_400_BAD_REQUEST,
            )

        # =================================================
        # REFRESH
        # =================================================

        product.refresh_from_db()

        product = (
            Product.objects
            .select_related(
                "designer"
            )
            .prefetch_related(
                "product_images",
                "size_stocks",
            )
            .get(
                pk=product.pk
            )
        )

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,

            status=
            status.HTTP_200_OK,
        )


# =========================================================
# LAYER 15: SOCIAL MEDIA & GROWTH ADD-ONS API
# =========================================================

class SocialMediaListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        status_filter = request.query_params.get("status")
        type_filter = request.query_params.get("type")
        designer_filter = request.query_params.get("designer")
        search = request.query_params.get("search", "").strip()

        # All products with at least one growth add-on enabled
        qs = (
            Product.objects.filter(
                models.Q(growth_video_shoot=True) | models.Q(growth_social_promotion=True)
            )
            .select_related("designer")
            .prefetch_related("product_images", "size_stocks")
            .order_by("-updated_at")
        )

        if status_filter and status_filter.upper() != "ALL":
            qs = qs.filter(social_media_status=status_filter.upper())

        if type_filter == "video_shoot":
            qs = qs.filter(growth_video_shoot=True)
        elif type_filter == "social_promotion":
            qs = qs.filter(growth_social_promotion=True)

        if designer_filter:
            qs = qs.filter(
                models.Q(designer_id=designer_filter) |
                models.Q(designer__brand_name__icontains=designer_filter) |
                models.Q(designer__designer_name__icontains=designer_filter)
            )

        if search:
            qs = qs.filter(
                models.Q(product_name__icontains=search) |
                models.Q(sku__icontains=search) |
                models.Q(designer__brand_name__icontains=search) |
                models.Q(designer__designer_name__icontains=search)
            )

        all_growth = (
            Product.objects.filter(
                models.Q(growth_video_shoot=True) | models.Q(growth_social_promotion=True)
            )
        )

        video_count = all_growth.filter(growth_video_shoot=True).count()
        social_count = all_growth.filter(growth_social_promotion=True).count()
        total_requests = all_growth.count()
        total_credits = (video_count * 5000) + (social_count * 5000)
        scheduled = all_growth.filter(social_media_status__in=["SHOOT_SCHEDULED", "IN_PRODUCTION"]).count()
        active_live = all_growth.filter(social_media_status__in=["PROMOTION_ACTIVE", "COMPLETED"]).count()
        pending = all_growth.filter(social_media_status="PENDING_REVIEW").count()

        serializer = ProductSerializer(
            qs,
            many=True,
            context={"request": request}
        )

        return Response(
            {
                "metrics": {
                    "total_requests": total_requests,
                    "video_shoots": video_count,
                    "social_promotions": social_count,
                    "total_credits": total_credits,
                    "pending_review": pending,
                    "in_production": scheduled,
                    "live_active": active_live,
                },
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class SocialMediaDetailAPIView(APIView):
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        product = get_object_or_404(Product, pk=pk)

        social_media_status = request.data.get("social_media_status")
        social_media_shoot_date = request.data.get("social_media_shoot_date")
        social_media_campaign_url = request.data.get("social_media_campaign_url")
        social_media_notes = request.data.get("social_media_notes")

        if social_media_status is not None:
            product.social_media_status = social_media_status
        if social_media_shoot_date is not None:
            if isinstance(social_media_shoot_date, str) and "T" in social_media_shoot_date:
                social_media_shoot_date = social_media_shoot_date.split("T")[0]
            product.social_media_shoot_date = social_media_shoot_date or None
        if social_media_campaign_url is not None:
            product.social_media_campaign_url = social_media_campaign_url
        if social_media_notes is not None:
            product.social_media_notes = social_media_notes

        product.save(update_fields=[
            "social_media_status",
            "social_media_shoot_date",
            "social_media_campaign_url",
            "social_media_notes",
            "updated_at",
        ])

        serializer = ProductSerializer(product, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        """Directly approach designer for social media campaign or shoot"""
        product = get_object_or_404(Product, pk=pk)
        message = request.data.get("message", "Zenve Social Media team is reaching out regarding your Growth Add-on.")
        scheduled_date = request.data.get("shoot_date")

        if scheduled_date:
            if isinstance(scheduled_date, str) and "T" in scheduled_date:
                scheduled_date = scheduled_date.split("T")[0]
            product.social_media_shoot_date = scheduled_date
            product.social_media_status = "SHOOT_SCHEDULED"

        if message:
            existing = product.social_media_notes or ""
            product.social_media_notes = f"{existing}\n[Team Outreach]: {message}".strip()

        product.save(update_fields=[
            "social_media_shoot_date",
            "social_media_status",
            "social_media_notes",
            "updated_at"
        ])

        return Response({
            "message": f"Designer {product.designer.designer_name} ({product.designer.brand_name}) approached successfully!",
            "product": ProductSerializer(product, context={"request": request}).data
        }, status=status.HTTP_200_OK)