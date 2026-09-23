from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from rest_framework.parsers import (
    JSONParser,
    FormParser,
    MultiPartParser,
)

from django.shortcuts import get_object_or_404

from .models import (
    Designer,
    DesignerAccountDetails,
)

from .serializers import (
    DesignerSerializer,
    DesignerAccountDetailsSerializer,
)

# =========================================================
# DESIGNER LIST / CREATE API
# =========================================================

class DesignerListAPIView(APIView):

    permission_classes = [AllowAny]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get(self, request):
        designers = Designer.objects.all().order_by(
            "-created_at"
        )

        serializer = DesignerSerializer(
            designers,
            many=True,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def post(self, request):

        serializer = DesignerSerializer(
            data=request.data,
            context={"request": request},
        )

        if serializer.is_valid():

            designer = serializer.save()

            return Response(
                DesignerSerializer(
                    designer,
                    context={"request": request},
                ).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


# =========================================================
# DESIGNER DETAIL / UPDATE / DELETE API
# =========================================================

class DesignerDetailAPIView(APIView):
    """
    GET    /api/designers/<id>/
    PUT    /api/designers/<id>/
    PATCH  /api/designers/<id>/
    DELETE /api/designers/<id>/
    """

    permission_classes = [AllowAny]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    # =====================================================
    # GET OBJECT
    # =====================================================

    def get_object(self, designer_id):
        try:
            return Designer.objects.get(
                id=designer_id
            )
        except Designer.DoesNotExist:
            return None

    # =====================================================
    # GET SINGLE DESIGNER
    # =====================================================

    def get(self, request, designer_id):

        designer = self.get_object(
            designer_id
        )

        if designer is None:
            return Response(
                {
                    "detail":
                        "Designer not found."
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        serializer = DesignerSerializer(
            designer,
            context={
                "request": request
            },
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # FULL UPDATE
    # =====================================================

    def put(self, request, designer_id):

        designer = self.get_object(
            designer_id
        )

        if designer is None:
            return Response(
                {
                    "detail":
                        "Designer not found."
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        serializer = DesignerSerializer(
            designer,
            data=request.data,
            context={
                "request": request
            },
        )

        if serializer.is_valid():

            designer = serializer.save()

            return Response(
                DesignerSerializer(
                    designer,
                    context={
                        "request": request
                    },
                ).data,
                status=
                    status.HTTP_200_OK,
            )

        return Response(
            serializer.errors,
            status=
                status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # PARTIAL UPDATE
    # =====================================================

    def patch(
        self,
        request,
        designer_id
    ):
        import time
        import traceback

        designer = self.get_object(
            designer_id
        )

        if designer is None:
            return Response(
                {
                    "detail":
                        "Designer not found."
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        try:
            # IMPORTANT:
            # request.data can be QueryDict when using
            # multipart/form-data.
            #
            # Use a normal dictionary for normal fields,
            # but keep uploaded files separately.

            data = {}

            for key, value in request.data.items():
                data[key] = value

            # =================================================
            # FOLLOW-UP TASK
            # =================================================

            if "add_task" in data:

                task = data.pop(
                    "add_task"
                )

                # JSON request may provide dictionary.
                # Multipart may provide JSON string.

                if isinstance(task, str):
                    import json

                    try:
                        task = json.loads(task)
                    except json.JSONDecodeError:
                        task = {}

                if not isinstance(
                    task,
                    dict
                ):
                    task = {}

                tasks = list(
                    designer.follow_up_tasks
                    or []
                )

                task_id = int(
                    time.time() * 1000
                )

                tasks.append(
                    {
                        "id": task_id,

                        "title":
                            task.get(
                                "title",
                                ""
                            ),

                        "due_date":
                            task.get(
                                "due_date",
                                ""
                            ),

                        "completed":
                            bool(
                                task.get(
                                    "completed",
                                    False,
                                )
                            ),
                    }
                )

                designer.follow_up_tasks = (
                    tasks
                )

                designer.save(
                    update_fields=[
                        "follow_up_tasks"
                    ]
                )

            # =================================================
            # TOGGLE TASK
            # =================================================

            if "toggle_task_id" in data:

                task_id = data.pop(
                    "toggle_task_id"
                )

                tasks = list(
                    designer.follow_up_tasks
                    or []
                )

                for task in tasks:

                    if (
                        isinstance(
                            task,
                            dict
                        )
                        and
                        str(
                            task.get("id")
                        )
                        ==
                        str(task_id)
                    ):
                        task[
                            "completed"
                        ] = not task.get(
                            "completed",
                            False,
                        )

                designer.follow_up_tasks = (
                    tasks
                )

                designer.save(
                    update_fields=[
                        "follow_up_tasks"
                    ]
                )

            # =================================================
            # LOST REASON
            # =================================================

            if (
                "lost_reason" in data
                and
                data["lost_reason"]
            ):
                if "stage" not in data:
                    data[
                        "stage"
                    ] = "REJECTED"

            # =================================================
            # PROFILE IMAGE
            # =================================================

            if (
                "profile_image"
                in request.FILES
            ):
                data[
                    "profile_image"
                ] = request.FILES[
                    "profile_image"
                ]

            # =================================================
            # LOGO
            # =================================================

            if "logo" in request.FILES:
                data[
                    "logo"
                ] = request.FILES[
                    "logo"
                ]

            # =================================================
            # SERIALIZER
            # =================================================

            serializer = DesignerSerializer(
                designer,
                data=data,
                partial=True,
                context={
                    "request": request
                },
            )

            if not serializer.is_valid():

                return Response(
                    serializer.errors,
                    status=
                        status.HTTP_400_BAD_REQUEST,
                )

            designer = serializer.save()

            # =================================================
            # RESPONSE
            # =================================================

            response_serializer = (
                DesignerSerializer(
                    designer,
                    context={
                        "request":
                            request
                    },
                )
            )

            return Response(
                response_serializer.data,
                status=
                    status.HTTP_200_OK,
            )

        except Exception as exc:

            # Show full traceback in Django terminal.
            traceback.print_exc()

            # Useful during development.
            return Response(
                {
                    "detail": str(exc),
                    "error_type":
                        type(exc).__name__,
                },
                status=
                    status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # =====================================================
    # DELETE
    # =====================================================

    def delete(
        self,
        request,
        designer_id
    ):

        designer = self.get_object(
            designer_id
        )

        if designer is None:
            return Response(
                {
                    "detail":
                        "Designer not found."
                },
                status=
                    status.HTTP_404_NOT_FOUND,
            )

        designer.delete()

        return Response(
            status=
                status.HTTP_204_NO_CONTENT,
        )

# =========================================================
# DESIGNER PORTAL DASHBOARD API (02 DESIGNER PORTAL)
# =========================================================

class DesignerPortalDashboardAPIView(APIView):
    """
    GET  /api/designers/<id>/portal-dashboard/
    POST /api/designers/<id>/portal-dashboard/mark-read/
    """
    permission_classes = [AllowAny]

    def get(self, request, designer_id):
        from decimal import Decimal
        from django.db import models
        from django.db.models import Sum
        from django.utils import timezone
        from products.models import Product
        from orders.models import Order, OrderItem, ReturnRequest, Settlement
        from products.serializers import ProductSerializer

        try:
            designer = Designer.objects.get(id=designer_id)
        except Designer.DoesNotExist:
            return Response({"detail": "Designer not found."}, status=status.HTTP_404_NOT_FOUND)

        skus = Product.objects.filter(designer=designer)
        sku_serializer = ProductSerializer(skus, many=True)

        # Order items for this designer
        p_ids = [str(p.id) for p in skus]
        p_skus = [p.sku for p in skus if p.sku]
        order_items = OrderItem.objects.filter(
            models.Q(product_id__in=p_ids) |
            models.Q(product_data__sku__in=p_skus) |
            models.Q(product_data__brand_name=designer.brand_name)
        )
        order_ids = order_items.values_list("order_id", flat=True).distinct()
        orders = Order.objects.filter(id__in=order_ids).order_by("-created_at")

        # Settlements for this designer
        settlements = Settlement.objects.filter(designer=designer).order_by("-created_at")

        # Metrics calculation
        delivered_items = order_items.filter(order__order_status__in=["Delivered", "DELIVERED"])
        delivered_gmv = delivered_items.aggregate(total=Sum("total"))["total"] or Decimal("0.00")
        monthly_gmv = delivered_gmv if delivered_gmv > 0 else (designer.monthly_gmv or Decimal("0.00"))

        units_sold = order_items.aggregate(total=Sum("quantity"))["total"] or 0
        total_orders = orders.count()

        take_rate = designer.take_rate or Decimal("0.00")
        commission = round((monthly_gmv * take_rate) / Decimal("100"), 2)

        paid_settlements = settlements.filter(status__in=[Settlement.SettlementStatus.PAID, Settlement.SettlementStatus.RECONCILED])
        already_paid = paid_settlements.aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        pending_settlements = settlements.filter(status__in=[Settlement.SettlementStatus.PENDING, Settlement.SettlementStatus.APPROVED])
        net_payable = pending_settlements.aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        # Returns
        returns_count = ReturnRequest.objects.filter(order_item__in=order_items).count()
        return_rate = round((returns_count / max(1, units_sold)) * 100, 1) if units_sold > 0 else 0

        # Best seller
        best_seller_prod = None
        best_seller_units = 0
        for p in skus:
            p_sold = p.units_sold
            if p_sold > best_seller_units:
                best_seller_units = p_sold
                best_seller_prod = p
        if not best_seller_prod and skus.exists():
            best_seller_prod = skus.first()

        live_skus_count = skus.filter(status__in=["LIVE", "APPROVED"]).count()
        low_stock_skus = [p for p in skus if p.available_quantity <= p.low_stock_threshold]

        # Pending actions
        pending_actions = []
        for p in skus:
            if p.status == "CORRECTION":
                pending_actions.append(f"Fix and resubmit {p.product_name}")
            elif p.status == "REJECTED":
                pending_actions.append(f"{p.product_name} was rejected in QA")
        for p in low_stock_skus:
            pending_actions.append(f"Restock {p.product_name} — {p.available_quantity} left")
        
        now = timezone.now()
        for ord_obj in orders:
            if ord_obj.order_status not in ["Delivered", "DELIVERED", "Cancelled", "CANCELLED"]:
                delta = (now - ord_obj.created_at).total_seconds()
                if delta > 259200:  # older than 3 days
                    pending_actions.append(f"{ord_obj.order_number} is running late")

        # Notifications list from designer or recent activity
        notifications = []
        if getattr(designer, "follow_up_tasks", None):
            for idx, task in enumerate(designer.follow_up_tasks):
                notifications.append({
                    "id": f"task-{idx}",
                    "kind": "QA_OUTCOME" if "QA" in task.get("title", "") else "ORDER",
                    "message": task.get("title", ""),
                    "at": task.get("due_date") or now.isoformat(),
                    "read": task.get("completed", False)
                })

        # Add recent settlement / order notifications if empty
        if not notifications:
            for s in settlements[:2]:
                notifications.append({
                    "id": f"stl-{s.id}",
                    "kind": "PAYOUT",
                    "message": f"Settlement {s.settlement_number} generated for {designer.brand_name}",
                    "at": s.created_at.isoformat(),
                    "read": s.status in [Settlement.SettlementStatus.PAID, Settlement.SettlementStatus.RECONCILED]
                })
            for p in skus.filter(status="APPROVED")[:2]:
                notifications.append({
                    "id": f"qa-{p.id}",
                    "kind": "QA_OUTCOME",
                    "message": f"Catalogue QA approved {p.sku}",
                    "at": p.updated_at.isoformat(),
                    "read": True
                })

        orders_data = [
            {
                "id": o.order_number,
                "customer": o.shipping_full_name,
                "amount": float(o.total),
                "status": o.order_status
            }
            for o in orders[:10]
        ]

        settlements_data = [
            {
                "id": s.settlement_number,
                "gmv": float(s.gmv),
                "commission": float(s.commission_amount),
                "net": float(s.payout_amount),
                "status": s.status
            }
            for s in settlements[:10]
        ]

        return Response({
            "designer": {
                "id": designer.id,

                "designer_code":
                    designer.designer_code,

                "brand":
                    designer.brand_name,

                "brand_name":
                    designer.brand_name,

                "name":
                    designer.owner_name
                    or designer.designer_name,

                "designer_name":
                    designer.designer_name,

                "owner_name":
                    designer.owner_name,

                "contact":
                    designer.email
                    or designer.phone
                    or "—",

                "email":
                    designer.email or "",

                "phone":
                    designer.phone or "",

                "city":
                    designer.city,

                "state":
                    designer.state or "",

                "country":
                    designer.country,

                "stage":
                    designer.stage,

                "kyc":
                    designer.kyc_status
                    == "VERIFIED",

                "kyc_status":
                    designer.kyc_status,

                "gst":
                    designer.gst_number or "",

                "gst_number":
                    designer.gst_number or "",

                "contractEnds":
                    str(
                        designer.contract_end_date
                    )
                    if designer.contract_end_date
                    else "—",

                "takeRate":
                    float(designer.take_rate),

                "profile_image": (
                    request.build_absolute_uri(
                        designer.profile_image.url
                    )
                    if designer.profile_image
                    else None
                ),

                "logo": (
                    request.build_absolute_uri(
                        designer.logo.url
                    )
                    if designer.logo
                    else None
                ),
            },
            "kpis": {
                "monthlyGmv": float(monthly_gmv),
                "orders": total_orders,
                "units": units_sold,
                "commission": float(commission),
                "netPayable": float(net_payable),
                "paid": float(already_paid),
                "conversion": 0.1,
                "bestSeller": {
                    "name": best_seller_prod.product_name,
                    "units": best_seller_units
                } if best_seller_prod else None,
                "returns": returns_count,
                "returnRate": return_rate,
                "liveSkus": live_skus_count,
                "totalSkus": skus.count(),
                "inventoryAlerts": len(low_stock_skus),
                "health": designer.health_score or 75
            },
            "pendingActions": pending_actions,
            "notifications": notifications,
            "skus": sku_serializer.data,
            "orders": orders_data,
            "settlements": settlements_data,
            "account_details": (
                DesignerAccountDetailsSerializer(
                    designer.account_details,
                    context={"request": request}
                ).data
                if hasattr(designer, "account_details")
                else None
            )
        }, status=status.HTTP_200_OK)

    def post(self, request, designer_id):
        # Mark notifications as read
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)


class DesignerAccountDetailsView(APIView):

    permission_classes = [AllowAny]

    parser_classes = [
        JSONParser,
        FormParser,
        MultiPartParser,
    ]

    def get_designer(
        self,
        designer_id
    ):
        return get_object_or_404(
            Designer,
            pk=designer_id,
        )

    # =====================================================
    # GET
    # =====================================================

    def get(
        self,
        request,
        designer_id
    ):

        designer = self.get_designer(
            designer_id
        )

        try:
            account = (
                designer.account_details
            )

        except DesignerAccountDetails.DoesNotExist:

            return Response(
                {
                    "exists": False,
                    "data": None,
                },
                status=status.HTTP_200_OK,
            )

        serializer = (
            DesignerAccountDetailsSerializer(
                account,
                context={
                    "request": request
                },
            )
        )

        return Response(
            {
                "exists": True,
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # =====================================================
    # CREATE / UPDATE
    # =====================================================

    def post(
        self,
        request,
        designer_id
    ):

        designer = self.get_designer(
            designer_id
        )

        try:
            account = (
                designer.account_details
            )

            created = False

        except DesignerAccountDetails.DoesNotExist:

            account = None
            created = True

        serializer = (
            DesignerAccountDetailsSerializer(
                account,
                data=request.data,
                partial=not created,
                context={
                    "request": request
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save(
            designer=designer
        )

        return Response(
            {
                "message": (
                    "Account details created successfully."
                    if created
                    else
                    "Account details updated successfully."
                ),

                "exists": True,

                "data": serializer.data,
            },

            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )

    # =====================================================
    # PATCH
    # =====================================================

    def patch(
        self,
        request,
        designer_id
    ):

        designer = self.get_designer(
            designer_id
        )

        try:
            account = (
                designer.account_details
            )

        except DesignerAccountDetails.DoesNotExist:

            return Response(
                {
                    "detail":
                        "Account details do not exist for this designer."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = (
            DesignerAccountDetailsSerializer(
                account,
                data=request.data,
                partial=True,
                context={
                    "request": request
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "message":
                    "Account details updated successfully.",

                "exists": True,

                "data":
                    serializer.data,
            },
            status=status.HTTP_200_OK,
        )