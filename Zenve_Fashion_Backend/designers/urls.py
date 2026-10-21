from .kyc_requests import KYCRequestAPIView, KYCRequestedDetailsAPIView, KYCOwnDetailsAPIView
from django.urls import path
from .kyc import KYCListAPIView, KYCDetailAPIView, KYCReviewAPIView, KYCDocumentAPIView
from .kyc_workflow import KYCCallStartAPIView, KYCAPICheckAPIView, KYCConfirmAPIView

from .views import (
    DesignerListAPIView,
    DesignerDetailAPIView,
    DesignerPortalDashboardAPIView,
    DesignerAccountDetailsView
)


urlpatterns = [
    path("kyc/my-details/", KYCOwnDetailsAPIView.as_view()),
    path("kyc/requested-details/", KYCRequestedDetailsAPIView.as_view()),
    path("kyc/<int:pk>/request-details/", KYCRequestAPIView.as_view()),
    path("kyc/designer/<int:designer_id>/start/", KYCCallStartAPIView.as_view()),
    path("kyc/<int:pk>/check/", KYCAPICheckAPIView.as_view()),
    path("kyc/<int:pk>/confirm/", KYCConfirmAPIView.as_view()),
    path("kyc/", KYCListAPIView.as_view()),
    path("kyc/<int:pk>/", KYCDetailAPIView.as_view()),
    path("kyc/<int:pk>/review/", KYCReviewAPIView.as_view()),
    path("kyc/<int:pk>/documents/<str:kind>/", KYCDocumentAPIView.as_view()),

    # =====================================================
    # DESIGNER LIST / CREATE
    # =====================================================

    path(
        "",
        DesignerListAPIView.as_view(),
        name="designer-list",
    ),

    # =====================================================
    # DESIGNER DETAIL / UPDATE / DELETE
    # =====================================================

    path(
        "<int:designer_id>/",
        DesignerDetailAPIView.as_view(),
        name="designer-detail",
    ),

    # =====================================================
    # DESIGNER PORTAL DASHBOARD
    # =====================================================

    path(
        "<int:designer_id>/portal-dashboard/",
        DesignerPortalDashboardAPIView.as_view(),
        name="designer-portal-dashboard",
    ),

    path(
        "<int:designer_id>/portal-dashboard/mark-read/",
        DesignerPortalDashboardAPIView.as_view(),
        name="designer-portal-dashboard-mark-read",
    ),

    path(
        "<int:designer_id>/account-details/",
        DesignerAccountDetailsView.as_view(),
        name="designer-account-details",
    ),
]
