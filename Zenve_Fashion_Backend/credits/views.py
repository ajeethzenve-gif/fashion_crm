from django.shortcuts import render
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import OfflineFashionCredit
from rest_framework.response import Response
from .serializers import offlinecreditsSerializer


# Create your views here.

class OfflineFashionListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, format=None):

        offline_fashion_list = OfflineFashionCredit.objects.filter(isActive=True).order_by('-id')
        serializer = offlinecreditsSerializer(offline_fashion_list, many=True)

        return Response({
            "offline_fashion_list":
                serializer.data
            },
            status=status.HTTP_200_OK

            )


