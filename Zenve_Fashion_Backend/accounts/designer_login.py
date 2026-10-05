import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from designers.models import Designer, DesignerLoginOTP
from designers.authentication import LOGIN_STAGES, normalize_phone
from .sms import SMSConfigurationError, SMSDeliveryError


def find_designer(phone):
    matches = []
    for designer in Designer.objects.select_related("user").filter(
        is_active=True, stage__in=LOGIN_STAGES, user__is_active=True,
        user__user_role__role__name="Designer",
    ):
        try:
            if normalize_phone(designer.phone) == phone:
                matches.append(designer)
        except ValueError:
            continue
    return matches[0] if len(matches) == 1 else None


class DesignerOTPAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            phone = normalize_phone(request.data.get("phone_number"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        designer = find_designer(phone)
        if not designer:
            return Response({"detail": "No approved designer account for this mobile number."}, status=400)
        sender = getattr(settings, "DESIGNER_OTP_SMS_SENDER", "")
        if not sender:
            return Response({"detail": "SMS delivery is not configured. Contact the administrator."}, status=503)
        with transaction.atomic():
            # Lock the account to serialize resend and verification requests.
            Designer.objects.select_for_update().get(pk=designer.pk)
            if not find_designer(phone):
                return Response({"detail": "Designer account is not eligible for login."}, status=400)
            challenge, _ = DesignerLoginOTP.objects.get_or_create(designer=designer)
            now = timezone.now()
            if challenge.sent_at and now < challenge.sent_at + timedelta(seconds=30):
                return Response({"detail": "Wait 30 seconds before requesting another OTP."}, status=429)
            otp = f"{secrets.randbelow(1000000):06d}"
            try:
                import_string(sender)("+" + phone, otp)
            except SMSConfigurationError as exc:
                detail = str(exc) if settings.DEBUG else "SMS delivery configuration is incomplete. Contact the administrator."
                return Response({"detail": detail}, status=503)
            except SMSDeliveryError as exc:
                return Response({"detail": str(exc)}, status=503)
            except Exception:
                return Response({"detail": "Unable to send OTP. Please try again."}, status=503)
            challenge.phone = phone
            challenge.otp_hash = make_password(otp)
            challenge.sent_at = now
            challenge.expires_at = now + timedelta(minutes=5)
            challenge.attempts = 0
            challenge.save()
        return Response({"message": "OTP sent to your mobile number.", "retry_after": 30})


class DesignerVerifyOTPAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            phone = normalize_phone(request.data.get("phone_number"))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        otp = str(request.data.get("otp", ""))
        if len(otp) != 6 or not otp.isdigit():
            return Response({"detail": "Enter a six-digit OTP."}, status=400)
        designer = find_designer(phone)
        if not designer:
            return Response({"detail": "Designer account is not eligible for login."}, status=400)
        with transaction.atomic():
            Designer.objects.select_for_update().get(pk=designer.pk)
            if not find_designer(phone):
                return Response({"detail": "Designer account is not eligible for login."}, status=400)
            challenge = DesignerLoginOTP.objects.filter(designer=designer, phone=phone).first()
            if not challenge or not challenge.otp_hash or challenge.expires_at <= timezone.now() or challenge.attempts >= 5:
                return Response({"detail": "OTP expired or unavailable. Request a new OTP."}, status=400)
            challenge.attempts += 1
            valid = check_password(otp, challenge.otp_hash)
            if valid:
                challenge.otp_hash = ""
            challenge.save()
            if not valid:
                return Response({"detail": "Invalid OTP."}, status=400)
            refresh = RefreshToken.for_user(designer.user)
        return Response({
            "access": str(refresh.access_token), "refresh": str(refresh),
            "role": "Designer", "designer": {
                "id": designer.pk, "designer_name": designer.designer_name,
                "brand_name": designer.brand_name, "email": designer.email,
                "phone": designer.phone,
            },
        })
