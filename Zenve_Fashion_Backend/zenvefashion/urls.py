from django.conf import settings
from django.conf.urls.static import static

from django.contrib import admin

from django.urls import (
    path,
    include,
)


urlpatterns = [

    path(
        "admin/",
        admin.site.urls
    ),

    path(
        "api/",
        include("accounts.urls")
    ),

    path(
        "api/designers/",
        include("designers.urls")
    ),

    path(
        "api/products/",
        include("products.urls")
    ),

    path(
        "api/orders/",
        include("orders.urls")
    ),

    path(
        "api/returns/",
        include("orders.return_urls")
    ),

    path(
        "api/settlements/",
        include("orders.settlement_urls")
    ),

    path(
        "api/accounting/",
        include("orders.accounting_urls")
    ),

    path(
        "api/analytics/",
        include("orders.analytics_urls")
    ),

    path(
        "api/command-centre/",
        include(
            "orders.command_centre_urls"
        )
    ),
    path("api/credits/",
        include("credits.urls")
    ),
]


from django.views.static import serve
from django.urls import re_path


def serve_media(request, path):
    private_file = settings.PRIVATE_MEDIA_ROOT / path
    if private_file.exists() and private_file.is_file():
        return serve(request, path, document_root=settings.PRIVATE_MEDIA_ROOT)

    frontend_media = settings.BASE_DIR.parent / "Zenve_Fashion" / "public" / "media"
    frontend_file = frontend_media / path
    if frontend_file.exists() and frontend_file.is_file():
        return serve(request, path, document_root=frontend_media)

    frontend_public = settings.BASE_DIR.parent / "Zenve_Fashion" / "public"
    public_file = frontend_public / path
    if public_file.exists() and public_file.is_file():
        return serve(request, path, document_root=frontend_public)

    media_file = settings.MEDIA_ROOT / path
    if media_file.exists() and media_file.is_file():
        return serve(request, path, document_root=settings.MEDIA_ROOT)

    return serve(request, path, document_root=settings.PRIVATE_MEDIA_ROOT)


if settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve_media),
    ]