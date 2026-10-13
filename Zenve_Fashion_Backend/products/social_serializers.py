from rest_framework import serializers
from designers.models import Designer
from .serializers import ProductSerializer


class SocialMediaDesignerSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(source="phone", read_only=True)

    class Meta:
        model = Designer
        fields = ("id", "designer_code", "designer_name", "brand_name",
                  "owner_name", "email", "phone", "phone_number")
        read_only_fields = fields


class SocialMediaProductSerializer(ProductSerializer):
    designer = SocialMediaDesignerSerializer(read_only=True)
