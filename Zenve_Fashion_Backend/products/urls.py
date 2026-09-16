from django.urls import path
from .views import (
    ProductListCreateAPIView,
    ProductDetailAPIView,
    ProductStockAdjustmentAPIView,
)

urlpatterns = [
    path("", ProductListCreateAPIView.as_view(), name="product-list-create"),
    path("<int:pk>/", ProductDetailAPIView.as_view(), name="product-detail"),
    path("<int:pk>/adjust_stock/", ProductStockAdjustmentAPIView.as_view(), name="product-adjust-stock"),
]