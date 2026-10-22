from django.db import models
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from designers.permissions import has_layer
from designers.models import Designer
from products.models import Product, MediaJob
from orders.models import Order, ReturnRequest, Settlement
from .models import NotificationRead


class NotificationAccess(BasePermission):
    def has_permission(self, request, view):
        assignment = getattr(request.user, "user_role", None) if request.user.is_authenticated else None
        return not (assignment and assignment.role.name == "Designer") and has_layer(request.user, "16")


def inbox_items(user):
    items = []
    def add(key, kind, title, subject, date, path, state="Needs review"):
        items.append(dict(id=key, category=kind, title=title, subject=subject,
                          at=date.isoformat() if date else "", path=path, status=state))
    if has_layer(user, "01"):
        for d in Designer.objects.only("id", "designer_name", "brand_name", "gst_requested_at", "gst_number", "stage", "kyc_status", "follow_up_tasks", "updated_at").iterator():
            if d.gst_requested_at:
                add(f"gst-{d.pk}", "GST", "New GST number requested", d.brand_name, d.gst_requested_at, "/designer-crm", "Completed" if d.gst_number else "Needs review")
            if d.stage == "REVIEW":
                add(f"designer-{d.pk}-{d.updated_at.isoformat()}", "Designer approval", "Designer awaiting approval", d.brand_name, d.updated_at, "/designer-crm")
            if d.stage in ["APPROVED", "CONTRACT", "SIGNED", "LIVE", "ACTIVE"] and d.kyc_status == "PENDING":
                add(f"kyc-{d.pk}-{d.updated_at.isoformat()}", "KYC", "Designer KYC verification required", d.brand_name, d.updated_at, "/designer-crm")
            for index, task in enumerate(d.follow_up_tasks or []):
                add(f"task-{d.pk}-{task.get('id', index)}", "Follow-up", task.get("title") or task.get("text") or "Follow-up task", d.brand_name, d.updated_at, "/designer-crm", "Completed" if task.get("completed") else "Open")
    if has_layer(user, "04"):
        for p in Product.objects.filter(status="PENDING_QA").only("id", "product_name", "sku", "updated_at"):
            add(f"qa-{p.pk}-{p.updated_at.isoformat()}", "Catalogue QA", "Product awaiting QA approval", p.product_name or p.sku, p.updated_at, "/catalogueqa")
    if has_layer(user, "13"):
        for job in MediaJob.objects.filter(status="IN_REVIEW").select_related("product"):
            add(f"media-{job.pk}-{job.updated_at.isoformat()}", "Media", "Media review requested", job.product.product_name, job.updated_at, "/media")
    if has_layer(user, "09"):
        for r in ReturnRequest.objects.exclude(status__in=["REJECTED", "REFUNDED", "PROCESSED"]):
            add(f"return-{r.pk}-{r.updated_at.isoformat()}", "Returns", "Return request", r.return_number, r.updated_at, "/returns", r.status.replace("_", " ").title())
    if has_layer(user, "07"):
        for order in Order.objects.filter(order_status="Pending"):
            add(f"order-{order.pk}", "Orders", "New order awaiting confirmation", order.order_number, order.created_at, "/orders")
    if has_layer(user, "10"):
        for s in Settlement.objects.filter(status="PENDING"):
            add(f"settlement-{s.pk}", "Settlement", "Settlement awaiting approval", s.settlement_number, s.created_at, "/settlement")
    if has_layer(user, "14"):
        for p in Product.objects.filter(social_media_status="PENDING_REVIEW").only("id", "product_name", "updated_at"):
            add(f"social-{p.pk}-{p.updated_at.isoformat()}", "Social Media", "Growth add-on review requested", p.product_name, p.updated_at, "/social-media")
    if has_layer(user, "17"):
        from designers.models import DesignerKYC
        for record in DesignerKYC.objects.select_related("designer").filter(pan_status="PENDING"):
            add(f"kyc-review-{record.pk}-{record.updated_at.isoformat()}", "KYC Verification", "PAN verification awaiting review", record.designer.brand_name, record.updated_at, "/designer-kyc")
    if has_layer(user, "16") or has_layer(user, "01"):
        from credits.models import OfflinePlanRequest
        for req in OfflinePlanRequest.objects.select_related("designer").filter(status="PENDING").order_by("-created_at")[:50]:
            add(
                f"offline-plan-req-{req.pk}",
                "Subscription",
                "Designer needs offline subscription plan",
                f"{req.designer.brand_name or req.designer.designer_name} requested {req.plan_name} offline plan",
                req.created_at,
                "/designer-portal",
                "Needs review",
            )
    read_ids = set(NotificationRead.objects.filter(user=user).values_list("notification_id", flat=True))
    for item in items:
        item["read"] = item["id"] in read_ids
    return sorted(items, key=lambda item: item["at"], reverse=True)


class NotificationsAPIView(APIView):
    permission_classes = [NotificationAccess]

    def get(self, request):
        return Response(inbox_items(request.user))

    def post(self, request):
        available = {item["id"] for item in inbox_items(request.user)}
        ids = request.data.get("ids")
        if not isinstance(ids, list) or any(not isinstance(key, str) or key not in available for key in ids):
            return Response({"detail": "Select valid notifications from your inbox."}, status=400)
        NotificationRead.objects.bulk_create([
            NotificationRead(user=request.user, notification_id=key) for key in set(ids)
        ], ignore_conflicts=True)
        return Response({"message": "Notifications marked as read."})
