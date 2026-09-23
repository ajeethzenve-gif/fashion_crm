from django.urls import path

from .views import (
    ProductListCreateAPIView,
    ProductDetailAPIView,
    ProductStockAdjustmentAPIView,
)


urlpatterns = [
    # GET  /api/products/
    # POST /api/products/
    path(
        "",
        ProductListCreateAPIView.as_view(),
        name="product-list-create",
    ),

    # GET    /api/products/<id>/
    # PUT    /api/products/<id>/
    # PATCH  /api/products/<id>/
    # DELETE /api/products/<id>/
    path(
        "<int:pk>/",
        ProductDetailAPIView.as_view(),
        name="product-detail",
    ),

    # POST /api/products/<id>/adjust_stock/
    path(
        "<int:pk>/adjust_stock/",
        ProductStockAdjustmentAPIView.as_view(),
        name="product-adjust-stock",
    ),
]