from rest_framework import serializers

from .models import OfflineFashionCredit, OnlineFashionCredit


class OfflineFashionCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfflineFashionCredit
        fields = "__all__"


# Backwards compatibility alias
offlinecreditsSerializer = OfflineFashionCreditSerializer


class OnlineFashionCreditSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlineFashionCredit
        fields = "__all__"
