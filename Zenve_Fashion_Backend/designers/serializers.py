from rest_framework import serializers
from .models import Designer


class DesignerSerializer(serializers.ModelSerializer):
    is_kyc_verified = serializers.ReadOnlyField()
    is_live = serializers.ReadOnlyField()
    contract_is_active = serializers.ReadOnlyField()
    designer_ltv = serializers.ReadOnlyField()
    designer_cac = serializers.ReadOnlyField()
    ltv_cac_ratio = serializers.ReadOnlyField()
    effective_sku_productivity = serializers.ReadOnlyField()
    overdue_tasks_count = serializers.ReadOnlyField()

    class Meta:
        model = Designer
        fields = [
            "id",
            "designer_code",
            "designer_name",
            "brand_name",
            "owner_name",
            "email",
            "phone",
            "city",
            "state",
            "country",
            "primary_category",
            "tier",
            "take_rate",
            "gst_number",
            "kyc_status",
            "kyc_verified_at",
            "contract_start_date",
            "contract_end_date",
            "contract_signed",
            "stage",
            "is_active",
            "lead_source",
            "sales_owner",
            "next_followup_date",
            "acquisition_cost",
            "renewal_likelihood",
            "lost_reason",
            "health_score",
            "follow_up_tasks",
            "monthly_gmv",
            "lifetime_gmv",
            "logo",
            "profile_image",
            "description",
            "website",
            "instagram_url",
            "facebook_url",
            "created_at",
            "updated_at",
            "is_kyc_verified",
            "is_live",
            "contract_is_active",
            "designer_ltv",
            "designer_cac",
            "ltv_cac_ratio",
            "sku_productivity",
            "effective_sku_productivity",
            "overdue_tasks_count",
        ]