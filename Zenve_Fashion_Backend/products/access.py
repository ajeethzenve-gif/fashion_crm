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
        stage__in=LOGIN_STAGES, kyc_status="VERIFIED").first()
    if not designer:
        raise PermissionDenied("Approval and verified KYC are required.")
    return designer


def scoped_products(request, queryset):
    designer = designer_for_request(request)
    return queryset.filter(designer=designer) if designer else queryset
