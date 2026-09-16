from django.urls import path

from .views import (
    DesignerListAPIView,
    DesignerDetailAPIView,
    DesignerPortalDashboardAPIView,
)


urlpatterns = [

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
]