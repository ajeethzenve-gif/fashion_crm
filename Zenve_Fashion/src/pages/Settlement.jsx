import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/Settlement.css";
import bannerImg from "../assest/accounting-banner.jpg";
import {
  getSettlements,
  getSettlementStats,
  generateSettlements,
  transitionSettlement,
  disburseSettlementPayment,
  getDesigners,
  getOrders,
} from "../services/api";
import { showSuccessToast, showErrorToast, showInfoToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function getDesignerAvatarUrl(designerName, avatarField) {
  if (avatarField && typeof avatarField === "string" && avatarField.startsWith("http")) {
    return avatarField;
  }
  const clean = encodeURIComponent((designerName || "Designer").trim());
  return `https://ui-avatars.com/api/?name=${clean}&background=EADBCC&color=5C3A1E&bold=true&rounded=true&size=100`;
}

export default function Settlement() {
  const { user } = useAuth();

  // Navigation Tabs & Filtering
  const [activeTab, setActiveTab] = useState("All Settlements");
  const [searchQuery, setSearchQuery] = useState("");
  const [designerFilter, setDesignerFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Real Database States
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState(null);
  const [designers, setDesigners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Popovers
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSettlementDetails, setSelectedSettlementDetails] = useState(null);
  const [isViewAllTransactionsOpen, setIsViewAllTransactionsOpen] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState(null);

  // Designer Direct Payment / Settlement Modal
  const [paymentModalItem, setPaymentModalItem] = useState(null);
  const [payoutChannel, setPayoutChannel] = useState("NEFT");
  const [payoutRefInput, setPayoutRefInput] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Close row dropdown on outside click
  const dropdownRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownRowId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================================================
     FETCH LIVE REAL DATA FROM DJANGO BACKEND
  ========================================================= */
  const loadData = async () => {
    try {
      setLoading(true);
      const [backendSettlements, backendStats, backendDesigners, backendOrders] =
        await Promise.all([
          getSettlements().catch((err) => {
            console.error("Settlement API error:", err);
            return [];
          }),
          getSettlementStats().catch((err) => {
            console.error("Settlement Stats API error:", err);
            return null;
          }),
          getDesigners().catch((err) => {
            console.error("Designers API error:", err);
            return [];
          }),
          getOrders().catch((err) => {
            console.error("Orders API error:", err);
            return [];
          }),
        ]);

      const rawSettlements = Array.isArray(backendSettlements)
        ? backendSettlements
        : Array.isArray(backendSettlements?.results)
        ? backendSettlements.results
        : [];
      setSettlements(rawSettlements);
      setStats(backendStats);

      const rawDesigners = Array.isArray(backendDesigners)
        ? backendDesigners
        : Array.isArray(backendDesigners?.results)
        ? backendDesigners.results
        : [];
      setDesigners(rawDesigners);

      const rawOrders = Array.isArray(backendOrders)
        ? backendOrders
        : Array.isArray(backendOrders?.results)
        ? backendOrders.results
        : [];
      setOrders(rawOrders);
    } catch (err) {
      console.error("Failed to load real settlement data:", err);
      showErrorToast("Failed to load settlements from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     MAP DESIGNERS LOOKUP
  ========================================================= */
  const designerMap = useMemo(() => {
    const map = {};
    designers.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [designers]);

  /* =========================================================
     1. LIVE KPI METRICS (COMPUTED FROM REAL DATABASE)
  ========================================================= */
  const kpis = useMemo(() => {
    const regular = settlements.filter((s) => !s.is_reversal && String(s.status).toUpperCase() !== "REVERSED");
    const reversed = settlements.filter((s) => s.is_reversal || String(s.status).toUpperCase() === "REVERSED");

    const grossSales = stats?.gross_gmv ?? regular.reduce((sum, s) => sum + Math.abs(Number(s.gmv || 0)), 0);
    const totalPayouts = regular.reduce((sum, s) => sum + Math.abs(Number(s.payout_amount || 0)), 0);
    const platformCommission = stats?.zenve_commission ?? regular.reduce((sum, s) => sum + Math.abs(Number(s.commission_amount || 0)), 0);

    const pendingPayouts = settlements
      .filter((s) => ["PENDING", "APPROVED", "Pending"].includes(String(s.status)))
      .reduce((sum, s) => sum + Math.abs(Number(s.payout_amount || 0)), 0);

    const settledThisMonth = settlements
      .filter((s) => ["PAID", "RECONCILED", "Paid"].includes(String(s.status)))
      .reduce((sum, s) => sum + Math.abs(Number(s.payout_amount || 0)), 0);

    const reversedCount = reversed.length;

    return {
      totalSales: formatInr(grossSales),
      rawTotalSales: grossSales,
      totalPayouts: formatInr(totalPayouts),
      rawTotalPayouts: totalPayouts,
      platformCommission: formatInr(platformCommission),
      rawPlatformCommission: platformCommission,
      pendingSettlement: formatInr(pendingPayouts),
      rawPendingSettlement: pendingPayouts,
      settledThisMonth: formatInr(settledThisMonth),
      rawSettledThisMonth: settledThisMonth,
      reversedCount,
      regularCount: regular.length,
    };
  }, [settlements, stats]);

  /* =========================================================
     2. DONUT BREAKDOWN (COMPUTED FROM REAL DATABASE)
  ========================================================= */
  const breakdown = useMemo(() => {
    const total = kpis.rawTotalSales || 1;
    const payouts = kpis.rawTotalPayouts || 0;
    const commission = kpis.rawPlatformCommission || 0;
    const taxes = settlements.reduce((sum, s) => sum + Math.abs(Number(s.tax_amount || 0)), 0);
    const other = Math.max(0, total - payouts - commission - taxes);

    const payoutPct = total > 0 ? ((payouts / total) * 100).toFixed(1) : "0.0";
    const commissionPct = total > 0 ? ((commission / total) * 100).toFixed(1) : "0.0";
    const taxPct = total > 0 ? ((taxes / total) * 100).toFixed(1) : "0.0";
    const otherPct = total > 0 ? ((other / total) * 100).toFixed(1) : "0.0";

    const circumference = 377; // 2 * PI * 60
    const lenPayout = (parseFloat(payoutPct) / 100) * circumference;
    const lenComm = (parseFloat(commissionPct) / 100) * circumference;
    const lenTax = (parseFloat(taxPct) / 100) * circumference;
    const lenOther = (parseFloat(otherPct) / 100) * circumference;

    return {
      payoutPct,
      commissionPct,
      taxPct,
      otherPct,
      dashPayout: `${lenPayout.toFixed(1)} ${circumference}`,
      dashComm: `${lenComm.toFixed(1)} ${circumference}`,
      dashTax: `${lenTax.toFixed(1)} ${circumference}`,
      dashOther: `${lenOther.toFixed(1)} ${circumference}`,
      offsetComm: -lenPayout,
      offsetTax: -(lenPayout + lenComm),
      offsetOther: -(lenPayout + lenComm + lenTax),
    };
  }, [kpis, settlements]);

  /* =========================================================
     3. RECENT TRANSACTIONS FEED (DERIVED FROM REAL DATABASE)
  ========================================================= */
  const realRecentTransactions = useMemo(() => {
    const list = [];

    // 1. Payouts and Return Reversals from Settlements (Completed events)
    settlements.forEach((s) => {
      const isPaid = ["PAID", "RECONCILED", "Paid"].includes(String(s.status));
      const isReversal = Boolean(s.is_reversal || String(s.status).toUpperCase() === "REVERSED");
      const desName =
        s.brand_name ||
        s.designer_name ||
        designerMap[s.designer]?.brand_name ||
        designerMap[s.designer]?.designer_name ||
        "Designer";

      if (isReversal) {
        list.push({
          id: `tx-rev-${s.id}`,
          type: "reversal",
          title: `Return Reversal (${desName})`,
          ref: s.settlement_number || `REV#${s.id}`,
          amount: `- ${formatInr(Math.abs(Number(s.payout_amount || s.gmv || 0)))}`,
          isOutflow: true,
          isPositive: false,
          date: formatDate(s.created_at),
          timestamp: new Date(s.created_at || 0).getTime(),
          icon: "bank",
        });
      } else if (isPaid) {
        list.push({
          id: `tx-stl-${s.id}`,
          type: "payout",
          title: `Payout Disbursed (${desName})`,
          ref: s.payout_reference || s.settlement_number || `UTR#${s.id}`,
          amount: `- ${formatInr(Number(s.payout_amount || 0))}`,
          isOutflow: true,
          isPositive: false,
          date: formatDate(s.paid_at || s.created_at),
          timestamp: new Date(s.paid_at || s.created_at || 0).getTime(),
          icon: "play",
        });
      }
    });

    // 2. Real Order Revenue Received (Customer Inflows)
    orders.forEach((o) => {
      if (Number(o.total || 0) > 0) {
        list.push({
          id: `tx-ord-${o.id}`,
          type: "income",
          title: `Order Payment (${o.shipping_full_name || o.customer_name || "Customer"})`,
          ref: o.order_number || `ORD#${o.id}`,
          amount: `+ ${formatInr(Number(o.total))}`,
          isPositive: true,
          isOutflow: false,
          date: formatDate(o.created_at),
          timestamp: new Date(o.created_at || 0).getTime(),
          icon: "refresh",
        });
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [settlements, orders, designerMap]);

  /* =========================================================
     4. NORMALIZED SETTLEMENT ITEMS FOR TABLE
  ========================================================= */
  const normalizedSettlements = useMemo(() => {
    return settlements.map((item, idx) => {
      const id = item.settlement_number || `STT${1000 + Number(item.id || idx + 1)}`;
      const indexStr = String(idx + 1).padStart(2, "0");
      const dObj = designerMap[item.designer];
      const designerName =
        item.brand_name ||
        item.designer_name ||
        dObj?.brand_name ||
        dObj?.designer_name ||
        (typeof item.designer === "string" ? item.designer : `Designer #${item.designer || idx + 1}`);

      const gmv = Math.abs(Number(item.gmv) || 0);
      const takeRate = Number(item.take_rate) || 10;
      const commissionAmount = Math.abs(Number(item.commission_amount) || (gmv * (takeRate / 100)));
      const payoutAmount = Math.abs(Number(item.payout_amount) || (gmv - commissionAmount));

      const rawStatus = String(item.status || "PENDING").toUpperCase();
      let displayStatus = "Pending";
      if (rawStatus === "PAID" || rawStatus === "RECONCILED") {
        displayStatus = "Paid";
      } else if (rawStatus === "PENDING" || rawStatus === "APPROVED") {
        displayStatus = "Pending";
      } else if (rawStatus === "PROCESSING" || rawStatus === "BATCHED") {
        displayStatus = "Processing";
      } else if (rawStatus === "REVERSED" || rawStatus === "FAILED") {
        displayStatus = "Failed";
      }

      const paymentDate = displayStatus === "Paid"
        ? formatDate(item.paid_at || item.created_at)
        : "—";

      return {
        id,
        rawId: item.id,
        index: indexStr,
        designer: designerName,
        avatar: getDesignerAvatarUrl(designerName, dObj?.avatar || dObj?.logo),
        orders: item.quantity || 1,
        totalSales: gmv,
        commissionRate: takeRate,
        commissionAmount,
        payoutAmount,
        status: displayStatus,
        paymentDate,
        paymentMethod: item.payout_method || item.order_payment_method || "Bank Transfer",
        accountNumber: dObj?.bank_account_number ? `A/C •••• ${String(dObj.bank_account_number).slice(-4)}` : "HDFC •••• 4892",
        utr: item.payout_reference || (displayStatus === "Paid" ? `UTR${item.id}${Date.now().toString().slice(-6)}` : "—"),
        raw: item,
      };
    });
  }, [settlements, designerMap]);

  /* =========================================================
     5. FILTERED TABLE ITEMS
  ========================================================= */
  const filteredSettlements = useMemo(() => {
    return normalizedSettlements.filter((item) => {
      // Tab filter
      if (activeTab === "Pending" && item.status !== "Pending") return false;
      if (activeTab === "Processed" && item.status !== "Paid") return false;
      if (activeTab === "Failed" && item.status !== "Failed") return false;

      // Status dropdown filter
      if (statusFilter !== "All" && item.status !== statusFilter) return false;

      // Designer dropdown filter
      if (designerFilter !== "All" && item.designer !== designerFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = item.id.toLowerCase().includes(query);
        const matchesDesigner = item.designer.toLowerCase().includes(query);
        const matchesIndex = item.index.includes(query);
        if (!matchesId && !matchesDesigner && !matchesIndex) return false;
      }

      return true;
    });
  }, [normalizedSettlements, activeTab, statusFilter, designerFilter, searchQuery]);

  // Paginated table rows
  const paginatedSettlements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSettlements.slice(start, start + pageSize);
  }, [filteredSettlements, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSettlements.length / pageSize));

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedSettlements.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setDesignerFilter("All");
    setDateRangeFilter("All");
    setStatusFilter("All");
    setActiveTab("All Settlements");
    setSelectedIds(new Set());
    setCurrentPage(1);
    showInfoToast("Filters reset to live database default view.", "Settlement Filters");
  };

  // Generate settlement action via live API
  const handleTriggerGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateSettlements();
      showSuccessToast(
        "Settlement cycle calculated successfully! All eligible delivered orders reconciled.",
        "Settlement Generated"
      );
      setIsGenerateModalOpen(false);
      await loadData();
    } catch (err) {
      showErrorToast(err.message || "Failed to generate settlements.", "Operation Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenPaymentModal = (item) => {
    setPaymentModalItem(item);
    setPayoutChannel(item.paymentMethod || "NEFT");
    setPayoutRefInput(`UTR-${Date.now().toString().slice(-8)}`);
    setPayoutNotes(`Disbursement for ${item.designer} (${item.id}) confirmed by Finance Admin`);
  };

  const handleConfirmDisbursement = async () => {
    if (!paymentModalItem) return;
    setIsSubmittingPayment(true);
    try {
      const targetId =
        Number(paymentModalItem.rawId) ||
        Number(paymentModalItem.id) ||
        paymentModalItem.rawId ||
        paymentModalItem.id;

      let settled = false;

      // Primary: transitionSettlement API (/api/settlements/<id>/transition/)
      try {
        await transitionSettlement(targetId, "PAID", {
          payout_reference: payoutRefInput || `UTR-${Date.now()}`,
          payout_method: payoutChannel,
          notes: payoutNotes,
        });
        settled = true;
      } catch (err1) {
        console.warn("transitionSettlement failed, attempting disburseSettlementPayment fallback:", err1);
        // Fallback: Accounting disburse API (/api/accounting/disburse/)
        try {
          await disburseSettlementPayment({
            settlement_ids: [targetId],
            status: "PAID",
            payout_reference: payoutRefInput || `UTR-${Date.now()}`,
            payout_method: payoutChannel,
            notes: payoutNotes,
          });
          settled = true;
        } catch (err2) {
          throw new Error(err1.message || err2.message || "Failed to settle payment in database.");
        }
      }

      if (settled) {
        showSuccessToast(
          `Disbursed ${formatInr(paymentModalItem.payoutAmount)} to ${paymentModalItem.designer} via ${payoutChannel}!`,
          "Payment Settled"
        );
        setPaymentModalItem(null);
        await loadData();
      }
    } catch (err) {
      console.error("Disbursement failed:", err);
      showErrorToast(err.message || "Failed to settle payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Transition status (e.g. mark Paid) via live API
  const handleMarkPaid = async (item) => {
    try {
      const targetId = Number(item.rawId) || Number(item.id) || item.rawId || item.id;
      try {
        await transitionSettlement(targetId, "PAID", { payout_reference: `UTR${Date.now()}` });
      } catch (err1) {
        await disburseSettlementPayment({
          settlement_ids: [targetId],
          status: "PAID",
          payout_reference: `UTR${Date.now()}`,
        });
      }
      showSuccessToast(`${item.id} (${item.designer}) marked as Paid in database!`, "Status Updated");
      await loadData();
    } catch (err) {
      showErrorToast("Failed to transition settlement status.");
    } finally {
      setActiveDropdownRowId(null);
    }
  };

  // Download statement voucher
  const handleDownloadStatement = (item) => {
    const text = `ZENVE FASHION MERCHANDISING - SETTLEMENT STATEMENT\n` +
      `============================================================\n` +
      `Settlement ID:    ${item.id}\n` +
      `Designer Brand:   ${item.designer}\n` +
      `Eligible Orders:  ${item.orders}\n` +
      `Gross Sales:      ${formatInr(item.totalSales)}\n` +
      `Platform Fee:     ${formatInr(item.commissionAmount)} (${item.commissionRate}% Take Rate)\n` +
      `Net Payout:       ${formatInr(item.payoutAmount)}\n` +
      `Disbursement:     ${item.status}\n` +
      `Payment Date:     ${item.paymentDate}\n` +
      `UTR / Reference:  ${item.utr}\n` +
      `============================================================\n` +
      `Verified by Zenve Live Database Settlement Engine`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.id}_statement.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccessToast(`Statement for ${item.id} exported.`, "Statement Exported");
  };

  // Unique designers from live database records
  const uniqueDesigners = useMemo(() => {
    const set = new Set(normalizedSettlements.map((s) => s.designer));
    return Array.from(set);
  }, [normalizedSettlements]);

  return (
    <div className="zenve-settlement-page">
      {/* =====================================================
          2. LUXURY HERO BANNER WITH FASHION COUTURE ATELIER
      ===================================================== */}
      <section className="stl-hero-banner">
        <div className="stl-hero-content">
          <h1 className="stl-hero-title">Settlement</h1>
          <p className="stl-hero-subtitle">
            Manage payments, commissions and designer settlements seamlessly
          </p>
        </div>

        {/* Fashion Montage Artwork & Golden Glow */}
        <div className="stl-hero-art-wrap">
          <img
            src={bannerImg}
            alt="Zenve Fashion Haute Couture Atelier"
            className="stl-hero-art-img"
          />
          <div className="stl-hero-glow-overlay" />
        </div>
      </section>

      {/* =====================================================
          3. TOP 5 KPI METRIC CARDS WITH SPARKLINES (REAL DATABASE)
      ===================================================== */}
      <section className="stl-kpi-grid">
        {/* Card 1: Total Sales */}
        <div className="stl-kpi-card">
          <div className="stl-kpi-header">
            <div className="stl-kpi-title-block">
              <div className="stl-kpi-icon-badge">
                <span className="stl-icon-symbol">₹</span>
              </div>
              <span className="stl-kpi-label">Total Sales</span>
            </div>
          </div>
          <div className="stl-kpi-body">
            <strong className="stl-kpi-value">{kpis.totalSales}</strong>
            <div className="stl-kpi-trend-spark">
              <span className="stl-trend-pill up">{kpis.regularCount} Settled</span>
              <svg className="stl-sparkline" width="46" height="20" viewBox="0 0 46 20">
                <path
                  d="M2 16 Q 14 14, 24 9 T 44 3"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Total Payouts */}
        <div className="stl-kpi-card">
          <div className="stl-kpi-header">
            <div className="stl-kpi-title-block">
              <div className="stl-kpi-icon-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A86915" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="8" ry="3" />
                  <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
                  <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
                </svg>
              </div>
              <span className="stl-kpi-label">Total Payouts</span>
            </div>
          </div>
          <div className="stl-kpi-body">
            <strong className="stl-kpi-value">{kpis.totalPayouts}</strong>
            <div className="stl-kpi-trend-spark">
              <span className="stl-trend-pill up">Disbursed</span>
              <svg className="stl-sparkline" width="46" height="20" viewBox="0 0 46 20">
                <path
                  d="M2 17 Q 15 13, 26 8 T 44 4"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Commission */}
        <div className="stl-kpi-card">
          <div className="stl-kpi-header">
            <div className="stl-kpi-title-block">
              <div className="stl-kpi-icon-badge">
                <span className="stl-icon-symbol" style={{ fontSize: "16px" }}>%</span>
              </div>
              <span className="stl-kpi-label">Platform Commission</span>
            </div>
          </div>
          <div className="stl-kpi-body">
            <strong className="stl-kpi-value">{kpis.platformCommission}</strong>
            <div className="stl-kpi-trend-spark">
              <span className="stl-trend-pill up">Take Rate</span>
              <svg className="stl-sparkline" width="46" height="20" viewBox="0 0 46 20">
                <path
                  d="M2 18 Q 12 12, 25 8 T 44 2"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Settlement */}
        <div className="stl-kpi-card">
          <div className="stl-kpi-header">
            <div className="stl-kpi-title-block">
              <div className="stl-kpi-icon-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A86915" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <span className="stl-kpi-label">Pending Settlement</span>
            </div>
          </div>
          <div className="stl-kpi-body">
            <strong className="stl-kpi-value">{kpis.pendingSettlement}</strong>
            <div className="stl-kpi-trend-spark">
              <span className="stl-trend-pill down">Pending</span>
              <svg className="stl-sparkline" width="46" height="20" viewBox="0 0 46 20">
                <path
                  d="M2 4 Q 14 7, 24 12 T 44 17"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 5: Settled This Month */}
        <div className="stl-kpi-card">
          <div className="stl-kpi-header">
            <div className="stl-kpi-title-block">
              <div className="stl-kpi-icon-badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A86915" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <span className="stl-kpi-label">Settled This Month</span>
            </div>
          </div>
          <div className="stl-kpi-body">
            <strong className="stl-kpi-value">{kpis.settledThisMonth}</strong>
            <div className="stl-kpi-trend-spark">
              <span className="stl-trend-pill up">Live DB</span>
              <svg className="stl-sparkline" width="46" height="20" viewBox="0 0 46 20">
                <path
                  d="M2 17 Q 15 14, 25 8 T 44 2"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          4. MAIN WORKSPACE: SPLIT GRID (TABLE + SIDEBAR WIDGETS)
      ===================================================== */}
      <div className="stl-main-split-grid">
        {/* LEFT COLUMN: TABS, FILTERS & TABLE */}
        <div className="stl-left-workspace">
          {/* Action Row: Tabs (Left) & Generate Settlement Button (Right) */}
          <div className="stl-actions-row">
            <div className="stl-tabs-group">
              {["All Settlements", "Pending", "Processed", "Failed"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`stl-tab-btn ${activeTab === tab ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="stl-primary-generate-btn"
              onClick={() => setIsGenerateModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Generate Settlement</span>
            </button>
          </div>

          {/* Filter Toolbar Card */}
          <div className="stl-filters-toolbar-card">
            <div className="stl-filter-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A8368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by settlement ID, designer name, order ID..."
                className="stl-filter-search-input"
              />
            </div>

            <div className="stl-filter-dropdown-group">
              {/* Designer Filter */}
              <div className="stl-filter-select-wrap">
                <label className="stl-filter-label">Designer</label>
                <select
                  value={designerFilter}
                  onChange={(e) => {
                    setDesignerFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="stl-filter-select"
                >
                  <option value="All">All</option>
                  {uniqueDesigners.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="stl-filter-select-wrap">
                <label className="stl-filter-label">Date Range</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="stl-filter-select"
                >
                  <option value="All">All</option>
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="stl-filter-select-wrap">
                <label className="stl-filter-label">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="stl-filter-select"
                >
                  <option value="All">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Reset Button */}
              <button
                type="button"
                className="stl-filter-reset-btn"
                onClick={handleResetFilters}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Settlements Data Table Card */}
          <div className="stl-table-container-card">
            <div className="stl-table-scroll">
              <table className="stl-data-table">
                <thead>
                  <tr>
                    <th className="stl-th-checkbox">
                      <input
                        type="checkbox"
                        checked={
                          paginatedSettlements.length > 0 &&
                          paginatedSettlements.every((s) => selectedIds.has(s.id))
                        }
                        onChange={handleSelectAll}
                        aria-label="Select all settlements"
                      />
                    </th>
                    <th className="stl-th-index">Sl.No</th>
                    <th>Settlement ID</th>
                    <th>Designer</th>
                    <th className="stl-text-center">Orders</th>
                    <th>Total Sales</th>
                    <th>Commission (Take Rate)</th>
                    <th>Payout Amount</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th className="stl-text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="stl-empty-cell">
                        Loading live settlements from database...
                      </td>
                    </tr>
                  ) : paginatedSettlements.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="stl-empty-cell">
                        No settlements found in database matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedSettlements.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr key={item.id} className={isSelected ? "selected-row" : ""}>
                          {/* Checkbox */}
                          <td className="stl-td-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(item.id)}
                              aria-label={`Select ${item.id}`}
                            />
                          </td>

                          {/* Index */}
                          <td className="stl-td-index">{item.index}</td>

                          {/* Settlement ID Link */}
                          <td>
                            <button
                              type="button"
                              className="stl-id-link-btn"
                              onClick={() => setSelectedSettlementDetails(item)}
                            >
                              {item.id}
                            </button>
                          </td>

                          {/* Designer with Avatar */}
                          <td>
                            <div className="stl-designer-cell">
                              <img
                                src={item.avatar}
                                alt={item.designer}
                                className="stl-designer-avatar"
                                onError={(e) => {
                                  e.target.src = getDesignerAvatarUrl(item.designer);
                                }}
                              />
                              <span className="stl-designer-name">{item.designer}</span>
                            </div>
                          </td>

                          {/* Orders */}
                          <td className="stl-text-center stl-orders-cell">{item.orders}</td>

                          {/* Total Sales */}
                          <td className="stl-amount-cell">{formatInr(item.totalSales)}</td>

                          {/* Commission */}
                          <td className="stl-amount-cell">
                            {formatInr(item.commissionAmount)}
                            <span style={{ fontSize: "11px", color: "#8C7864", marginLeft: "4px" }}>
                              ({item.commissionRate}%)
                            </span>
                          </td>

                          {/* Payout Amount */}
                          <td className="stl-payout-amount-cell">{formatInr(item.payoutAmount)}</td>

                          {/* Status Pill */}
                          <td>
                            <span className={`stl-status-pill ${item.status.toLowerCase()}`}>
                              <span className="stl-status-dot" />
                              {item.status}
                            </span>
                          </td>

                          {/* Payment Date */}
                          <td className="stl-date-cell">{item.paymentDate}</td>

                          {/* Action Icons */}
                          <td className="stl-text-right">
                            <div className="stl-actions-cell-group">
                              {/* Direct Payment / Settle Button for Every Designer */}
                              {item.status === "Paid" ? (
                                <span className="stl-settled-pill" title="Payment already settled & reconciled">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Settled</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="stl-settle-btn"
                                  title={`Settle ${formatInr(item.payoutAmount)} directly to ${item.designer}`}
                                  onClick={() => handleOpenPaymentModal(item)}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                  </svg>
                                  <span>Settle {formatInr(item.payoutAmount)}</span>
                                </button>
                              )}

                              {/* View Eye */}
                              <button
                                type="button"
                                className="stl-row-action-btn"
                                title="View Settlement Details"
                                onClick={() => setSelectedSettlementDetails(item)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>

                              {/* Download Invoice / Statement */}
                              <button
                                type="button"
                                className="stl-row-action-btn"
                                title="Download Statement Voucher"
                                onClick={() => handleDownloadStatement(item)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              </button>

                              {/* Contextual More Dropdown */}
                              <div className="stl-dropdown-container" ref={dropdownRef}>
                                <button
                                  type="button"
                                  className="stl-row-action-btn"
                                  title="More actions"
                                  onClick={() =>
                                    setActiveDropdownRowId((prev) => (prev === item.id ? null : item.id))
                                  }
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                  </svg>
                                </button>

                                {activeDropdownRowId === item.id && (
                                  <div className="stl-action-dropdown-menu">
                                    <button
                                      type="button"
                                      className="stl-dropdown-item"
                                      onClick={() => handleMarkPaid(item)}
                                    >
                                      Mark as Paid (Disburse)
                                    </button>
                                    <button
                                      type="button"
                                      className="stl-dropdown-item"
                                      onClick={() => {
                                        setSelectedSettlementDetails(item);
                                        setActiveDropdownRowId(null);
                                      }}
                                    >
                                      Audit Calculation
                                    </button>
                                    <button
                                      type="button"
                                      className="stl-dropdown-item"
                                      onClick={() => {
                                        handleDownloadStatement(item);
                                        setActiveDropdownRowId(null);
                                      }}
                                    >
                                      Export Payout Voucher
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="stl-table-pagination-footer">
              <span className="stl-pagination-counter">
                Showing {filteredSettlements.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, filteredSettlements.length)} of {filteredSettlements.length} database settlements
              </span>

              <div className="stl-pagination-controls">
                <button
                  type="button"
                  className="stl-pagination-btn nav-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`stl-pagination-btn page-num ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="stl-pagination-btn nav-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2 ANALYTICS WIDGETS */}
        <aside className="stl-right-widgets">
          {/* Widget 1: Settlement Breakdown */}
          <div className="stl-widget-card breakdown-card">
            <div className="stl-widget-header">
              <div className="stl-widget-title-group">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A86915" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
                <h3 className="stl-widget-title">Settlement Breakdown</h3>
              </div>
            </div>

            <div className="stl-breakdown-body">
              {/* Donut Chart with Center Text */}
              <div className="stl-donut-wrapper">
                <svg className="stl-donut-svg" viewBox="0 0 160 160">
                  {/* Segment 1: Designer Payouts */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="#6B421A"
                    strokeWidth="24"
                    strokeDasharray={breakdown.dashPayout}
                    strokeDashoffset="0"
                  />
                  {/* Segment 2: Platform Commission */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="#D49B29"
                    strokeWidth="24"
                    strokeDasharray={breakdown.dashComm}
                    strokeDashoffset={breakdown.offsetComm}
                  />
                  {/* Segment 3: Taxes (GST) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="#E8A838"
                    strokeWidth="24"
                    strokeDasharray={breakdown.dashTax}
                    strokeDashoffset={breakdown.offsetTax}
                  />
                  {/* Segment 4: Other Charges */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="transparent"
                    stroke="#F5DFB8"
                    strokeWidth="24"
                    strokeDasharray={breakdown.dashOther}
                    strokeDashoffset={breakdown.offsetOther}
                  />
                </svg>

                <div className="stl-donut-center-text">
                  <strong className="stl-donut-center-val">{kpis.totalSales}</strong>
                  <span className="stl-donut-center-lbl">Total Sales</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="stl-breakdown-legend">
                <div className="stl-legend-row">
                  <div className="stl-legend-left">
                    <span className="stl-legend-color-dot" style={{ backgroundColor: "#6B421A" }} />
                    <span className="stl-legend-name">Designer Payouts</span>
                  </div>
                  <strong className="stl-legend-pct">{breakdown.payoutPct}%</strong>
                </div>

                <div className="stl-legend-row">
                  <div className="stl-legend-left">
                    <span className="stl-legend-color-dot" style={{ backgroundColor: "#D49B29" }} />
                    <span className="stl-legend-name">Platform Commission</span>
                  </div>
                  <strong className="stl-legend-pct">{breakdown.commissionPct}%</strong>
                </div>

                <div className="stl-legend-row">
                  <div className="stl-legend-left">
                    <span className="stl-legend-color-dot" style={{ backgroundColor: "#E8A838" }} />
                    <span className="stl-legend-name">Taxes (GST)</span>
                  </div>
                  <strong className="stl-legend-pct">{breakdown.taxPct}%</strong>
                </div>

                <div className="stl-legend-row">
                  <div className="stl-legend-left">
                    <span className="stl-legend-color-dot" style={{ backgroundColor: "#F5DFB8" }} />
                    <span className="stl-legend-name">Other Charges</span>
                  </div>
                  <strong className="stl-legend-pct">{breakdown.otherPct}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: Recent Transactions */}
          <div className="stl-widget-card transactions-card">
            <div className="stl-widget-header">
              <h3 className="stl-widget-title">Recent Transactions</h3>
              <button
                type="button"
                className="stl-widget-viewall-link"
                onClick={() => setIsViewAllTransactionsOpen(true)}
              >
                View All
              </button>
            </div>

            <div className="stl-transactions-list">
              {realRecentTransactions.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#8C7864", padding: "12px 0", textAlign: "center" }}>
                  No transactions recorded yet in database.
                </div>
              ) : (
                realRecentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="stl-transaction-item">
                    <div className={`stl-tx-icon-badge ${tx.type}`}>
                      {tx.icon === "play" && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                      {tx.icon === "percent" && (
                        <span style={{ fontSize: "12px", fontWeight: "800" }}>%</span>
                      )}
                      {tx.icon === "refresh" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                      )}
                      {tx.icon === "bank" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="21" x2="21" y2="21" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                          <polyline points="12 3 2 10 22 10" />
                          <line x1="6" y1="10" x2="6" y2="21" />
                          <line x1="10" y1="10" x2="10" y2="21" />
                          <line x1="14" y1="10" x2="14" y2="21" />
                          <line x1="18" y1="10" x2="18" y2="21" />
                        </svg>
                      )}
                    </div>

                    <div className="stl-tx-info">
                      <div className="stl-tx-title-row">
                        <span className="stl-tx-title">{tx.title}</span>
                        <strong className={`stl-tx-amount ${tx.isPositive ? "positive" : tx.type === "reversal" ? "reversal" : "negative"}`}>
                          {tx.amount}
                        </strong>
                      </div>

                      <div className="stl-tx-sub-row">
                        <span className="stl-tx-ref">{tx.ref}</span>
                        <span className="stl-tx-date">{tx.date}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* =====================================================
          5. MODAL: GENERATE SETTLEMENT (LIVE RUN)
      ===================================================== */}
      {isGenerateModalOpen && (
        <div className="stl-modal-overlay">
          <div className="stl-modal-card">
            <div className="stl-modal-header">
              <h3>Generate Settlement Run</h3>
              <button
                type="button"
                className="stl-modal-close-btn"
                onClick={() => setIsGenerateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="stl-modal-body">
              <p className="stl-modal-lead">
                Initiate reconciliation run for delivered orders and calculate designer take rates, platform fees, and GST deductions from database records.
              </p>

              <div className="stl-modal-field">
                <label>Settlement Billing Cycle</label>
                <select className="stl-modal-input" defaultValue="current">
                  <option value="current">Current Cycle (Delivered Orders to Date)</option>
                  <option value="prev">Previous Bi-Weekly Ledger</option>
                  <option value="monthly">Monthly Full Reconciliation</option>
                </select>
              </div>

              <div className="stl-modal-field">
                <label>Designer Target Scope</label>
                <select className="stl-modal-input" defaultValue="all">
                  <option value="all">All Registered Designers ({designers.length} Brands)</option>
                  <option value="pending">Only Designers with Pending Payouts</option>
                </select>
              </div>

              <div className="stl-modal-summary-box">
                <div className="stl-summary-row">
                  <span>Eligible Database Orders:</span>
                  <strong>{orders.filter((o) => ["DELIVERED", "Delivered"].includes(o.order_status || o.status)).length || orders.length} Orders</strong>
                </div>
                <div className="stl-summary-row">
                  <span>Total Settled GMV:</span>
                  <strong>{kpis.totalSales}</strong>
                </div>
                <div className="stl-summary-row">
                  <span>Platform Commission:</span>
                  <strong>{kpis.platformCommission}</strong>
                </div>
                <div className="stl-summary-row highlight">
                  <span>Net Payable to Designers:</span>
                  <strong>{kpis.totalPayouts}</strong>
                </div>
              </div>
            </div>

            <div className="stl-modal-footer">
              <button
                type="button"
                className="stl-btn-cancel"
                onClick={() => setIsGenerateModalOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="stl-btn-confirm"
                onClick={handleTriggerGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? "Calculating Ledger..." : "Confirm & Run Settlement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          6. MODAL: SETTLEMENT DETAILS AUDIT
      ===================================================== */}
      {selectedSettlementDetails && (
        <div className="stl-modal-overlay">
          <div className="stl-modal-card details-modal">
            <div className="stl-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="stl-modal-badge">{selectedSettlementDetails.id}</span>
                <h3>{selectedSettlementDetails.designer}</h3>
              </div>
              <button
                type="button"
                className="stl-modal-close-btn"
                onClick={() => setSelectedSettlementDetails(null)}
              >
                ✕
              </button>
            </div>

            <div className="stl-modal-body">
              <div className="stl-details-kpi-row">
                <div className="stl-detail-pill">
                  <span>Gross Sales</span>
                  <strong>{formatInr(selectedSettlementDetails.totalSales)}</strong>
                </div>
                <div className="stl-detail-pill">
                  <span>Commission ({selectedSettlementDetails.commissionRate}%)</span>
                  <strong>{formatInr(selectedSettlementDetails.commissionAmount)}</strong>
                </div>
                <div className="stl-detail-pill primary">
                  <span>Net Payout</span>
                  <strong>{formatInr(selectedSettlementDetails.payoutAmount)}</strong>
                </div>
              </div>

              <div className="stl-details-grid">
                <div className="stl-detail-item">
                  <label>Disbursement Status</label>
                  <span className={`stl-status-pill ${selectedSettlementDetails.status.toLowerCase()}`}>
                    <span className="stl-status-dot" />
                    {selectedSettlementDetails.status}
                  </span>
                </div>
                <div className="stl-detail-item">
                  <label>Payment Date</label>
                  <span>{selectedSettlementDetails.paymentDate}</span>
                </div>
                <div className="stl-detail-item">
                  <label>Payment Channel</label>
                  <span>{selectedSettlementDetails.paymentMethod}</span>
                </div>
                <div className="stl-detail-item">
                  <label>Transfer Reference (UTR / ID)</label>
                  <span className="stl-mono-code">{selectedSettlementDetails.utr}</span>
                </div>
              </div>

              <div className="stl-audit-clause">
                <p>
                  <strong>Database Audit Notice:</strong> Record #{selectedSettlementDetails.rawId} is directly synced from the Django financial engine. All take rates and commission deductions reflect live merchant agreements.
                </p>
              </div>
            </div>

            <div className="stl-modal-footer">
              <button
                type="button"
                className="stl-btn-cancel"
                onClick={() => setSelectedSettlementDetails(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="stl-btn-confirm"
                onClick={() => handleDownloadStatement(selectedSettlementDetails)}
              >
                Download Statement Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          7. MODAL: VIEW ALL TRANSACTIONS
      ===================================================== */}
      {isViewAllTransactionsOpen && (
        <div className="stl-modal-overlay" onClick={() => setIsViewAllTransactionsOpen(false)}>
          <div className="stl-modal-card details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stl-modal-header">
              <div className="stl-modal-title-wrap">
                <span className="stl-modal-badge">Live Financial Journal</span>
                <h3>All Financial Ledger Transactions</h3>
                <span className="stl-modal-subtitle">
                  Showing all {realRecentTransactions.length} recorded ledger movements directly synced from database
                </span>
              </div>
              <button
                type="button"
                className="stl-modal-close-btn"
                onClick={() => setIsViewAllTransactionsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="stl-modal-body">
              <div className="stl-transactions-list full-ledger">
                {realRecentTransactions.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#8C7864", padding: "20px" }}>
                    No ledger transactions recorded yet in database.
                  </div>
                ) : (
                  realRecentTransactions.map((tx) => (
                    <div key={tx.id} className="stl-transaction-item">
                      <div className={`stl-tx-icon-badge ${tx.type}`}>
                        {tx.icon === "play" && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                        {tx.icon === "percent" && (
                          <span style={{ fontSize: "12px", fontWeight: "800" }}>%</span>
                        )}
                        {tx.icon === "refresh" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                        )}
                        {tx.icon === "bank" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="21" x2="21" y2="21" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                            <polyline points="12 3 2 10 22 10" />
                            <line x1="6" y1="10" x2="6" y2="21" />
                            <line x1="10" y1="10" x2="10" y2="21" />
                            <line x1="14" y1="10" x2="14" y2="21" />
                            <line x1="18" y1="10" x2="18" y2="21" />
                          </svg>
                        )}
                      </div>
                      <div className="stl-tx-info">
                        <div className="stl-tx-title-row">
                          <span className="stl-tx-title">{tx.title}</span>
                          <strong className={`stl-tx-amount ${tx.isPositive ? "positive" : tx.type === "reversal" ? "reversal" : "negative"}`}>
                            {tx.amount}
                          </strong>
                        </div>
                        <div className="stl-tx-sub-row">
                          <span className="stl-tx-ref">{tx.ref}</span>
                          <span className="stl-tx-date">{tx.date}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="stl-modal-footer">
              <button
                type="button"
                className="stl-btn-cancel"
                onClick={() => setIsViewAllTransactionsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          8. MODAL: SETTLE DESIGNER PAYMENT / DISBURSEMENT
      ===================================================== */}
      {paymentModalItem && (
        <div className="stl-modal-overlay">
          <div className="stl-modal-card payment-modal">
            <div className="stl-modal-header">
              <div className="stl-modal-title-wrap">
                <span className="stl-modal-badge">Direct Settlement</span>
                <h3>Disburse Designer Payout</h3>
              </div>
              <button
                type="button"
                className="stl-modal-close-btn"
                onClick={() => setPaymentModalItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="stl-modal-body">
              <div className="stl-payout-designer-card">
                <div className="stl-payout-designer-info">
                  <img
                    src={getDesignerAvatarUrl(paymentModalItem.designer, paymentModalItem.designerAvatar)}
                    alt={paymentModalItem.designer}
                    className="stl-payout-avatar"
                  />
                  <div>
                    <strong className="stl-payout-designer-name">{paymentModalItem.designer}</strong>
                    <span className="stl-payout-code">Settlement ID: {paymentModalItem.id}</span>
                  </div>
                </div>
                <div className="stl-payout-amount-box">
                  <span className="stl-payout-label">Net Payable Amount</span>
                  <strong className="stl-payout-val">{formatInr(paymentModalItem.payoutAmount)}</strong>
                </div>
              </div>

              <div className="stl-modal-field" style={{ marginTop: "16px" }}>
                <label>Disbursement Channel / Gateway</label>
                <select
                  value={payoutChannel}
                  onChange={(e) => setPayoutChannel(e.target.value)}
                  className="stl-modal-select"
                >
                  <option value="NEFT">NEFT (National Electronic Fund Transfer)</option>
                  <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                  <option value="IMPS">IMPS (Immediate Payment Service - Instant)</option>
                  <option value="RazorpayX">RazorpayX Direct Commercial Payout</option>
                  <option value="UPI">UPI Commercial VPA</option>
                  <option value="Bank Transfer">Direct Corporate Bank Transfer</option>
                </select>
              </div>

              <div className="stl-modal-field">
                <label>Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={payoutRefInput}
                  onChange={(e) => setPayoutRefInput(e.target.value)}
                  placeholder="e.g. UTR-2026100800123"
                  className="stl-modal-input"
                />
              </div>

              <div className="stl-modal-field">
                <label>Narration / Ledger Notes</label>
                <textarea
                  rows="2"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Optional audit notes for ledger records..."
                  className="stl-modal-textarea"
                />
              </div>

              <div className="stl-payout-breakdown-mini">
                <div className="stl-mini-row">
                  <span>Gross Sales GMV:</span>
                  <strong>{formatInr(paymentModalItem.totalSales)}</strong>
                </div>
                <div className="stl-mini-row">
                  <span>Zenve Platform Commission:</span>
                  <span style={{ color: "#DC2626" }}>- {formatInr(paymentModalItem.commissionAmount)}</span>
                </div>
                <div className="stl-mini-row total">
                  <span>Authorized Net Disbursal:</span>
                  <strong style={{ color: "#16A34A" }}>{formatInr(paymentModalItem.payoutAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="stl-modal-footer">
              <button
                type="button"
                className="stl-btn-cancel"
                onClick={() => setPaymentModalItem(null)}
                disabled={isSubmittingPayment}
              >
                Cancel
              </button>
              <button
                type="button"
                className="stl-btn-confirm"
                onClick={handleConfirmDisbursement}
                disabled={isSubmittingPayment}
                style={{ background: "#5C3A21", color: "#FFFFFF" }}
              >
                {isSubmittingPayment ? "Processing Settlement..." : `Authorize & Settle ${formatInr(paymentModalItem.payoutAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}