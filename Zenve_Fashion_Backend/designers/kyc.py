import re
from pathlib import Path
from django.db import transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Designer, DesignerKYC
from .permissions import has_layer
from .kyc_provider import provider_configured


class KYCStaffAccess(BasePermission):
    message = "Your role does not have access to Designer KYC Verification."

    def has_permission(self, request, view):
        assignment = getattr(request.user, "user_role", None) if request.user.is_authenticated else None
        return not (assignment and assignment.role.name == "Designer") and has_layer(request.user, "17")


class KYCSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        result = super().to_representation(instance)
        result["api_checks"] = {key: value for key, value in result.get("api_checks", {}).items() if key not in ("aadhaar_encrypted", "_aadhaar_otp_session", "aadhaar", "aadhaar_access", "aadhaar_failure")}
        result["api_checks"].get("designer_details", {}).pop("aadhaar_last4", None)
        for key in list(result):
            if key.startswith("aadhaar_"): result.pop(key)
        return result

    designer_name = serializers.CharField(source="designer.designer_name", read_only=True)
    brand_name = serializers.CharField(source="designer.brand_name", read_only=True)
    aadhaar_document = serializers.FileField(read_only=True)
    pan_document = serializers.FileField(write_only=True)

    class Meta:
        model = DesignerKYC
        fields = ["id", "designer", "designer_name", "brand_name", "holder_name", "aadhaar_last4", "pan_number",
                  "aadhaar_document", "pan_document", "aadhaar_status", "pan_status", "aadhaar_notes", "pan_notes",
                  "aadhaar_reviewed_by", "pan_reviewed_by", "aadhaar_reviewed_at", "pan_reviewed_at", "verification_method", "api_checks", "updated_at"]
        read_only_fields = ["aadhaar_last4", "id", "aadhaar_status", "pan_status", "aadhaar_notes", "pan_notes",
                            "aadhaar_reviewed_by", "pan_reviewed_by", "aadhaar_reviewed_at", "pan_reviewed_at", "verification_method", "api_checks", "updated_at"]

    def validate_aadhaar_last4(self, value):
        if not re.fullmatch(r"[0-9]{4}", value):
            raise serializers.ValidationError("Enter only the last 4 Aadhaar digits.")
        return value

    def validate_pan_number(self, value):
        value = value.strip().upper()
        if not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", value):
            raise serializers.ValidationError("Enter a valid PAN format (for example ABCDE1234F).")
        return value

    def validate(self, attrs):
        for key in ["aadhaar_document", "pan_document"]:
            file = attrs.get(key)
            if file:
                if file.size > 5 * 1024 * 1024:
                    raise serializers.ValidationError({key: "Document must be 5 MB or smaller."})
                header = file.read(12)
                file.seek(0)
                signatures = {".pdf": header.startswith(b"%PDF-"), ".png": header.startswith(b"\x89PNG\r\n\x1a\n"),
                              ".jpg": header.startswith(b"\xff\xd8\xff"), ".jpeg": header.startswith(b"\xff\xd8\xff")}
                if not signatures.get(Path(file.name).suffix.lower(), False):
                    raise serializers.ValidationError({key: "Upload a valid PDF, JPG or PNG document."})
        return attrs


class KYCListAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    def get(self, request):
        records = DesignerKYC.objects.select_related("designer").order_by("-updated_at")
        return Response({"submissions": KYCSerializer(records, many=True).data,
                         "provider_configured": provider_configured(),
                         "designers": list(Designer.objects.order_by("brand_name").values("id", "designer_name", "brand_name", "owner_name", "phone", "email", "city", "kyc_status"))})

    @transaction.atomic
    def post(self, request):
        serializer = KYCSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        designer = Designer.objects.select_for_update().get(pk=serializer.validated_data["designer"].pk)
        if DesignerKYC.objects.filter(designer=designer).exists():
            return Response({"detail": "A submission already exists. Use Resubmit to replace its documents."}, status=400)
        record = serializer.save(submitted_by=request.user)
        Designer.objects.filter(pk=designer.pk).update(kyc_status="PENDING", kyc_verified_at=None)
        return Response(KYCSerializer(record).data, status=201)


class KYCDetailAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    @transaction.atomic
    def patch(self, request, pk):
        record = get_object_or_404(DesignerKYC.objects.select_for_update(), pk=pk)
        if record.verification_method == "APITXT":
            return Response({"detail": "Use the API verification workflow to update this record."}, status=400)
        serializer = KYCSerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "designer" in serializer.validated_data and serializer.validated_data["designer"].pk != record.designer_id:
            return Response({"detail": "A submission cannot be moved to another designer."}, status=400)
        record = serializer.save(aadhaar_status="PENDING", pan_status="PENDING", aadhaar_notes="", pan_notes="",
                                 aadhaar_reviewed_by=None, pan_reviewed_by=None, aadhaar_reviewed_at=None, pan_reviewed_at=None)
        Designer.objects.filter(pk=record.designer_id).update(kyc_status="PENDING", kyc_verified_at=None)
        return Response(KYCSerializer(record).data)


class KYCReviewAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    @transaction.atomic
    def post(self, request, pk):
        record = get_object_or_404(DesignerKYC.objects.select_for_update(), pk=pk)
        if record.verification_method == "APITXT":
            return Response({"detail": "Complete API checks and the final identity comparison to verify this designer."}, status=400)
        kind = request.data.get("document")
        decision = request.data.get("decision")
        notes = str(request.data.get("notes", "")).strip()
        if kind != "pan" or decision not in ("VERIFIED", "REJECTED"):
            return Response({"detail": "Choose PAN and a valid review decision."}, status=400)
        if decision == "REJECTED" and not notes:
            return Response({"detail": "Enter a reason for rejection."}, status=400)
        if not getattr(record, f"{kind}_document"):
            return Response({"detail": "Upload the document before reviewing it."}, status=400)
        setattr(record, f"{kind}_status", decision)
        setattr(record, f"{kind}_notes", notes)
        setattr(record, f"{kind}_reviewed_by", request.user)
        setattr(record, f"{kind}_reviewed_at", timezone.now())
        record.save()
        statuses = [record.pan_status]
        status = "VERIFIED" if all(s == "VERIFIED" for s in statuses) else "REJECTED" if "REJECTED" in statuses else "PENDING"
        Designer.objects.filter(pk=record.designer_id).update(kyc_status=status, kyc_verified_at=timezone.now() if status == "VERIFIED" else None)
        return Response(KYCSerializer(record).data)


class KYCDocumentAPIView(APIView):
    permission_classes = [KYCStaffAccess]

    def get(self, request, pk, kind):
        if kind != "pan":
            raise Http404
        record = get_object_or_404(DesignerKYC, pk=pk)
        document = getattr(record, f"{kind}_document")
        try:
            response = FileResponse(document.open("rb"), as_attachment=True, filename=f"{kind}-{record.pk}{Path(document.name).suffix}")
        except (FileNotFoundError, ValueError):
            raise Http404
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
