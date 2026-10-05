from django.contrib import admin
from .models import Designer


@admin.register(Designer)
class DesignerAdmin(admin.ModelAdmin):
    list_display = (
        "designer_name",
        "brand_name",
        "designer_code",
        "email",
        "phone",
        "city",
        "stage",
        "kyc_status",
    )

    search_fields = (
        "designer_name",
        "brand_name",
        "designer_code",
        "email",
        "phone",
    )

    list_filter = (
        "stage",
        "tier",
        "kyc_status",
        "country",
    )