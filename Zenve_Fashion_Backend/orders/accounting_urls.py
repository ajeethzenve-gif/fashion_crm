from django.urls import path
from .accounting_views import (
    AccountingSettlementListAPIView,
    AccountingStatsAPIView,
    AccountingDisburseAPIView,
    AccountingBatchPayoutAPIView,
    AccountingReconcileAPIView,
    AccountingExportAPIView,
)

urlpatterns = [
    path("settlements/", AccountingSettlementListAPIView.as_view(), name="accounting-settlements"),
    path("stats/", AccountingStatsAPIView.as_view(), name="accounting-stats"),
    path("disburse/", AccountingDisburseAPIView.as_view(), name="accounting-disburse"),
    path("batch-payout/", AccountingBatchPayoutAPIView.as_view(), name="accounting-batch-payout"),
    path("reconcile/", AccountingReconcileAPIView.as_view(), name="accounting-reconcile"),
    path("export/", AccountingExportAPIView.as_view(), name="accounting-export"),
]
