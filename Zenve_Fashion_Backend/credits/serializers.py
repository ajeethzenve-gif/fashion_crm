from rest_framework import serializers

from .models import OfflineFashionCredit


class OfflineFashionCreditSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = OfflineFashionCredit
        fields = "__all__"