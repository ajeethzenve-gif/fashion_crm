import re
import secrets
from datetime import date
from django.core import signing
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from .kyc import KYCStaffAccess
from .authentication import LOGIN_STAGES
from .models import DesignerKYC

SALT = "designer-kyc-request"

class KYCRequestAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    @transaction.atomic
    def post(self, request, pk):
        record = get_object_or_404(DesignerKYC.objects.select_for_update().select_related("designer"), pk=pk)
        if record.designer.kyc_status == "VERIFIED":
            return Response({"detail": "This designer is already verified."}, status=400)
        nonce = secrets.token_urlsafe(24)
        record.api_checks = {**record.api_checks, "details_request": {
            "nonce": nonce, "requested_at": timezone.now().isoformat(), "requested_by": request.user.pk}}
        record.save(update_fields=["api_checks", "updated_at"])
        token = signing.dumps({"id": record.pk, "nonce": nonce}, salt=SALT)
        return Response({"token": token, "phone": record.designer.phone})

class KYCDetailsThrottle(AnonRateThrottle):
    rate = "30/hour"

class KYCRequestedDetailsAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [KYCDetailsThrottle]

    def request_record(self, request):
        try:
            payload = signing.loads(str(request.data.get("token", "")), salt=SALT, max_age=172800)
        except signing.BadSignature:
            return None, Response({"detail": "This request link is invalid or expired. Contact the verification team."}, status=400)
        record = get_object_or_404(DesignerKYC.objects.select_for_update().select_related("designer"), pk=payload.get("id"))
        invitation = record.api_checks.get("details_request", {})
        if invitation.get("nonce") != payload.get("nonce") or invitation.get("submitted_at") or record.designer.kyc_status == "VERIFIED":
            return None, Response({"detail": "This request is closed. Contact the verification team."}, status=400)
        return record, None

    @transaction.atomic
    def post(self, request):
        record, error = self.request_record(request)
        if error is not None:
            return error
        invitation = record.api_checks.get("details_request", {})
        name = str(request.data.get("name", "")).strip()
        pan = str(request.data.get("pan", "")).strip().upper()
        try:
            dob = date.fromisoformat(str(request.data.get("dob", "")))
        except ValueError:
            dob = None
        if not (2 <= len(name) <= 255 and re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", pan) and dob and dob < timezone.localdate() and request.data.get("consent") is True):
            return Response({"detail": "Enter your PAN name, valid PAN, date of birth, and confirm consent."}, status=400)
        # Self-reported information is separate from provider verification evidence.
        record.api_checks = {**{key: value for key, value in record.api_checks.items() if key not in ("pan", "aadhaar", "_aadhaar_otp_session")}, "details_request": {**invitation, "submitted_at": timezone.now().isoformat()},
            "designer_details": {"name": name, "pan": pan, "date_of_birth": dob.isoformat()}}
        record.save(update_fields=["api_checks", "updated_at"])
        record.pan_status = "PENDING"
        record.save(update_fields=["pan_status", "updated_at"])
        return Response({"detail": "Details sent securely to the verification team. KYC approval is pending."})


class KYCOwnDetailsAPIView(KYCRequestedDetailsAPIView):
    permission_classes = [IsAuthenticated]
    # Use the normal JWT authentication configured by REST_FRAMEWORK.
    from rest_framework.settings import api_settings
    authentication_classes = api_settings.DEFAULT_AUTHENTICATION_CLASSES
    throttle_classes = []

    def request_record(self, request):
        record = get_object_or_404(DesignerKYC.objects.select_for_update().select_related("designer"),
            designer__user=request.user, designer__is_active=True,
            designer__stage__in=LOGIN_STAGES, designer__user__user_role__role__name="Designer")
        invitation = record.api_checks.get("details_request", {})
        if not invitation.get("requested_at") or invitation.get("submitted_at") or record.designer.kyc_status == "VERIFIED":
            return None, Response({"detail": "There is no open KYC details request."}, status=400)
        return record, None
