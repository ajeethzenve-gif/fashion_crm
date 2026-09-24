
from django.urls import path
from .views import OfflineFashionListAPI

urlpatterns = [
    path('', OfflineFashionListAPI.as_view(), name='offline_fashion_list'),
]
