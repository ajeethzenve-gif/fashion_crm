import re
from datetime import date
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from .models import Designer, DesignerKYC
from .kyc import KYCStaffAccess, KYCSerializer
from .kyc_provider import verify_identity, KYCProviderUnavailable


def normalized_name(value):
    return " ".join(re.findall(r"\w+", str(value).casefold(), flags=re.UNICODE))


def name_matches(record):
    pan = record.api_checks.get("pan", {})
    submitted = record.api_checks.get("designer_details", {})
    expected_name = submitted.get("name") or record.holder_name or record.designer.owner_name or record.designer.designer_name
    names_match = bool(normalized_name(expected_name)) and normalized_name(expected_name) == normalized_name(pan.get("name", ""))
    dobs = [value for value in (submitted.get("date_of_birth"), pan.get("date_of_birth"), pan.get("submitted_date_of_birth")) if value]
    number_matches = not submitted.get("pan") or submitted["pan"] == record.pan_number
    return names_match and number_matches and len(set(dobs)) <= 1



class KYCProviderThrottle(UserRateThrottle):
    scope = "kyc_provider"
    rate = "30/hour"


class KYCCallStartAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    @transaction.atomic
    def post(self, request, designer_id):
        designer = get_object_or_404(Designer.objects.select_for_update(), pk=designer_id)
        if designer.kyc_status == "VERIFIED":
            return Response({"detail": "This designer is already KYC verified."}, status=400)
        record, _ = DesignerKYC.objects.get_or_create(designer=designer, defaults={
            "holder_name": designer.owner_name or designer.designer_name, "submitted_by": request.user,
            "verification_method": "APITXT", "aadhaar_last4": "", "pan_number": "",
        })
        if record.verification_method != "APITXT":
            record.verification_method = "APITXT"
            record.api_checks = {}
            record.aadhaar_status = record.pan_status = "PENDING"
            record.save()
        invitation = record.api_checks.get("details_request", {})
        if not invitation.get("requested_at"):
            from .kyc_requests import create_kyc_invitation
            create_kyc_invitation(record, request.user)
        return Response(KYCSerializer(record).data)


class KYCAPICheckAPIView(APIView):
    permission_classes = [KYCStaffAccess]
    throttle_classes = [KYCProviderThrottle]

    @transaction.atomic
    def post(self, request, pk):
        record = get_object_or_404(DesignerKYC.objects.select_for_update().select_related("designer"), pk=pk)
        if record.verification_method != "APITXT" or record.designer.kyc_status == "VERIFIED":
            return Response({"detail": "Start an unverified designer's API verification first."}, status=400)
        if request.data.get("consent") is not True:
            return Response({"detail": "Confirm the designer's consent before checking identity details."}, status=400)
        action = request.data.get("action")
        if action != "pan":
            return Response({"detail": "Only PAN verification is enabled."}, status=400)
        payload = {}
        if action == "pan":
            pan = str(request.data.get("pan_number", "")).strip().upper()
            if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", pan):
                return Response({"detail": "Enter a valid PAN number."}, status=400)
            name = str(request.data.get("pan_name", record.designer.owner_name or record.designer.designer_name)).strip()
            if not 2 <= len(name) <= 255:
                return Response({"detail": "Enter the holder's name exactly as shown on PAN (2–255 characters)."}, status=400)
            try:
                dob = date.fromisoformat(str(request.data.get("pan_dob", "")))
            except ValueError:
                return Response({"detail": "Enter the PAN holder's date of birth in YYYY-MM-DD format."}, status=400)
            if dob >= timezone.localdate():
                return Response({"detail": "Date of birth must be before today."}, status=400)
            payload = {"pan_number": pan, "name": name, "date_of_birth": dob.isoformat()}
            record.holder_name = name
            record.pan_number = pan
            record.pan_status = "PENDING"
            record.api_checks = {key: value for key, value in record.api_checks.items() if key != "pan"}
            record.save()
        try:
            result = verify_identity(action, payload)
        except KYCProviderUnavailable as exc:
            return Response({"detail": str(exc), "code": exc.code}, status=exc.status_code)
        kind = "pan"
        name, reference = result.get("name"), result.get("reference")
        if result.get("verified") is False:
            messages = {
                "pan_name_mismatch": "APITXT reports that the submitted name does not match PAN. Ask the designer to correct the name exactly as printed on PAN.",
                "pan_dob_mismatch": "APITXT reports that the submitted birth date does not match PAN. Ask the designer to correct their date of birth.",
                "pan_rejected": "APITXT returned a negative PAN verification result. Check the designer's submitted PAN, name and date of birth.",
            }
            code = result.get("failure_code")
            if code not in messages:
                code = "pan_rejected"
            # Keep only the safe reason; never persist an OTP, identity number or raw response.
            record.api_checks = {**record.api_checks, f"{kind}_failure": {"code": code, "at": timezone.now().isoformat()}}
            record.save(update_fields=["api_checks", "updated_at"])
            return Response({"detail": messages[code], "code": code}, status=400)
        if result.get("verified") is not True:
            return Response({"detail": "APITXT returned an unrecognized verification result. The administrator must check the provider response mapping.", "code": "provider_invalid_result"}, status=502)
        if (kind == "pan" and (not isinstance(name, str) or not name.strip())) or not isinstance(reference, str) or not reference:
            return Response({"detail": "APITXT reported success but required verification evidence is missing. Check the provider response mapping.", "code": "provider_missing_evidence"}, status=502)
        evidence = {"verified": True, "reference": reference[:255],
                    "checked_at": timezone.now().isoformat(), "checked_by": request.user.pk}
        if kind == "pan":
            evidence["name"] = name.strip()[:255]
            evidence["reference_source"] = result.get("reference_source", "provider")
            evidence["name_source"] = result.get("name_source", "provider")
            evidence["submitted_date_of_birth"] = payload["date_of_birth"]
        dob = result.get("date_of_birth") if kind == "pan" else None
        if isinstance(dob, str):
            evidence["date_of_birth"] = dob[:20]
        record.api_checks = {**{key: value for key, value in record.api_checks.items() if key != f"{kind}_failure"}, kind: evidence}
        record.save()
        return Response(KYCSerializer(record).data)


class KYCConfirmAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    @transaction.atomic
    def post(self, request, pk):
        record = get_object_or_404(DesignerKYC.objects.select_for_update().select_related("designer"), pk=pk)
        decision = request.data.get("decision", "VERIFIED")
        notes = str(request.data.get("notes", "")).strip()
        if record.verification_method != "APITXT":
            return Response({"detail": "Use the matching review workflow for this submission."}, status=400)
        if decision == "REJECTED":
            if not notes:
                return Response({"detail": "Enter the reason the details do not match."}, status=400)
        elif decision == "VERIFIED":
            if request.data.get("details_confirmed") is not True:
                return Response({"detail": "Confirm that the returned details have been checked."}, status=400)
            if record.api_checks.get("pan", {}).get("verified") is not True or not name_matches(record):
                return Response({"detail": "PAN verification must succeed and match the submitted name, birth date and PAN number."}, status=400)
        else:
            return Response({"detail": "Choose a valid verification decision."}, status=400)
        now = timezone.now()
        for kind in ("pan",):
            setattr(record, f"{kind}_status", decision)
            setattr(record, f"{kind}_notes", notes)
            setattr(record, f"{kind}_reviewed_by", request.user)
            setattr(record, f"{kind}_reviewed_at", now)
        record.api_checks.pop("_aadhaar_otp_session", None)
        record.holder_name = record.api_checks.get("designer_details", {}).get("name") or record.holder_name
        record.save()
        Designer.objects.filter(pk=record.designer_id).update(kyc_status=decision, kyc_verified_at=now if decision == "VERIFIED" else None)
        return Response(KYCSerializer(record).data)
