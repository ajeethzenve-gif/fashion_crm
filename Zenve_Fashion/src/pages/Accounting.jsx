import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Accounting.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";
import {
  getAccountingSettlements,
  getAccountingStats,
  disburseSettlementPayment,
  batchDisbursePayments,
  reconcileAccountingSettlements,
  getAccountingExportUrl,
  getDesigners,
} from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 4V10H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 20V14H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9A9 9 0 0120.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2V22L7 20L10 22L13 20L16 22L19 20L22 22V2L19 4L16 2L13 4L10 2L7 4L4 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* =========================================================
   HELPERS & FORMATTERS
========================================================= */

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

function getPaymentBadgeClass(method) {
  const m = String(method || "").toUpperCase();
  if (m.includes("RAZORPAY")) return "pm-razorpay";
  if (m.includes("UPI")) return "pm-upi";
  if (m.includes("CARD")) return "pm-card";
  if (m.includes("NET") || m.includes("BANK")) return "pm-netbanking";
  if (m.includes("COD") || m.includes("CASH")) return "pm-cod";
  if (m.includes("WALLET")) return "pm-wallet";
  return "pm-default";
}

function getStatusTone(status) {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "DELIVERED", "PASSED", "PAID", "RECONCILED", "ACTIVE", "LIVE"].includes(s)) {
    return "good";
  }
  if (["REJECTED", "CANCELLED", "FAILED", "REVERSED"].includes(s)) {
    return "bad";
  }
  if (["PENDING_QA", "CORRECTION", "PENDING", "REQUESTED", "RECEIVED"].includes(s)) {
    return "warn";
  }
  return "info";
}

const PAYMENT_METHODS = [
  { id: "ALL", label: "All Payments", countKey: "all" },
  { id: "Razorpay", label: "Razorpay", countKey: "Razorpay" },
  { id: "UPI", label: "UPI", countKey: "UPI" },
  { id: "Card", label: "Card", countKey: "Card" },
  { id: "Net Banking", label: "Net Banking", countKey: "Net Banking" },
  { id: "COD", label: "Cash on Delivery", countKey: "COD" },
  { id: "Wallet", label: "Wallet", countKey: "Wallet" },
];

const PAYOUT_CHANNELS = [
  "Bank Transfer",
  "UPI",
  "RazorpayX",
  "Escrow Release",
  "COD Courier Offset",
  "Cheque",
];

const DEBIT_ACCOUNTS = [
  "HDFC Corporate Primary A/C (ending in 8912)",
  "RazorpayX Smart Payout Virtual A/C",
  "ICICI Platform Escrow A/C (ending in 4401)",
  "Delhivery Logistics Remittance Clearing A/C",
];

/* =========================================================
   ACCOUNTING LAYER (LAYER 14)
   Handles all settlements across all customer payment methods
========================================================= */

export default function Accounting() {
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState(null);

  // Filters & Search
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals state
  const [disburseModalItem, setDisburseModalItem] = useState(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [voucherModalItem, setVoucherModalItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Single disburse form state
  const [disburseForm, setDisburseForm] = useState({
    payout_method: "Bank Transfer",
    payout_channel: DEBIT_ACCOUNTS[0],
    payout_reference: "",
    payment_gateway_fee: "0.00",
    notes: "Platform settlement disbursement",
  });

  // Batch payout form state
  const [batchForm, setBatchForm] = useState({
    batch_id: "",
    payout_method: "RazorpayX",
    payout_channel: DEBIT_ACCOUNTS[1],
    fee_per_tx: "5.00",
    notes: "Batch designer settlement cycle",
  });

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH ACCOUNTING DATA
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (selectedPaymentMethod !== "ALL") params.payment_method = selectedPaymentMethod;
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      if (selectedPayoutMethod !== "ALL") params.payout_method = selectedPayoutMethod;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [settlementsData, statsData, designersData] = await Promise.all([
        getAccountingSettlements(params).catch((err) => {
          console.error("Failed to load settlements:", err);
          return [];
        }),
        getAccountingStats().catch((err) => {
          console.error("Failed to load stats:", err);
          return null;
        }),
        getDesigners().catch(() => []),
      ]);

      setSettlements(Array.isArray(settlementsData) ? settlementsData : []);
      setStats(statsData);
      setDesigners(Array.isArray(designersData) ? designersData : []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Accounting load error:", err);
      setError("Failed to connect to Accounting engine. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPaymentMethod, selectedStatus, selectedPayoutMethod]);

  /* -------------------------------------------------------
     SEARCH FILTERING (CLIENT-SIDE BACKUP / IMMEDIATE RESPONSIVENESS)
  ------------------------------------------------------- */
  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const q = searchQuery.toLowerCase().trim();
    return settlements.filter((s) => {
      const num = (s.settlement_number || "").toLowerCase();
      const order = (s.order_number || s.orderId || "").toLowerCase();
      const brand = (s.brand_name || s.designer || "").toLowerCase();
      const sku = (s.sku || "").toLowerCase();
      const utr = (s.payout_reference || "").toLowerCase();
      const pm = (s.order_payment_method || s.payment_method || "").toLowerCase();
      return (
        num.includes(q) ||
        order.includes(q) ||
        brand.includes(q) ||
        sku.includes(q) ||
        utr.includes(q) ||
        pm.includes(q)
      );
    });
  }, [settlements, searchQuery]);

  /* -------------------------------------------------------
     SELECTION HANDLERS
  ------------------------------------------------------- */
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSettlements.length && filteredSettlements.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSettlements.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTotalAmount = useMemo(() => {
    return filteredSettlements
      .filter((s) => selectedIds.has(s.id))
      .reduce((sum, s) => sum + (Number(s.payout_amount || s.net) || 0), 0);
  }, [filteredSettlements, selectedIds]);

  /* -------------------------------------------------------
     OPEN DISBURSE MODAL
  ------------------------------------------------------- */
  const handleOpenDisburse = (item) => {
    const autoUtr = `UTR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const prefMethod = item.payout_method || "Bank Transfer";
    setDisburseForm({
      payout_method: prefMethod,
      payout_channel: DEBIT_ACCOUNTS[0],
      payout_reference: autoUtr,
      payment_gateway_fee: prefMethod === "RazorpayX" ? "5.00" : "0.00",
      notes: `Disbursement for ${item.settlement_number} (Order ${item.order_number || item.orderId})`,
    });
    setDisburseModalItem(item);
  };

  /* -------------------------------------------------------
     EXECUTE SINGLE DISBURSEMENT
  ------------------------------------------------------- */
  const handleExecuteDisburse = async (e) => {
    e.preventDefault();
    if (!disburseModalItem) return;

    try {
      setActionLoading(true);
      await disburseSettlementPayment({
        settlement_ids: [disburseModalItem.id],
        payout_method: disburseForm.payout_method,
        payout_channel: disburseForm.payout_channel,
        payout_reference: disburseForm.payout_reference,
        payment_gateway_fee: disburseForm.payment_gateway_fee,
        status: "PAID",
        notes: disburseForm.notes,
      });

      setAlert({
        type: "success",
        text: `Payout disbursed for ${disburseModalItem.settlement_number} via ${disburseForm.payout_method} (Ref: ${disburseForm.payout_reference})`,
      });
      setDisburseModalItem(null);
      loadData();
    } catch (err) {
      console.error("Disburse error:", err);
      setAlert({ type: "error", text: err.message || "Failed to disburse payment" });
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------------------------------------------
     OPEN BATCH MODAL
  ------------------------------------------------------- */
  const handleOpenBatch = () => {
    const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setBatchForm({
      batch_id: batchId,
      payout_method: "RazorpayX",
      payout_channel: DEBIT_ACCOUNTS[1],
      fee_per_tx: "5.00",
      notes: `Batch payout run for ${selectedIds.size} designer settlements`,
    });
    setIsBatchModalOpen(true);
  };

  /* -------------------------------------------------------
     EXECUTE BATCH PAYOUT
  ------------------------------------------------------- */
  const handleExecuteBatch = async (e) => {
    e.preventDefault();
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setActionLoading(true);
      const res = await batchDisbursePayments({
        settlement_ids: ids,
        batch_id: batchForm.batch_id,
        payout_method: batchForm.payout_method,
        payout_channel: batchForm.payout_channel,
        fee_per_tx: batchForm.fee_per_tx,
        notes: batchForm.notes,
      });

      setAlert({
        type: "success",
        text: `Batch ${batchForm.batch_id} processed! Disbursed ₹${res.total_payout_disbursed.toLocaleString("en-IN")} across ${res.settlements_count} settlements.`,
      });
      setIsBatchModalOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error("Batch payout error:", err);
      setAlert({ type: "error", text: err.message || "Failed to process batch payout" });
    } finally {
      setActionLoading(false);
    }
  };

  /* -------------------------------------------------------
     RECONCILE SELECTED OR ALL
  ------------------------------------------------------- */
  const handleReconcileSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      setActionLoading(true);
      await reconcileAccountingSettlements({ settlement_ids: ids });
      setAlert({
        type: "success",
        text: `Successfully reconciled ${ids.length} settlement(s) against payment gateway statement.`,
      });
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error("Reconcile error:", err);
      setAlert({ type: "error", text: err.message || "Failed to reconcile settlements" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconcileAllPaid = async () => {
    try {
      setActionLoading(true);
      const res = await reconcileAccountingSettlements({ reconcile_all_paid: true });
      setAlert({
        type: "success",
        text: `Reconciliation complete: ${res.reconciled_count} settlements matched and reconciled.`,
      });
      loadData();
    } catch (err) {
      console.error("Reconcile all error:", err);
      setAlert({ type: "error", text: err.message || "Reconciliation failed" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="ZENVE-accounting-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-accounting-header">
        <div className="ZENVE-header-left">
          <Link to="/" className="ZENVE-portal-logo" aria-label="Go to home">
            <img src={zenveLogo} alt="Zenve Fashion" />
          </Link>

          <div className="ZENVE-header-title-block">
            <Link to="/" className="ZENVE-back-link">
              <BackIcon />
              <span>ALL 15 LAYERS</span>
            </Link>

            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">15</span>
              <span>Accounting</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Finance & Payment Operations · Multi-payment settlement ledger, disbursement batches, and gateway reconciliation
            </p>
          </div>
        </div>

        <div className="ZENVE-header-right">
          <SearchBar />
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT AREA
      ===================================================== */}
      <main className="ZENVE-accounting-main">
        {/* TOAST / ALERT BANNER */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-accounting-alert ${alert.type}`}>
            <span>{alert.text}</span>
            <button
              type="button"
              className="ZENVE-alert-close"
              onClick={() => setAlert(null)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div className="ZENVE-accounting-alert error">
            <span>{error}</span>
            <button type="button" className="ZENVE-alert-close" onClick={loadData}>
              Retry
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 5 KPI METRIC CARDS
        =================================================== */}
        <section className="ZENVE-accounting-kpi-grid">
          {/* TOTAL SETTLED GMV */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Settled Inflows</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(stats?.total_settled_gmv || 0)}
            </strong>
            <span className="ZENVE-kpi-hint">
              Gross: {formatInr(stats?.gross_gmv || 0)} · Reversals: -{formatInr(stats?.reversal_deductions || 0)}
            </span>
          </div>

          {/* TOTAL DISBURSED */}
          <div className="ZENVE-kpi-card accent-green">
            <span className="ZENVE-kpi-label">Disbursed to Brands</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(stats?.total_disbursed || 0)}
            </strong>
            <span className="ZENVE-kpi-hint">
              Paid via Bank, UPI & RazorpayX
            </span>
          </div>

          {/* PENDING PAYABLE */}
          <div className="ZENVE-kpi-card accent-amber">
            <span className="ZENVE-kpi-label">Pending Payout Queue</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(stats?.pending_payable || 0)}
            </strong>
            <span className="ZENVE-kpi-hint">
              {(stats?.status_counts?.pending || 0) + (stats?.status_counts?.approved || 0)} settlements ready for release
            </span>
          </div>

          {/* ZENVE COMMISSION */}
          <div className="ZENVE-kpi-card accent-gold">
            <span className="ZENVE-kpi-label">Platform Take Rate</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(stats?.zenve_commission || 0)}
            </strong>
            <span className="ZENVE-kpi-hint">Net retained commission</span>
          </div>

          {/* GATEWAY FEES */}
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Gateway & MDR Fees</span>
            <strong className="ZENVE-kpi-value">
              {formatInr(stats?.total_gateway_fees || 0)}
            </strong>
            <span className="ZENVE-kpi-hint">Transfer & payment charges</span>
          </div>
        </section>

        {/* ===================================================
            PAYMENT METHOD DISTRIBUTION BREAKDOWN
        =================================================== */}
        <section className="ZENVE-payment-methods-strip">
          <div className="ZENVE-strip-title">
            <span>Settlement Handling by Customer Payment Gateways</span>
            <span className="ZENVE-strip-subtitle">Real-time settlement volume and counts across payment rails</span>
          </div>

          <div className="ZENVE-payment-tiles">
            {PAYMENT_METHODS.filter((m) => m.id !== "ALL").map((pm) => {
              const methodStats = stats?.payment_breakdown?.[pm.id] || { count: 0, gmv: 0, paid_count: 0 };
              const isSelected = selectedPaymentMethod === pm.id;

              return (
                <button
                  key={pm.id}
                  type="button"
                  className={`ZENVE-pm-tile ${getPaymentBadgeClass(pm.id)} ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedPaymentMethod(isSelected ? "ALL" : pm.id)}
                >
                  <div className="pm-tile-top">
                    <span className="pm-tile-name">{pm.label}</span>
                    <span className="pm-tile-count">{methodStats.count} orders</span>
                  </div>
                  <div className="pm-tile-amount">{formatInr(methodStats.gmv)}</div>
                  <div className="pm-tile-bottom">
                    <span>{methodStats.paid_count} settled</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===================================================
            ACCOUNTING SETTLEMENT LEDGER PANEL
        =================================================== */}
        <section className="ZENVE-panel-card">
          <div className="ZENVE-panel-header">
            <div className="ZENVE-panel-title-block">
              <h2 className="ZENVE-panel-title">Accounting & Settlement Ledger</h2>
              <p className="ZENVE-panel-desc">
                Complete multi-payment financial journal. Handle disbursements, generate UTR numbers, reconcile gateway receipts, and audit payouts.
              </p>
            </div>

            <div className="ZENVE-panel-actions">
              <a
                href={getAccountingExportUrl()}
                download
                className="ZENVE-btn ZENVE-btn-secondary"
                title="Download CSV Ledger"
              >
                <DownloadIcon />
                <span>Export Ledger CSV</span>
              </a>

              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-secondary"
                onClick={handleReconcileAllPaid}
                disabled={actionLoading}
                title="Auto-reconcile all paid settlements against statements"
              >
                <CheckIcon />
                <span>Reconcile All Paid</span>
              </button>

              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-secondary"
                onClick={loadData}
                disabled={loading}
                title="Refresh ledger"
              >
                <RefreshIcon />
                <span>Sync Ledger</span>
              </button>
            </div>
          </div>

          {/* CONTROLS & FILTER BAR */}
          <div className="ZENVE-accounting-controls-bar">
            {/* PAYMENT METHOD TABS */}
            <div className="ZENVE-tabs-scroll">
              <div className="ZENVE-payment-tabs">
                {PAYMENT_METHODS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`ZENVE-tab-btn ${selectedPaymentMethod === tab.id ? "active" : ""}`}
                    onClick={() => setSelectedPaymentMethod(tab.id)}
                  >
                    <span>{tab.label}</span>
                    {stats?.payment_breakdown?.[tab.id] && (
                      <span className="tab-pill">
                        {stats.payment_breakdown[tab.id].count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* SECONDARY FILTERS & SEARCH */}
            <div className="ZENVE-secondary-filters">
              <div className="ZENVE-filter-group">
                <label htmlFor="accounting-search">Search:</label>
                <input
                  id="accounting-search"
                  type="text"
                  placeholder="Filter by Settlement, Order, UTR, Brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ZENVE-input-text"
                />
              </div>

              <div className="ZENVE-filter-group">
                <label htmlFor="accounting-status-select">Status:</label>
                <select
                  id="accounting-status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="ZENVE-select"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved (Ready for Payout)</option>
                  <option value="PAID">Paid (Disbursed)</option>
                  <option value="RECONCILED">Reconciled</option>
                  <option value="REVERSED">Reversed (Returns)</option>
                </select>
              </div>

              <div className="ZENVE-filter-group">
                <label htmlFor="accounting-payout-select">Payout Rail:</label>
                <select
                  id="accounting-payout-select"
                  value={selectedPayoutMethod}
                  onChange={(e) => setSelectedPayoutMethod(e.target.value)}
                  className="ZENVE-select"
                >
                  <option value="ALL">All Payout Rails</option>
                  {PAYOUT_CHANNELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FLOATING / INLINE BATCH ACTION BAR */}
          {selectedIds.size > 0 && (
            <div className="ZENVE-batch-action-bar">
              <div className="batch-info">
                <strong>{selectedIds.size} settlements selected</strong>
                <span>Total Payout: {formatInr(selectedTotalAmount)}</span>
              </div>

              <div className="batch-buttons">
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-primary"
                  onClick={handleOpenBatch}
                >
                  Disburse Batch Payout via Payment
                </button>

                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-secondary"
                  onClick={handleReconcileSelected}
                  disabled={actionLoading}
                >
                  Mark Selected Reconciled
                </button>

                <button
                  type="button"
                  className="ZENVE-btn-text"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* SETTLEMENTS TABLE */}
          {loading ? (
            <div className="ZENVE-empty-box">
              Loading multi-payment settlement records...
            </div>
          ) : filteredSettlements.length === 0 ? (
            <div className="ZENVE-empty-box">
              No settlements found matching the selected payment method or filters.
            </div>
          ) : (
            <div className="ZENVE-table-wrap">
              <table className="ZENVE-accounting-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        aria-label="Select all settlements"
                        checked={
                          selectedIds.size === filteredSettlements.length &&
                          filteredSettlements.length > 0
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Settlement & Order</th>
                    <th>Customer Payment</th>
                    <th>Brand / Designer</th>
                    <th>Product & SKU</th>
                    <th>GMV (INR)</th>
                    <th>Take Rate</th>
                    <th>Net Payout</th>
                    <th>Payout Channel & UTR</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Payment Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettlements.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const isReversed = item.status === "REVERSED" || item.is_reversal;
                    const isPaid = item.status === "PAID";
                    const isReconciled = item.status === "RECONCILED";
                    const isApproved = item.status === "APPROVED";
                    const isPending = item.status === "PENDING";

                    const paymentMethodName = item.order_payment_method || item.payment_method || "COD";
                    const payoutMethodName = item.payout_method || "Bank Transfer";
                    const netPayout = item.payout_amount ?? item.net ?? 0;

                    return (
                      <tr key={item.id} className={isSelected ? "row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select settlement ${item.settlement_number}`}
                            checked={isSelected}
                            onChange={() => toggleSelectOne(item.id)}
                          />
                        </td>

                        {/* Settlement & Order IDs */}
                        <td>
                          <div className="cell-id-block">
                            <span className="cell-settlement-num">{item.settlement_number}</span>
                            <span className="cell-order-num">
                              Order #{item.order_number || item.orderId || "—"}
                            </span>
                            {item.batch_id && (
                              <span className="cell-batch-tag">{item.batch_id}</span>
                            )}
                          </div>
                        </td>

                        {/* Customer Payment Inflow Method */}
                        <td>
                          <div className="cell-payment-block">
                            <span className={`ZENVE-pm-badge ${getPaymentBadgeClass(paymentMethodName)}`}>
                              {paymentMethodName}
                            </span>
                            <span className="cell-payment-status">
                              {item.order_payment_status || item.payment_status || "Completed"}
                            </span>
                          </div>
                        </td>

                        {/* Brand / Designer */}
                        <td>
                          <div className="cell-designer-block">
                            <strong>{item.brand_name || item.designer || "Brand Partner"}</strong>
                            {item.designer_code && (
                              <span className="cell-sub">{item.designer_code}</span>
                            )}
                          </div>
                        </td>

                        {/* Product SKU */}
                        <td>
                          <div className="cell-sku-block">
                            <span className="sku-title">{item.product_name || "Fashion Apparel"}</span>
                            <span className="sku-code">{item.sku || "SKU-GEN"}</span>
                          </div>
                        </td>

                        {/* GMV */}
                        <td>
                          <strong className={isReversed ? "amount-negative" : ""}>
                            {formatInr(item.gmv)}
                          </strong>
                        </td>

                        {/* Take Rate & Commission */}
                        <td>
                          <div className="cell-rate-block">
                            <span>{item.takeRate ?? item.take_rate ?? 15}%</span>
                            <span className="cell-sub">
                              {formatInr(item.commission_amount ?? item.commission ?? 0)}
                            </span>
                          </div>
                        </td>

                        {/* Net Designer Payout */}
                        <td>
                          <div className="cell-payout-block">
                            <strong className={`net-val ${isReversed ? "amount-negative" : ""}`}>
                              {formatInr(netPayout)}
                            </strong>
                            {item.payment_gateway_fee > 0 && (
                              <span className="fee-hint">Fee: ₹{item.payment_gateway_fee}</span>
                            )}
                          </div>
                        </td>

                        {/* Payout Channel & UTR */}
                        <td>
                          <div className="cell-utr-block">
                            <span className="payout-method-tag">{payoutMethodName}</span>
                            {item.payout_reference ? (
                              <code className="utr-code" title={item.payout_reference}>
                                {item.payout_reference}
                              </code>
                            ) : (
                              <span className="utr-pending">UTR Pending</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`ZENVE-status-pill ${getStatusTone(item.status)}`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Payment Actions */}
                        <td>
                          <div className="cell-actions-block">
                            {/* Disburse Single */}
                            {!isReversed && !isPaid && !isReconciled && (
                              <button
                                type="button"
                                className="ZENVE-action-btn primary"
                                onClick={() => handleOpenDisburse(item)}
                              >
                                Disburse
                              </button>
                            )}

                            {/* Mark Reconciled */}
                            {isPaid && (
                              <button
                                type="button"
                                className="ZENVE-action-btn secondary"
                                onClick={async () => {
                                  try {
                                    setActionLoading(true);
                                    await reconcileAccountingSettlements({ settlement_ids: [item.id] });
                                    setAlert({ type: "success", text: `${item.settlement_number} reconciled!` });
                                    loadData();
                                  } catch (err) {
                                    setAlert({ type: "error", text: err.message });
                                  } finally {
                                    setActionLoading(false);
                                  }
                                }}
                              >
                                Reconcile
                              </button>
                            )}

                            {/* View Payment Voucher */}
                            <button
                              type="button"
                              className="ZENVE-icon-action-btn"
                              title="View Payment Voucher"
                              onClick={() => setVoucherModalItem(item)}
                            >
                              <ReceiptIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* =====================================================
          MODAL 1: DISBURSE SINGLE SETTLEMENT PAYMENT
      ===================================================== */}
      {disburseModalItem && (
        <div className="ZENVE-modal-backdrop" onClick={() => setDisburseModalItem(null)}>
          <div className="ZENVE-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ZENVE-modal-header">
              <div>
                <h3>Disburse Settlement Payment</h3>
                <p>Process designer payout for {disburseModalItem.settlement_number}</p>
              </div>
              <button
                type="button"
                className="ZENVE-modal-close"
                onClick={() => setDisburseModalItem(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleExecuteDisburse}>
              <div className="ZENVE-modal-body">
                {/* Financial Summary Card */}
                <div className="modal-finance-summary">
                  <div className="summary-col">
                    <span>Gross GMV</span>
                    <strong>{formatInr(disburseModalItem.gmv)}</strong>
                  </div>
                  <div className="summary-col">
                    <span>Zenve Commission ({disburseModalItem.takeRate ?? 15}%)</span>
                    <strong>{formatInr(disburseModalItem.commission_amount ?? disburseModalItem.commission ?? 0)}</strong>
                  </div>
                  <div className="summary-col highlight">
                    <span>Net Payable to Brand</span>
                    <strong className="text-gold">
                      {formatInr(disburseModalItem.payout_amount ?? disburseModalItem.net ?? 0)}
                    </strong>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Payout Payment Method *</label>
                    <select
                      value={disburseForm.payout_method}
                      onChange={(e) =>
                        setDisburseForm((prev) => ({
                          ...prev,
                          payout_method: e.target.value,
                          payment_gateway_fee: e.target.value === "RazorpayX" ? "5.00" : (e.target.value === "Bank Transfer" ? "0.00" : "0.00"),
                        }))
                      }
                      className="ZENVE-select"
                      required
                    >
                      {PAYOUT_CHANNELS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Debit Payout Channel / Account *</label>
                    <select
                      value={disburseForm.payout_channel}
                      onChange={(e) => setDisburseForm((prev) => ({ ...prev, payout_channel: e.target.value }))}
                      className="ZENVE-select"
                      required
                    >
                      {DEBIT_ACCOUNTS.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Reference / UTR Number *</label>
                    <input
                      type="text"
                      value={disburseForm.payout_reference}
                      onChange={(e) => setDisburseForm((prev) => ({ ...prev, payout_reference: e.target.value }))}
                      placeholder="e.g. UTR-2026-981240"
                      className="ZENVE-input-text"
                      required
                    />
                    <small className="field-hint">Auto-generated or match bank confirmation slip</small>
                  </div>

                  <div className="form-group">
                    <label>Gateway / Transfer Fee (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={disburseForm.payment_gateway_fee}
                      onChange={(e) => setDisburseForm((prev) => ({ ...prev, payment_gateway_fee: e.target.value }))}
                      className="ZENVE-input-text"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Accounting Audit Notes</label>
                    <textarea
                      rows={2}
                      value={disburseForm.notes}
                      onChange={(e) => setDisburseForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="ZENVE-textarea"
                    />
                  </div>
                </div>
              </div>

              <div className="ZENVE-modal-footer">
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-secondary"
                  onClick={() => setDisburseModalItem(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ZENVE-btn ZENVE-btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Executing Disbursement..." : "Confirm & Disburse Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 2: BATCH PAYOUT DISBURSEMENT
      ===================================================== */}
      {isBatchModalOpen && (
        <div className="ZENVE-modal-backdrop" onClick={() => setIsBatchModalOpen(false)}>
          <div className="ZENVE-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ZENVE-modal-header">
              <div>
                <h3>Bulk Batch Payout Run</h3>
                <p>Disburse {selectedIds.size} settlements simultaneously</p>
              </div>
              <button
                type="button"
                className="ZENVE-modal-close"
                onClick={() => setIsBatchModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleExecuteBatch}>
              <div className="ZENVE-modal-body">
                <div className="modal-finance-summary">
                  <div className="summary-col">
                    <span>Total Settlements</span>
                    <strong>{selectedIds.size} orders</strong>
                  </div>
                  <div className="summary-col highlight">
                    <span>Total Payout to Release</span>
                    <strong className="text-gold">{formatInr(selectedTotalAmount)}</strong>
                  </div>
                </div>

                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Batch Reference ID *</label>
                    <input
                      type="text"
                      value={batchForm.batch_id}
                      onChange={(e) => setBatchForm((prev) => ({ ...prev, batch_id: e.target.value }))}
                      className="ZENVE-input-text"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Batch Payment Rail *</label>
                    <select
                      value={batchForm.payout_method}
                      onChange={(e) => setBatchForm((prev) => ({ ...prev, payout_method: e.target.value }))}
                      className="ZENVE-select"
                      required
                    >
                      <option value="RazorpayX">RazorpayX Smart Batch API</option>
                      <option value="Bank Transfer">NEFT / RTGS Bulk File</option>
                      <option value="UPI">UPI Multi-Payout</option>
                      <option value="Escrow Release">Escrow Batch Release</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Funding Account *</label>
                    <select
                      value={batchForm.payout_channel}
                      onChange={(e) => setBatchForm((prev) => ({ ...prev, payout_channel: e.target.value }))}
                      className="ZENVE-select"
                      required
                    >
                      {DEBIT_ACCOUNTS.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Est. Fee Per Transaction (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={batchForm.fee_per_tx}
                      onChange={(e) => setBatchForm((prev) => ({ ...prev, fee_per_tx: e.target.value }))}
                      className="ZENVE-input-text"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Batch Notes</label>
                    <input
                      type="text"
                      value={batchForm.notes}
                      onChange={(e) => setBatchForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="ZENVE-input-text"
                    />
                  </div>
                </div>
              </div>

              <div className="ZENVE-modal-footer">
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-secondary"
                  onClick={() => setIsBatchModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ZENVE-btn ZENVE-btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing Batch..." : `Execute Batch (${formatInr(selectedTotalAmount)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 3: PAYMENT VOUCHER / AUDIT RECEIPT
      ===================================================== */}
      {voucherModalItem && (
        <div className="ZENVE-modal-backdrop" onClick={() => setVoucherModalItem(null)}>
          <div className="ZENVE-modal-card voucher-card" onClick={(e) => e.stopPropagation()}>
            <div className="voucher-header">
              <div className="voucher-brand">
                <img src={zenveLogo} alt="Zenve Fashion" height={32} />
                <span className="voucher-tag">OFFICIAL SETTLEMENT PAYMENT VOUCHER</span>
              </div>
              <button
                type="button"
                className="ZENVE-modal-close"
                onClick={() => setVoucherModalItem(null)}
              >
                ×
              </button>
            </div>

            <div className="voucher-body">
              <div className="voucher-meta-row">
                <div>
                  <span className="meta-label">Settlement #</span>
                  <span className="meta-val">{voucherModalItem.settlement_number}</span>
                </div>
                <div>
                  <span className="meta-label">Order #</span>
                  <span className="meta-val">{voucherModalItem.order_number || voucherModalItem.orderId}</span>
                </div>
                <div>
                  <span className="meta-label">Date Generated</span>
                  <span className="meta-val">
                    {voucherModalItem.created_at
                      ? new Date(voucherModalItem.created_at).toLocaleDateString("en-IN")
                      : "Current"}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Status</span>
                  <span className={`ZENVE-status-pill ${getStatusTone(voucherModalItem.status)}`}>
                    {voucherModalItem.status}
                  </span>
                </div>
              </div>

              {/* Inflow vs Outflow Section */}
              <div className="voucher-section-title">1. Customer Inflow Payment</div>
              <div className="voucher-detail-grid">
                <div>
                  <span className="detail-lbl">Customer Payment Method:</span>
                  <span className={`ZENVE-pm-badge ${getPaymentBadgeClass(voucherModalItem.order_payment_method || voucherModalItem.payment_method)}`}>
                    {voucherModalItem.order_payment_method || voucherModalItem.payment_method || "COD"}
                  </span>
                </div>
                <div>
                  <span className="detail-lbl">Payment Status:</span>
                  <span className="detail-val">{voucherModalItem.order_payment_status || "Paid"}</span>
                </div>
                <div>
                  <span className="detail-lbl">Customer Name:</span>
                  <span className="detail-val">{voucherModalItem.customer_name || "Valued Client"}</span>
                </div>
                <div>
                  <span className="detail-lbl">Realised GMV:</span>
                  <strong className="detail-val">{formatInr(voucherModalItem.gmv)}</strong>
                </div>
              </div>

              <div className="voucher-section-title">2. Platform Commission & Deductions</div>
              <div className="voucher-detail-grid">
                <div>
                  <span className="detail-lbl">Zenve Take Rate:</span>
                  <span className="detail-val">{voucherModalItem.takeRate ?? 15}%</span>
                </div>
                <div>
                  <span className="detail-lbl">Commission Retained:</span>
                  <span className="detail-val">{formatInr(voucherModalItem.commission_amount ?? voucherModalItem.commission ?? 0)}</span>
                </div>
                <div>
                  <span className="detail-lbl">Tax / GST:</span>
                  <span className="detail-val">{formatInr(voucherModalItem.tax_amount || 0)}</span>
                </div>
                <div>
                  <span className="detail-lbl">Gateway Fee:</span>
                  <span className="detail-val">₹{voucherModalItem.payment_gateway_fee || 0}</span>
                </div>
              </div>

              <div className="voucher-section-title">3. Designer Outflow Disbursement</div>
              <div className="voucher-detail-grid">
                <div>
                  <span className="detail-lbl">Beneficiary Brand:</span>
                  <strong className="detail-val">{voucherModalItem.brand_name || voucherModalItem.designer}</strong>
                </div>
                <div>
                  <span className="detail-lbl">Net Disbursed Amount:</span>
                  <strong className="detail-val text-gold">
                    {formatInr(voucherModalItem.payout_amount ?? voucherModalItem.net ?? 0)}
                  </strong>
                </div>
                <div>
                  <span className="detail-lbl">Payout Channel Rail:</span>
                  <span className="detail-val">{voucherModalItem.payout_method || "Bank Transfer"}</span>
                </div>
                <div>
                  <span className="detail-lbl">Payment Reference / UTR:</span>
                  <code className="utr-code">{voucherModalItem.payout_reference || "Pending Disbursement"}</code>
                </div>
              </div>

              {voucherModalItem.notes && (
                <div className="voucher-notes">
                  <span className="detail-lbl">Audit Trail & Notes:</span>
                  <p>{voucherModalItem.notes}</p>
                </div>
              )}
            </div>

            <div className="ZENVE-modal-footer">
              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-secondary"
                onClick={() => window.print()}
              >
                Print Voucher
              </button>
              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-primary"
                onClick={() => setVoucherModalItem(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
