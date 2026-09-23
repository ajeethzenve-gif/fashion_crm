from django.db import models

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import (
    JSONParser,
    FormParser,
    MultiPartParser,
)

from .models import Product
from .serializers import ProductSerializer


# =========================================================
# PRODUCT LIST + CREATE
# =========================================================

class ProductListCreateAPIView(APIView):

    permission_classes = [AllowAny]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    # =====================================================
    # GET PRODUCTS
    # =====================================================

    def get(self, request):

        designer = request.query_params.get(
            "designer"
        )

        category = request.query_params.get(
            "category"
        )

        status_filter = request.query_params.get(
            "status"
        )

        is_live = request.query_params.get(
            "is_live"
        )

        products = (
            Product.objects
            .select_related("designer")
            .prefetch_related("product_images")
            .all()
            .order_by("-created_at")
        )

        # -------------------------------------------------
        # Designer filter
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
        # Category filter
        # -------------------------------------------------

        if category:

            products = products.filter(
                category__iexact=category.strip()
            )

        # -------------------------------------------------
        # Status filter
        # -------------------------------------------------

        if status_filter:

            products = products.filter(
                status__iexact=status_filter.strip()
            )

        # -------------------------------------------------
        # Live filter
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

        serializer = ProductSerializer(
            products,
            many=True,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # CREATE PRODUCT
    # =====================================================

    def post(self, request):

        print("\n================================")
        print("PRODUCT CREATE")
        print("================================")
        print(
            "CONTENT TYPE:",
            request.content_type,
        )
        print(
            "DATA:",
            request.data,
        )
        print(
            "FILES:",
            request.FILES,
        )

        # -------------------------------------------------
        # Get all uploaded images
        # -------------------------------------------------

        images = request.FILES.getlist(
            "images"
        )

        print(
            "IMAGE COUNT:",
            len(images),
        )

        # -------------------------------------------------
        # Require exactly 4 images
        # -------------------------------------------------

        if len(images) != 4:

            return Response(
                {
                    "images": [
                        (
                            "Exactly 4 product images "
                            "are required."
                        )
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Maximum file size
        # -------------------------------------------------

        for image in images:

            if image.size > 5 * 1024 * 1024:

                return Response(
                    {
                        "images": [
                            (
                                "Each image must be "
                                "5 MB or smaller."
                            )
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # -------------------------------------------------
        # Build serializer input
        #
        # IMPORTANT:
        # request.data is a QueryDict.
        # Convert it into a normal dict and explicitly
        # provide images as a Python list.
        # -------------------------------------------------

        serializer_data = {}

        for key in request.data.keys():

            if key == "images":
                continue

            serializer_data[key] = request.data.get(
                key
            )

        serializer_data["images"] = images

        print(
            "SERIALIZER DATA KEYS:",
            list(serializer_data.keys()),
        )

        print(
            "PRODUCT NAME:",
            serializer_data.get(
                "product_name"
            ),
        )

        print(
            "SKU:",
            serializer_data.get(
                "sku"
            ),
        )

        print(
            "DESIGNER:",
            serializer_data.get(
                "designer"
            ),
        )

        print(
            "CATEGORY:",
            serializer_data.get(
                "category"
            ),
        )

        print(
            "COLOUR:",
            serializer_data.get(
                "colour"
            ),
        )

        print(
            "MRP:",
            serializer_data.get(
                "mrp"
            ),
        )

        print(
            "SELLING PRICE:",
            serializer_data.get(
                "selling_price"
            ),
        )

        # -------------------------------------------------
        # Validate serializer
        # -------------------------------------------------

        serializer = ProductSerializer(
            data=serializer_data,
            context={
                "request": request,
            },
        )

        if not serializer.is_valid():

            print(
                "VALIDATION ERRORS:",
                serializer.errors,
            )

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Save
        # -------------------------------------------------

        try:

            product = serializer.save()

        except Exception as exc:

            print(
                "PRODUCT CREATE ERROR:",
                repr(exc),
            )

            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # Return created product
        # -------------------------------------------------

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,
            status=status.HTTP_201_CREATED,
        )


# =========================================================
# PRODUCT DETAIL
# =========================================================

class ProductDetailAPIView(APIView):

    permission_classes = [AllowAny]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    # =====================================================
    # GET OBJECT
    # =====================================================

    def get_object(self, pk):

        try:

            return Product.objects.get(
                pk=pk
            )

        except Product.DoesNotExist:

            return None

    # =====================================================
    # GET
    # =====================================================

    def get(self, request, pk):

        product = self.get_object(pk)

        if product is None:

            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            context={
                "request": request,
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # PUT
    # =====================================================

    def put(self, request, pk):

        product = self.get_object(pk)

        if product is None:

            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            context={
                "request": request,
            },
        )

        if serializer.is_valid():

            product = serializer.save()

            return Response(
                ProductSerializer(
                    product,
                    context={
                        "request": request,
                    },
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # PATCH
    # =====================================================

    def patch(self, request, pk):

        product = self.get_object(pk)

        if product is None:

            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={
                "request": request,
            },
        )

        if serializer.is_valid():

            product = serializer.save()

            return Response(
                ProductSerializer(
                    product,
                    context={
                        "request": request,
                    },
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # DELETE
    # =====================================================

    def delete(self, request, pk):

        product = self.get_object(pk)

        if product is None:

            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        product.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# =========================================================
# STOCK ADJUSTMENT
# =========================================================

class ProductStockAdjustmentAPIView(APIView):

    permission_classes = [AllowAny]

    def post(self, request, pk):

        try:

            product = Product.objects.get(
                pk=pk
            )

        except Product.DoesNotExist:

            return Response(
                {
                    "detail": "Product not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        action = str(
            request.data.get(
                "action",
                "",
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
                    "detail": (
                        "Invalid quantity provided."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:

            return Response(
                {
                    "detail": (
                        "Quantity must be greater "
                        "than zero."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------------------------------
        # RECEIVE
        # -------------------------------------------------

        if action == "receive":

            product.inventory_quantity += quantity

        # -------------------------------------------------
        # DAMAGE
        # -------------------------------------------------

        elif action in [
            "damage",
            "mark_damaged",
            "damaged",
        ]:

            available = product.available_quantity

            quantity_to_damage = min(
                quantity,
                available,
            )

            product.damaged_quantity += (
                quantity_to_damage
            )

        # -------------------------------------------------
        # QUARANTINE
        # -------------------------------------------------

        elif action in [
            "quarantine",
            "quarantined",
        ]:

            available = product.available_quantity

            quantity_to_quarantine = min(
                quantity,
                available,
            )

            product.quarantined_quantity += (
                quantity_to_quarantine
            )

        # -------------------------------------------------
        # RELEASE QUARANTINE
        # -------------------------------------------------

        elif action in [
            "release_quarantine",
            "release",
        ]:

            quantity_to_release = min(
                quantity,
                product.quarantined_quantity,
            )

            product.quarantined_quantity -= (
                quantity_to_release
            )

        # -------------------------------------------------
        # RESERVE
        # -------------------------------------------------

        elif action == "reserve":

            available = product.available_quantity

            quantity_to_reserve = min(
                quantity,
                available,
            )

            product.reserved_quantity += (
                quantity_to_reserve
            )

        # -------------------------------------------------
        # RELEASE RESERVE
        # -------------------------------------------------

        elif action in [
            "release_reserve",
            "unreserve",
        ]:

            quantity_to_release = min(
                quantity,
                product.reserved_quantity,
            )

            product.reserved_quantity -= (
                quantity_to_release
            )

        # -------------------------------------------------
        # INVALID ACTION
        # -------------------------------------------------

        else:

            return Response(
                {
                    "detail": (
                        "Unsupported inventory action: "
                        f"{action}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.save()

        return Response(
            ProductSerializer(
                product,
                context={
                    "request": request,
                },
            ).data,
            status=status.HTTP_200_OK,
        )