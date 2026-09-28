import csv
import uuid
from decimal import Decimal
from django.db.models import Q, Sum, Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, Settlement
from .serializers import SettlementSerializer


class AccountingSettlementListAPIView(APIView):
    """
    GET /api/accounting/settlements/
    List settlements with deep payment-method and payout-channel filtering.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        settlements = Settlement.objects.all().select_related(
            "order", "order_item", "designer", "return_request"
        ).order_by("-created_at")

        # 1. Customer Payment Method filter
        payment_method = request.query_params.get("payment_method")
        if payment_method and payment_method.lower() not in ["all", "all payments", ""]:
            # Support fuzzy/exact match (e.g. COD vs Cash on Delivery)
            if payment_method.upper() == "COD":
                settlements = settlements.filter(
                    Q(order__payment_method__iexact="COD") |
                    Q(order__payment_method__iexact="Cash on Delivery")
                )
            else:
                settlements = settlements.filter(order__payment_method__icontains=payment_method.strip())

        # 2. Customer Payment Status filter
        payment_status = request.query_params.get("payment_status")
        if payment_status and payment_status.lower() not in ["all", ""]:
            settlements = settlements.filter(order__payment_status__iexact=payment_status.strip())

        # 3. Payout Method filter
        payout_method = request.query_params.get("payout_method")
        if payout_method and payout_method.lower() not in ["all", ""]:
            settlements = settlements.filter(payout_method__icontains=payout_method.strip())

        # 4. Settlement Status filter
        status_filter = request.query_params.get("status")
        if status_filter and status_filter.lower() not in ["all", ""]:
            settlements = settlements.filter(status__iexact=status_filter.strip())

        # 5. Designer filter
        designer_id = request.query_params.get("designer_id")
        if designer_id and designer_id.lower() not in ["all", ""]:
            settlements = settlements.filter(designer_id=designer_id)

        # 6. Reversal filter
        is_reversal = request.query_params.get("is_reversal")
        if is_reversal is not None and is_reversal != "":
            val = is_reversal.lower() in ["true", "1", "yes"]
            settlements = settlements.filter(is_reversal=val)

        # 7. Batch filter
        batch_id = request.query_params.get("batch_id")
        if batch_id:
            settlements = settlements.filter(batch_id__icontains=batch_id.strip())

        # 8. Free-text search
        search_query = request.query_params.get("search")
        if search_query:
            query = search_query.strip()
            settlements = settlements.filter(
                Q(settlement_number__icontains=query) |
                Q(order__order_number__icontains=query) |
                Q(designer__brand_name__icontains=query) |
                Q(designer__designer_name__icontains=query) |
                Q(designer__designer_code__icontains=query) |
                Q(order_item__product_name__icontains=query) |
                Q(order_item__sku__icontains=query) |
                Q(payout_reference__icontains=query) |
                Q(batch_id__icontains=query)
            ).distinct()

        serializer = SettlementSerializer(settlements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AccountingStatsAPIView(APIView):
    """
    GET /api/accounting/stats/
    Detailed accounting metrics across all payment methods & payout channels.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        regular_settlements = Settlement.objects.filter(is_reversal=False)
        reversal_settlements = Settlement.objects.filter(is_reversal=True)
        all_settlements = Settlement.objects.all()

        # Overall GMV
        regular_gmv = regular_settlements.aggregate(total=Sum("gmv"))["total"] or Decimal("0.00")
        reversed_gmv = reversal_settlements.aggregate(total=Sum("gmv"))["total"] or Decimal("0.00")
        net_gmv = regular_gmv + reversed_gmv

        # Commissions & Payouts
        comm_reg = regular_settlements.aggregate(total=Sum("commission_amount"))["total"] or Decimal("0.00")
        comm_rev = reversal_settlements.aggregate(total=Sum("commission_amount"))["total"] or Decimal("0.00")
        zenve_commission = comm_reg + comm_rev

        paid_disbursed = regular_settlements.filter(
            status__in=[Settlement.SettlementStatus.PAID, Settlement.SettlementStatus.RECONCILED]
        ).aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        pending_payable = regular_settlements.filter(
            status__in=[Settlement.SettlementStatus.PENDING, Settlement.SettlementStatus.APPROVED]
        ).aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")

        total_gateway_fees = all_settlements.aggregate(total=Sum("payment_gateway_fee"))["total"] or Decimal("0.00")

        # Breakdown by Customer Payment Method
        payment_methods_tracked = ["Razorpay", "UPI", "Card", "Net Banking", "COD", "Wallet"]
        payment_breakdown = {}

        for pm in payment_methods_tracked:
            if pm == "COD":
                q_pm = Q(order__payment_method__iexact="COD") | Q(order__payment_method__iexact="Cash on Delivery")
            else:
                q_pm = Q(order__payment_method__icontains=pm)

            pm_settlements = regular_settlements.filter(q_pm)
            pm_gmv = pm_settlements.aggregate(total=Sum("gmv"))["total"] or Decimal("0.00")
            pm_payout = pm_settlements.aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")
            pm_paid_count = pm_settlements.filter(status__in=[Settlement.SettlementStatus.PAID, Settlement.SettlementStatus.RECONCILED]).count()

            payment_breakdown[pm] = {
                "count": pm_settlements.count(),
                "gmv": float(pm_gmv),
                "payout": float(pm_payout),
                "paid_count": pm_paid_count,
            }

        # Breakdown by Payout Disbursement Method
        payout_methods_tracked = ["Bank Transfer", "UPI", "RazorpayX", "Escrow Release", "COD Courier Offset"]
        payout_breakdown = {}

        for p_method in payout_methods_tracked:
            p_settlements = regular_settlements.filter(payout_method__icontains=p_method)
            p_amount = p_settlements.aggregate(total=Sum("payout_amount"))["total"] or Decimal("0.00")
            payout_breakdown[p_method] = {
                "count": p_settlements.count(),
                "amount": float(p_amount),
            }

        # Status counts
        status_counts = {
            "pending": all_settlements.filter(status=Settlement.SettlementStatus.PENDING).count(),
            "approved": all_settlements.filter(status=Settlement.SettlementStatus.APPROVED).count(),
            "paid": all_settlements.filter(status=Settlement.SettlementStatus.PAID).count(),
            "reconciled": all_settlements.filter(status=Settlement.SettlementStatus.RECONCILED).count(),
            "reversed": all_settlements.filter(status=Settlement.SettlementStatus.REVERSED).count(),
            "total": all_settlements.count(),
        }

        return Response({
            "total_settled_gmv": float(net_gmv),
            "gross_gmv": float(regular_gmv),
            "reversal_deductions": float(abs(reversed_gmv)),
            "zenve_commission": float(zenve_commission),
            "total_disbursed": float(paid_disbursed),
            "pending_payable": float(pending_payable),
            "total_gateway_fees": float(total_gateway_fees),
            "payment_breakdown": payment_breakdown,
            "payout_breakdown": payout_breakdown,
            "status_counts": status_counts,
        }, status=status.HTTP_200_OK)


class AccountingDisburseAPIView(APIView):
    """
    POST /api/accounting/disburse/
    Process payout payment for one or multiple settlements.
    Payload:
    {
        "settlement_ids": [1, 2, 3],
        "payout_method": "RazorpayX" | "Bank Transfer" | "UPI" | ...,
        "payout_channel": "HDFC Corporate Primary A/C",
        "payout_reference": "UTR-2026-...",
        "payment_gateway_fee": 5.00,
        "status": "PAID" | "RECONCILED",
        "notes": "Weekly cycle payout",
        "disbursed_by": "Finance Controller"
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        settlement_ids = data.get("settlement_ids")

        if not settlement_ids:
            # Single id fallback
            single_id = data.get("id") or data.get("settlement_id")
            if single_id:
                settlement_ids = [single_id]
            else:
                return Response({"detail": "settlement_ids list is required."}, status=status.HTTP_400_BAD_REQUEST)

        payout_method = data.get("payout_method", Settlement.PayoutMethod.BANK_TRANSFER)
        payout_channel = data.get("payout_channel", "HDFC Corporate Primary A/C")
        custom_ref = data.get("payout_reference")
        fee = Decimal(str(data.get("payment_gateway_fee", "0.00") or "0.00"))
        target_status = data.get("status", Settlement.SettlementStatus.PAID)
        notes = data.get("notes", "")
        disbursed_by = data.get("disbursed_by", "Finance Controller")

        settlements = Settlement.objects.filter(id__in=settlement_ids)
        if not settlements.exists():
            return Response({"detail": "No matching settlements found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        updated_records = []

        for idx, s in enumerate(settlements):
            # Generate UTR if not supplied or if batch
            if custom_ref and len(settlements) == 1:
                utr = custom_ref
            elif custom_ref:
                utr = f"{custom_ref}-{idx + 1}"
            else:
                utr = f"UTR-{uuid.uuid4().hex[:10].upper()}"

            s.status = target_status
            s.payout_method = payout_method
            s.payout_channel = payout_channel
            s.payout_reference = utr
            s.payment_gateway_fee = fee
            s.disbursed_by = disbursed_by
            s.paid_at = s.paid_at or now

            if target_status == Settlement.SettlementStatus.RECONCILED:
                s.reconciled_at = now

            if notes:
                existing_notes = s.notes or ""
                s.notes = f"{existing_notes}\n[{now.strftime('%Y-%m-%d %H:%M')}] {notes}".strip()

            s.save()
            updated_records.append(s)

        serializer = SettlementSerializer(updated_records, many=True)
        return Response({
            "message": f"Successfully disbursed payment for {len(updated_records)} settlement(s) via {payout_method}.",
            "disbursed_count": len(updated_records),
            "settlements": serializer.data,
        }, status=status.HTTP_200_OK)


class AccountingBatchPayoutAPIView(APIView):
    """
    POST /api/accounting/batch-payout/
    Bulk disburse all selected settlements in a single batch payment run.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        settlement_ids = data.get("settlement_ids", [])
        if not settlement_ids:
            return Response({"detail": "settlement_ids list cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        batch_id = data.get("batch_id") or f"BATCH-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        payout_method = data.get("payout_method", Settlement.PayoutMethod.RAZORPAYX)
        payout_channel = data.get("payout_channel", "RazorpayX Payout Account")
        fee_per_tx = Decimal(str(data.get("fee_per_tx", "0.00") or "0.00"))
        disbursed_by = data.get("disbursed_by", "Finance Controller")
        notes = data.get("notes", "Batch payout run")

        settlements = Settlement.objects.filter(id__in=settlement_ids)
        total_payout = Decimal("0.00")
        now = timezone.now()

        for idx, s in enumerate(settlements):
            utr = f"UTR-{batch_id}-{idx + 1:03d}"
            s.status = Settlement.SettlementStatus.PAID
            s.payout_method = payout_method
            s.payout_channel = payout_channel
            s.payout_reference = utr
            s.batch_id = batch_id
            s.payment_gateway_fee = fee_per_tx
            s.disbursed_by = disbursed_by
            s.paid_at = now
            s.notes = f"Batch Payment {batch_id}: {notes}"
            s.save()
            total_payout += s.payout_amount

        return Response({
            "message": f"Batch payment {batch_id} executed successfully.",
            "batch_id": batch_id,
            "settlements_count": settlements.count(),
            "total_payout_disbursed": float(total_payout),
            "payout_method": payout_method,
            "disbursed_at": now.isoformat(),
        }, status=status.HTTP_200_OK)


class AccountingReconcileAPIView(APIView):
    """
    POST /api/accounting/reconcile/
    Reconciles paid settlements against bank statement / payment gateway ledger.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        settlement_ids = request.data.get("settlement_ids")
        reconcile_all_paid = request.data.get("reconcile_all_paid", False)

        now = timezone.now()
        if reconcile_all_paid:
            settlements = Settlement.objects.filter(status=Settlement.SettlementStatus.PAID)
        elif settlement_ids:
            settlements = Settlement.objects.filter(id__in=settlement_ids)
        else:
            return Response({"detail": "Provide settlement_ids or set reconcile_all_paid=True."}, status=status.HTTP_400_BAD_REQUEST)

        count = settlements.count()
        settlements.update(status=Settlement.SettlementStatus.RECONCILED, reconciled_at=now)

        return Response({
            "message": f"Reconciled {count} settlement(s) successfully.",
            "reconciled_count": count,
            "reconciled_at": now.isoformat(),
        }, status=status.HTTP_200_OK)


class AccountingExportAPIView(APIView):
    """
    GET /api/accounting/export/
    Export settlements & payment accounting ledger as CSV.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        response["Content-Disposition"] = f'attachment; filename="zenve_accounting_ledger_{timestamp}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            "Settlement Number",
            "Order Number",
            "Order Date",
            "Customer Payment Method",
            "Customer Payment Status",
            "Designer Code",
            "Designer Brand",
            "Product Name",
            "SKU",
            "Quantity",
            "GMV (INR)",
            "Take Rate (%)",
            "Commission Amount (INR)",
            "Tax (INR)",
            "Net Designer Payout (INR)",
            "Settlement Status",
            "Payout Method",
            "Payout Channel",
            "Payout Reference / UTR",
            "Payment Gateway Fee (INR)",
            "Batch ID",
            "Disbursed By",
            "Paid At",
            "Reconciled At",
            "Notes",
        ])

        settlements = Settlement.objects.all().select_related("order", "order_item", "designer").order_by("-created_at")
        for s in settlements:
            order = s.order
            designer = s.designer
            item = s.order_item

            writer.writerow([
                s.settlement_number,
                order.order_number if order else "",
                order.created_at.strftime("%Y-%m-%d %H:%M") if (order and order.created_at) else "",
                order.payment_method if order else "",
                order.payment_status if order else "",
                designer.designer_code if designer else "",
                designer.brand_name if designer else "",
                item.product_name if item else "",
                item.sku if item else "",
                item.quantity if item else 1,
                float(s.gmv),
                float(s.take_rate),
                float(s.commission_amount),
                float(s.tax_amount),
                float(s.payout_amount),
                s.status,
                s.payout_method or "Bank Transfer",
                s.payout_channel or "HDFC Corporate Primary A/C",
                s.payout_reference or "",
                float(s.payment_gateway_fee or 0),
                s.batch_id or "",
                s.disbursed_by or "Finance Controller",
                s.paid_at.strftime("%Y-%m-%d %H:%M") if s.paid_at else "",
                s.reconciled_at.strftime("%Y-%m-%d %H:%M") if s.reconciled_at else "",
                s.notes or "",
            ])

        return response
