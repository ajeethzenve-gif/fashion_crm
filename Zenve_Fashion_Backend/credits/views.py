from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import (
    OfflineFashionCredit,
    OnlineFashionCredit,
    DesignerCreditWallet,
    DesignerCreditStatement,
)
from .serializers import (
    OfflineFashionCreditSerializer,
    OnlineFashionCreditSerializer,
    DesignerCreditWalletSerializer,
    DesignerCreditStatementSerializer,
)
from designers.models import Designer


def get_or_create_designer_wallet(designer):
    """Retrieve or create the designer credit wallet with genuine database values."""
    from products.models import Product

    # Calculate actual catalogue listings count
    designer_skus = Product.objects.filter(designer=designer)
    actual_listings_count = designer_skus.filter(status__in=["APPROVED", "LIVE"]).count()
    actual_points_used = actual_listings_count * 500

    # Determine allocated online credits based on plan or designer credit_points
    allocated_credits = designer.credit_points or 0
    if not allocated_credits and designer.online_membership_plan:
        plan_obj = OnlineFashionCredit.objects.filter(
            plan__iexact=designer.online_membership_plan
        ).first()
        if plan_obj:
            allocated_credits = plan_obj.credit_points

    # Current remaining online credits
    current_online_credits = max(0, allocated_credits - actual_points_used)

    # Determine allocated offline credits based on designer.offline_membership_plan in DB
    offline_allocated = 0
    offline_expiry = None
    offline_plan_title = "None"
    if designer.offline_membership_plan:
        off_plan_obj = OfflineFashionCredit.objects.filter(
            plan__iexact=designer.offline_membership_plan
        ).first()
        if off_plan_obj:
            offline_allocated = off_plan_obj.credit_points
            offline_expiry = timezone.now().date() + timedelta(days=off_plan_obj.min_days or 30)
            offline_plan_title = off_plan_obj.get_plan_display()

    wallet, created = DesignerCreditWallet.objects.get_or_create(
        designer=designer,
        defaults={
            "online_credits": current_online_credits,
            "offline_credits": offline_allocated,
            "points_used": actual_points_used,
            "online_plan": (designer.online_membership_plan or "").title() or "—",
            "offline_plan": offline_plan_title if offline_allocated > 0 else "—",
            "offline_pack_expiry": offline_expiry,
        },
    )

    # ALWAYS sync wallet points and plans with live Designer fields in the database
    updated = False

    # Sync Online Credits & Plan
    expected_online = max(0, allocated_credits - actual_points_used)
    if wallet.online_credits != expected_online:
        wallet.online_credits = expected_online
        updated = True

    if wallet.points_used != actual_points_used:
        wallet.points_used = actual_points_used
        updated = True

    online_plan_title = (designer.online_membership_plan or "").title() or "—"
    if wallet.online_plan != online_plan_title:
        wallet.online_plan = online_plan_title
        updated = True

    # Sync Offline Credits & Plan
    if designer.offline_membership_plan and offline_allocated > 0:
        if wallet.offline_credits == 0:
            wallet.offline_credits = offline_allocated
            updated = True
        if wallet.offline_plan != offline_plan_title:
            wallet.offline_plan = offline_plan_title
            updated = True
        if not wallet.offline_pack_expiry and offline_expiry:
            wallet.offline_pack_expiry = offline_expiry
            updated = True

    if updated:
        wallet.save()

    return wallet


def get_designer_credits_data(designer):
    """Build the comprehensive credits payload using only real database records."""
    from products.models import Product

    wallet = get_or_create_designer_wallet(designer)
    statements = wallet.statements.all().order_by("-id")

    # Compute daily point burn dynamically based strictly on designer products
    designer_skus = Product.objects.filter(designer=designer)
    online_count = designer_skus.filter(is_live=True).count()
    store_count = designer_skus.filter(fulfilment_location__icontains="STORE").count()

    online_burn = online_count * 3
    store_burn = store_count * 5
    total_burn = online_burn + store_burn

    offline_plans = OfflineFashionCredit.objects.filter(is_active=True).order_by("id")

    is_expiry_valid = (
        wallet.offline_pack_expiry and wallet.offline_pack_expiry >= timezone.now().date()
    )
    expiry_str = (
        wallet.offline_pack_expiry.strftime("%d/%m/%Y")
        if is_expiry_valid
        else "No active pack"
    )

    listings_charged_count = wallet.points_used // 500 if wallet.points_used else 0
    points_used_subtitle = (
        f"{listings_charged_count} catalogue listing(s) at 500 pts each"
        if listings_charged_count > 0
        else "0 points used"
    )

    offline_plan_clean = wallet.offline_plan
    if not offline_plan_clean or str(offline_plan_clean).strip() in ["None", "none", "—", "-"]:
        offline_plan_clean = "No active pack" if wallet.offline_credits == 0 else "Offline Pack"

    return {
        "wallet": {
            "online_credits": wallet.online_credits,
            "offline_credits": wallet.offline_credits,
            "points_used": wallet.points_used,
            "total_balance": wallet.total_balance,
            "online_plan": wallet.online_plan or "—",
            "offline_plan": offline_plan_clean,
            "online_listings_left": wallet.online_credits // 500,
            "offline_listings_left": wallet.offline_credits // 500,
            "offline_pack_expiry": expiry_str,
            "points_used_subtitle": points_used_subtitle,
        },
        "daily_burn": {
            "online_count": online_count,
            "online_pts_each": 3,
            "online_subtotal": online_burn,
            "store_count": store_count,
            "store_pts_each": 5,
            "store_subtotal": store_burn,
            "total_burn_per_day": total_burn,
            "rates_text": "Catalogue listing 500 pts · Exclusive video & photo shoot 5,000 pts · Exclusive social media promotion 5,000 pts",
        },
        "offline_plans": OfflineFashionCreditSerializer(offline_plans, many=True).data,
        "statements": DesignerCreditStatementSerializer(statements, many=True).data,
    }


class OfflineFashionListAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        offline_fashion_list = (
            OfflineFashionCredit.objects
            .filter(is_active=True)
            .order_by("id")
        )
        serializer = OfflineFashionCreditSerializer(
            offline_fashion_list,
            many=True,
        )
        return Response(
            {"offlinefashionlist": serializer.data},
            status=status.HTTP_200_OK,
        )


class DesignerCreditsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, designer_id):
        try:
            designer = Designer.objects.get(id=designer_id)
        except Designer.DoesNotExist:
            return Response(
                {"detail": "Designer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = get_designer_credits_data(designer)
        return Response(data, status=status.HTTP_200_OK)


class BuyOfflineCreditPackAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        designer_id = request.data.get("designer_id")
        plan_id = request.data.get("plan_id")
        plan_name = request.data.get("plan_name")

        if not designer_id:
            return Response(
                {"detail": "designer_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            designer = Designer.objects.get(id=designer_id)
        except Designer.DoesNotExist:
            return Response(
                {"detail": "Designer not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        plan = None
        if plan_id:
            plan = OfflineFashionCredit.objects.filter(id=plan_id).first()
        elif plan_name:
            plan = OfflineFashionCredit.objects.filter(plan__iexact=plan_name).first()

        if not plan:
            return Response(
                {"detail": "Valid offline credit plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        wallet = get_or_create_designer_wallet(designer)

        # Update offline credits balance and plan
        wallet.offline_credits += plan.credit_points
        plan_display = plan.get_plan_display()
        wallet.offline_plan = plan_display
        new_expiry = timezone.now().date() + timedelta(days=max(30, plan.min_days or 30))
        wallet.offline_pack_expiry = new_expiry
        wallet.save()

        # Update designer model field
        designer.offline_membership_plan = plan.plan
        designer.save(update_fields=["offline_membership_plan"])

        # Create statement entry
        price_formatted = f"₹{int(plan.membership_price):,}"
        desc = f"Offline pack purchased — {plan_display} ({price_formatted}, {plan.included_catalogue} catalogue in store)"
        today_str = timezone.now().strftime("%d/%m/%Y")

        statement = DesignerCreditStatement.objects.create(
            wallet=wallet,
            designer=designer,
            description=desc,
            channel="OFFLINE",
            points=plan.credit_points,
            date_str=today_str,
        )

        full_data = get_designer_credits_data(designer)
        return Response(
            {
                "detail": f"{plan_display} offline pack successfully activated (+{plan.credit_points:,} pts)!",
                "credits": full_data,
            },
            status=status.HTTP_200_OK,
        )
