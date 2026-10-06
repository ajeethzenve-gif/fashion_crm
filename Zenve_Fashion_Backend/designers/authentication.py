import re
from django.contrib.auth.models import User
from accounts.models import Role, UserRole, RoleLayerAccess
from .models import Designer

LOGIN_STAGES = ("APPROVED", "CONTRACT", "SIGNED", "LIVE", "ACTIVE")


def normalize_phone(value):
    phone = re.sub(r"[\s()+-]", "", str(value or ""))
    if len(phone) == 10:
        phone = "91" + phone
    if not phone.isdigit() or not 10 <= len(phone) <= 15:
        raise ValueError("Enter a valid mobile number with country code.")
    return phone


def provision_designer_user(designer):
    if designer.user_id:
        user = designer.user
    else:
        # Dedicated account avoids overwriting unrelated customer/staff roles.
        user = User(username=f"designer_{designer.pk}")
        user.set_unusable_password()
    names = (designer.owner_name or designer.designer_name).split(maxsplit=1)
    user.first_name = names[0][:150] if names else ""
    user.last_name = names[1][:150] if len(names) > 1 else ""
    user.email = designer.email
    user.save()
    role, _ = Role.objects.get_or_create(name="Designer")
    role.layer_access.exclude(layer__in=("02", "03", "06")).delete()
    for layer in ("02", "03", "06"):
        RoleLayerAccess.objects.get_or_create(role=role, layer=layer)
    UserRole.objects.update_or_create(user=user, defaults={"role": role})
    if designer.user_id != user.pk:
        Designer.objects.filter(pk=designer.pk).update(user=user)
        designer.user = user
    return user
