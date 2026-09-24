from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import OfflineFashionCredit
from .serializers import OfflineFashionCreditSerializer


class OfflineFashionListAPI(APIView):

    permission_classes = [AllowAny]

    def get(self, request, format=None):

        offline_fashion_list = (
            OfflineFashionCredit.objects
            .filter(is_active=True)
            .order_by("id")
        )

        serializer = OfflineFashionCreditSerializer(
            offline_fashion_list,
            many=True,
        )

        return Response(
            {
                "offlinefashionlist": serializer.data
            },
            status=status.HTTP_200_OK,
        )