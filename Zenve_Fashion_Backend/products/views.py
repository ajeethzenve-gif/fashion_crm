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


class ProductListCreateAPIView(APIView):
    """
    GET  /api/products/ (supports ?designer=Name, ?category=Cat, ?status=Status)
    POST /api/products/

    POST accepts:
    - normal JSON product data
    - multipart/form-data product data
    - exactly four files using the `images` key
    """

    permission_classes = [AllowAny]

    # Added: supports React FormData image upload without breaking JSON requests.
    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get(self, request):
        designer = request.query_params.get("designer")
        category = request.query_params.get("category")
        status_filter = request.query_params.get("status")

        products = Product.objects.all().order_by("-created_at")

        if designer:
            designer_val = str(designer).strip()

            if designer_val.isdigit():
                products = products.filter(
                    designer_id=int(designer_val)
                )
            else:
                products = products.filter(
                    models.Q(
                        designer__brand_name__iexact=designer_val
                    )
                    | models.Q(
                        designer__designer_name__iexact=designer_val
                    )
                    | models.Q(
                        designer__designer_code__iexact=designer_val
                    )
                )

        if category:
            products = products.filter(
                category__iexact=category.strip()
            )

        if status_filter:
            products = products.filter(
                status__iexact=status_filter.strip()
            )

        is_live = request.query_params.get("is_live")

        if is_live is not None:
            is_live_bool = str(is_live).strip().lower() in [
                "true",
                "1",
                "yes",
            ]
            products = products.filter(is_live=is_live_bool)

        serializer = ProductSerializer(products, many=True)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        # request.data includes text fields.
        # request.FILES is automatically included in `images`
        # by MultiPartParser and your ProductSerializer.
        serializer = ProductSerializer(
            data=request.data,
            context={"request": request},
        )

        if serializer.is_valid():
            product = serializer.save()

            return Response(
                ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class ProductDetailAPIView(APIView):
    """
    GET    /api/products/<id>/
    PUT    /api/products/<id>/
    PATCH  /api/products/<id>/
    DELETE /api/products/<id>/
    """

    permission_classes = [AllowAny]

    # Added: keeps normal JSON update support and FormData support.
    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get_object(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        product = self.get_object(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )

    def put(self, request, pk):
        product = self.get_object(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            context={"request": request},
        )

        if serializer.is_valid():
            product = serializer.save()

            return Response(
                ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def patch(self, request, pk):
        product = self.get_object(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            product = serializer.save()

            return Response(
                ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
                status=status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, pk):
        product = self.get_object(pk)

        if not product:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        product.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductStockAdjustmentAPIView(APIView):
    """
    POST /api/products/<id>/adjust_stock/

    Body:
    {
        "action": "receive" | "damage" | "quarantine" |
                  "release_quarantine" | "reserve" | "release_reserve",
        "quantity": int
    }
    """

    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        action = str(
            request.data.get("action", "")
        ).strip().lower()

        try:
            qty = int(request.data.get("quantity", 0))
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid quantity provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if qty <= 0:
            return Response(
                {"detail": "Quantity must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action == "receive":
            product.inventory_quantity += qty

        elif action in ["damage", "mark_damaged", "damaged"]:
            available = product.available_quantity
            qty_to_damage = min(qty, available)
            product.damaged_quantity += qty_to_damage

        elif action in ["quarantine", "quarantined"]:
            available = product.available_quantity
            qty_to_quarantine = min(qty, available)
            product.quarantined_quantity += qty_to_quarantine

        elif action in ["release_quarantine", "release"]:
            qty_to_release = min(
                qty,
                product.quarantined_quantity,
            )
            product.quarantined_quantity -= qty_to_release

        elif action == "reserve":
            available = product.available_quantity
            qty_to_reserve = min(qty, available)
            product.reserved_quantity += qty_to_reserve

        elif action in ["release_reserve", "unreserve"]:
            qty_to_release = min(
                qty,
                product.reserved_quantity,
            )
            product.reserved_quantity -= qty_to_release

        else:
            return Response(
                {"detail": f"Unsupported inventory action: {action}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.save()

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )