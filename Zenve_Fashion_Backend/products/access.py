from rest_framework.exceptions import PermissionDenied
from designers.models import Designer
from designers.authentication import LOGIN_STAGES


def designer_for_request(request):
    user = request.user
    if not user.is_authenticated:
        return None
    assignment = getattr(user, "user_role", None)
    if not assignment or assignment.role.name != "Designer":
        return None
    designer = Designer.objects.filter(user=user, is_active=True,
        stage__in=LOGIN_STAGES).first()
    if not designer:
        raise PermissionDenied("An approved designer account is required.")
    return designer


def scoped_products(request, queryset):
    designer = designer_for_request(request)
    return queryset.filter(designer=designer) if designer else queryset


def require_verified_product_designer(designer):
    if designer and designer.kyc_status != Designer.KYCStatus.VERIFIED:
        raise PermissionDenied("PAN KYC verification is required before adding products. Please submit your KYC details and wait for staff approval.")
