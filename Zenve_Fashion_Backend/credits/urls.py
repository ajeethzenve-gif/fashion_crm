
from django.urls import path
from .views import (
    OfflineFashionListAPI,
    DesignerCreditsAPIView,
    BuyOfflineCreditPackAPIView,
    RequestOfflineCreditPackAPIView,
)

urlpatterns = [
    path('', OfflineFashionListAPI.as_view(), name='offline_fashion_list'),
    path('designer/<int:designer_id>/', DesignerCreditsAPIView.as_view(), name='designer_credits'),
    path('buy-offline-pack/', BuyOfflineCreditPackAPIView.as_view(), name='buy_offline_pack'),
    path('request-offline-pack/', RequestOfflineCreditPackAPIView.as_view(), name='request_offline_pack'),
]

