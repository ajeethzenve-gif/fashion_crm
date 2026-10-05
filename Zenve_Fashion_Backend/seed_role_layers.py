"""
Run once from the backend root (same folder as manage.py):

    python seed_role_layers.py

Fills the RoleLayerAccess table with the layers each role can open.
It only ADDS rows (never deletes), so it is safe to run again.
After this, manage access in Django admin -> Role Layer Access.
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zenvefashion.settings")
django.setup()

from accounts.models import Role, RoleLayerAccess

ALL_LAYERS = [f"{i:02d}" for i in range(1, 13)]
OPERATIONS = ["05", "06", "07", "08", "09", "11"]

ROLE_LAYERS = {
    "Admin": ALL_LAYERS,
    "Merchandiser": ["01", "02", "03", "04", "05", "06", "08", "11"],
    "Catalogue QA": ["03", "04", "06"],
    "Operation": OPERATIONS,      # role name exactly as stored in your database
    "Operations": OPERATIONS,
    "Inventory Ops": OPERATIONS,  # only used if a Role has this name
    "Finance": ["06", "07", "09", "10", "11"],
}

print("Roles found in database:", list(Role.objects.values_list("name", flat=True)))

for role_name, codes in ROLE_LAYERS.items():
    role = Role.objects.filter(name__iexact=role_name).first()
    if role is None:
        print(f"  skipped (no role named '{role_name}')")
        continue
    for code in codes:
        RoleLayerAccess.objects.get_or_create(role=role, layer=code)
    print(f"  {role.name}: {len(codes)} layers set")

print("Done.")