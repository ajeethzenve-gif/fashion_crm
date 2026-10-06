from rest_framework.permissions import BasePermission
from .authentication import LOGIN_STAGES
from .models import Designer


def has_layer(user, layer):
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if user.is_staff or user.is_superuser:
        return True
    assignment = getattr(user, "user_role", None)
    return bool(assignment and assignment.role.layer_access.filter(layer=layer).exists())


class DesignerManagementAccess(BasePermission):
    message = "Your role does not have access to designer onboarding and verification."

    def has_permission(self, request, view):
        user = request.user
        assignment = getattr(user, "user_role", None) if user.is_authenticated else None
        if not (assignment and assignment.role.name == "Designer"):
            return has_layer(user, "01")
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            return False
        if not assignment or assignment.role.name != "Designer":
            return False
        designer_id = view.kwargs.get("designer_id")
        return Designer.objects.filter(user=user, **({"pk": designer_id} if designer_id else {})).exists()


class DesignerDashboardAccess(BasePermission):
    message = "An approved account and verified KYC are required for your own designer dashboard."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        if user.is_staff or user.is_superuser:
            return True
        role = getattr(user, "user_role", None)
        if role and role.role.name == "Designer":
            return Designer.objects.filter(
                pk=view.kwargs.get("designer_id"), user=user,
                is_active=True, stage__in=LOGIN_STAGES, kyc_status="VERIFIED",
            ).exists()
        return has_layer(user, "02") or has_layer(user, "01")
