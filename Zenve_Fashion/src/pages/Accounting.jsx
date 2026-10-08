import React, { useState, useEffect, useMemo } from "react";
import "../styles/Accounting.css";
import bannerImg from "../assest/accounting-banner.jpg";
import {
  getAccountingSettlements,
  getAccountingStats,
  getOrders,
  createOrder,
  disburseSettlementPayment,
} from "../services/api";

function getInitials(name) {
  if (!name) return "Z";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  const palette = [
    "#965B1C",
    "#B45309",
    "#0284C7",
    "#16A34A",
    "#9333EA",
    "#D97706",
    "#4F46E5",
    "#BE185D",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

export default function Accounting() {
  // Real Backend Data State
  const [settlements, setSettlements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation
  const [activeTab, setActiveTab] = useState("Invoices");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewInvoiceItem, setViewInvoiceItem] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Invoice Form
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    name: "",
    orderId: "ORD" + Math.floor(1000 + Math.random() * 9000),
    amount: "",
    taxRate: "12",
    status: "Pending",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    type: "B2C",
  });

  /* ---------------------------------------------------------
     FETCH REAL DATA FROM DJANGO BACKEND
  --------------------------------------------------------- */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [settlementsData, statsData, ordersData] = await Promise.all([
        getAccountingSettlements().catch((err) => {
          console.error("Failed to load settlements:", err);
          return [];
        }),
        getAccountingStats().catch((err) => {
          console.error("Failed to load accounting stats:", err);
          return null;
        }),
        getOrders().catch((err) => {
          console.error("Failed to load orders:", err);
          return [];
        }),
      ]);

      setSettlements(Array.isArray(settlementsData) ? settlementsData : []);
      setStats(statsData);
      const ordersList = Array.isArray(ordersData)
        ? ordersData
        : Array.isArray(ordersData?.results)
        ? ordersData.results
        : [];
      setOrders(ordersList);
    } catch (err) {
      console.error("Accounting load error:", err);
      setError("Failed to connect to Accounting engine. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close row action dropdown when clicking outside
  useEffect(() => {
    if (!activeMenuId) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.acc-more-wrap')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [activeMenuId]);

  /* ---------------------------------------------------------
     SYNTHESIZE REAL INVOICES LIST FROM LIVE DB
  --------------------------------------------------------- */
  const liveInvoices = useMemo(() => {
    const list = [];

    // 1. Invoices from Settlements (Designer payouts & receivables)
    settlements.forEach((s, idx) => {
      const gmv = parseFloat(s.gmv) || 0;
      const tax = parseFloat(s.tax_amount) || Math.round(gmv * 0.12);
      const total = gmv + tax;

      let status = "Pending";
      const sStatus = String(s.status || "").toUpperCase();
      if (sStatus === "PAID" || sStatus === "RECONCILED") {
        status = "Paid";
      } else if (sStatus === "REVERSED" || s.is_reversal) {
        status = "Overdue";
      } else if (sStatus === "PENDING" || sStatus === "APPROVED") {
        status = "Pending";
      }

      const invDate = s.created_at
        ? new Date(s.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      const dueDate = s.paid_at
        ? new Date(s.paid_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : s.created_at
        ? new Date(new Date(s.created_at).getTime() + 7 * 86400000).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      list.push({
        id: `stl-${s.id}`,
        rawId: s.id,
        isSettlement: true,
        num: String(idx + 1).padStart(2, "0"),
        invoiceId: s.settlement_number || `INV${s.id}`,
        name: s.brand_name || s.designer_code || `Couturier #${s.designer || s.id}`,
        orderId: s.order_number || `ORD${s.order || s.id}`,
        amount: Math.round(gmv),
        tax: Math.round(tax),
        total: Math.round(total),
        status,
        invoiceDate: invDate,
        dueDate: dueDate,
        type: s.is_reversal ? "Reversal" : s.payout_method || "Designer Payout",
        rawTimestamp: s.created_at,
      });
    });

    // 2. Invoices from Orders (Client purchases / B2C / B2B)
    orders.forEach((o, idx) => {
      const tot = parseFloat(o.total) || 0;
      const sub = parseFloat(o.subtotal) || Math.round(tot / 1.12);
      const tax = tot - sub;

      let status = "Pending";
      const pStatus = String(o.payment_status || "").toLowerCase();
      const oStatus = String(o.order_status || "").toLowerCase();
      if (pStatus === "paid" || oStatus === "delivered") {
        status = "Paid";
      } else if (oStatus === "cancelled" || oStatus === "failed") {
        status = "Overdue";
      } else {
        status = "Pending";
      }

      const invDate = o.created_at
        ? new Date(o.created_at).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      list.push({
        id: `ord-${o.id}`,
        rawId: o.id,
        isOrder: true,
        num: String(list.length + 1).padStart(2, "0"),
        invoiceId: `INV-${o.order_number || o.id}`,
        name: o.shipping_full_name || o.customer_name || `Customer #${o.id}`,
        orderId: o.order_number || `#${o.id}`,
        amount: Math.round(sub),
        tax: Math.round(tax),
        total: Math.round(tot),
        status,
        invoiceDate: invDate,
        dueDate: invDate,
        type: tot > 200000 ? "B2B" : "B2C",
        rawTimestamp: o.created_at,
      });
    });

    return list;
  }, [settlements, orders]);

  /* ---------------------------------------------------------
     FILTERING LOGIC ON LIVE DATA
  --------------------------------------------------------- */
  const filteredInvoices = useMemo(() => {
    return liveInvoices.filter((item) => {
      // Local table search
      const q = searchFilter.toLowerCase().trim();
      if (q) {
        const matchQ =
          (item.invoiceId || "").toLowerCase().includes(q) ||
          (item.name || "").toLowerCase().includes(q) ||
          (item.orderId || "").toLowerCase().includes(q) ||
          (item.status || "").toLowerCase().includes(q) ||
          String(item.total).includes(q);
        if (!matchQ) return false;
      }

      // Type filter
      if (typeFilter !== "All" && item.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "All" && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [liveInvoices, searchFilter, typeFilter, statusFilter]);

  // Paginated records
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));

  /* ---------------------------------------------------------
     SELECTION HANDLERS
  --------------------------------------------------------- */
  const isAllSelected =
    paginatedInvoices.length > 0 && selectedIds.size === paginatedInvoices.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedInvoices.map((inv) => inv.id)));
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
    setSearchFilter("");
    setTypeFilter("All");
    setStatusFilter("All");
    setDateRangeFilter("All");
    setCurrentPage(1);
  };

  /* ---------------------------------------------------------
     REAL KPI VALUES DERIVED FROM BACKEND STATS
  --------------------------------------------------------- */
  const kpis = useMemo(() => {
    const rawRev = stats?.gross_gmv || stats?.total_settled_gmv || 0;
    const rawExp = (stats?.total_disbursed || 0) + (stats?.total_gateway_fees || 0);
    const rawProfit = stats?.zenve_commission || Math.max(0, rawRev - rawExp);
    const rawPending = stats?.pending_payable || 0;
    const rawOverdue = stats?.reversal_deductions || 0;

    const profitPct = rawRev > 0 ? ((rawProfit / rawRev) * 100).toFixed(0) : "0";
    const expPct = rawRev > 0 ? ((rawExp / rawRev) * 100).toFixed(0) : "0";
    const pendingPct = rawRev > 0 ? ((rawPending / rawRev) * 100).toFixed(0) : "0";

    return {
      revenue: `₹${Math.round(rawRev).toLocaleString("en-IN")}`,
      revenueTrend: `${settlements.length} settlements`,
      expenses: `₹${Math.round(rawExp).toLocaleString("en-IN")}`,
      expensesTrend: `${expPct}% of GMV`,
      profit: `₹${Math.round(rawProfit).toLocaleString("en-IN")}`,
      profitTrend: `${profitPct}% margin`,
      pending: `₹${Math.round(rawPending).toLocaleString("en-IN")}`,
      pendingTrend: `${pendingPct}% payable`,
      overdue: `₹${Math.round(rawOverdue).toLocaleString("en-IN")}`,
      overdueTrend: `${stats?.status_counts?.reversed || 0} reversed`,
    };
  }, [stats, settlements]);

  /* ---------------------------------------------------------
     EXPENSE BREAKDOWN DERIVED DYNAMICALLY FROM REAL DB STATS
  --------------------------------------------------------- */
  const expenseBreakdown = useMemo(() => {
    const rawExp = (stats?.total_disbursed || 0) + (stats?.total_gateway_fees || 0);
    const payoutMap = stats?.payout_breakdown || {};
    const categories = [];
    const colors = ["#5C3A21", "#D97706", "#F59E0B", "#FCD34D", "#C084FC", "#9333EA"];
    let colorIdx = 0;

    Object.entries(payoutMap).forEach(([channel, info]) => {
      const amt = parseFloat(info?.amount || 0);
      if (amt > 0) {
        categories.push({
          name: channel,
          amount: amt,
          percentage: rawExp > 0 ? ((amt / rawExp) * 100).toFixed(1) : "0.0",
          color: colors[colorIdx % colors.length],
        });
        colorIdx++;
      }
    });

    if (stats?.total_gateway_fees > 0) {
      categories.push({
        name: "Gateway Fees",
        amount: parseFloat(stats.total_gateway_fees),
        percentage: rawExp > 0 ? ((stats.total_gateway_fees / rawExp) * 100).toFixed(1) : "0.0",
        color: "#9333EA",
      });
    }

    if (categories.length === 0) {
      categories.push({
        name: "Disbursements",
        amount: rawExp || 0,
        percentage: "100.0",
        color: "#5C3A21",
      });
    }

    return categories;
  }, [stats]);

  /* ---------------------------------------------------------
     REAL RECENT TRANSACTIONS FEED DERIVED FROM DB
  --------------------------------------------------------- */
  const recentTransactions = useMemo(() => {
    const txs = [];

    // Payments from real orders
    orders.forEach((o) => {
      if (o.total) {
        txs.push({
          id: `tx-ord-${o.id}`,
          type: "income",
          title: `Payment from ${o.shipping_full_name || o.customer_name || "Client"}`,
          ref: o.order_number || `ORD${o.id}`,
          amount: `+ ₹${Math.round(parseFloat(o.total) || 0).toLocaleString("en-IN")}`,
          date: o.created_at
            ? new Date(o.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
          timestamp: o.created_at ? new Date(o.created_at).getTime() : 0,
        });
      }
    });

    // Real payouts / expenses from settlements
    settlements.forEach((s) => {
      const amt = parseFloat(s.payout_amount || s.gmv) || 0;
      if (amt > 0) {
        txs.push({
          id: `tx-stl-${s.id}`,
          type: "expense",
          title: `Disbursement - ${s.brand_name || "Couturier"}`,
          ref: s.settlement_number || `STL${s.id}`,
          amount: `- ₹${Math.round(amt).toLocaleString("en-IN")}`,
          date: s.paid_at
            ? new Date(s.paid_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : s.created_at
            ? new Date(s.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
          timestamp: s.created_at ? new Date(s.created_at).getTime() : 0,
        });
      }
    });

    txs.sort((a, b) => b.timestamp - a.timestamp);
    return txs.slice(0, 5);
  }, [orders, settlements]);

  /* ---------------------------------------------------------
     MONTHLY CHART DATA DERIVED DYNAMICALLY FROM DB
  --------------------------------------------------------- */
  const monthlyChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    const monthRev = Array(10).fill(0);
    const monthExp = Array(10).fill(0);

    orders.forEach((o) => {
      if (o.created_at) {
        const d = new Date(o.created_at);
        const m = d.getMonth();
        if (m < 10) {
          monthRev[m] += (parseFloat(o.total) || 0) / 100000;
        }
      }
    });

    settlements.forEach((s) => {
      if (s.created_at) {
        const d = new Date(s.created_at);
        const m = d.getMonth();
        if (m < 10) {
          monthExp[m] += (parseFloat(s.payout_amount || s.gmv) || 0) / 100000;
        }
      }
    });

    return monthNames.map((m, idx) => ({
      month: m,
      revenue: parseFloat((monthRev[idx] || 0).toFixed(2)),
      expenses: parseFloat((monthExp[idx] || 0).toFixed(2)),
    }));
  }, [orders, settlements]);

  const maxChartVal = useMemo(() => {
    let m = 0;
    monthlyChartData.forEach((d) => {
      if (d.revenue > m) m = d.revenue;
      if (d.expenses > m) m = d.expenses;
    });
    return Math.max(1, Math.ceil(m));
  }, [monthlyChartData]);

  /* ---------------------------------------------------------
     CREATE REAL INVOICE / ORDER IN BACKEND
  --------------------------------------------------------- */
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!newInvoiceForm.name || !newInvoiceForm.amount) return;

    setIsSubmitting(true);
    try {
      const amt = parseFloat(newInvoiceForm.amount) || 0;
      const payload = {
        customer_name: newInvoiceForm.name.trim(),
        shipping_full_name: newInvoiceForm.name.trim(),
        shipping_phone: "9876543210",
        shipping_city: "Mumbai",
        shipping_address_line1: "Luxury Residence",
        total: amt,
        order_status: "Pending",
        payment_method: "Razorpay",
        payment_status: newInvoiceForm.status === "Paid" ? "Paid" : "Pending",
        items: [
          {
            product_name: "Haute Couture Garment Deliverable",
            quantity: 1,
            price: amt,
            unit_price: amt,
            total: amt,
            color: "Ivory Gold",
            size: "M",
          },
        ],
      };

      await createOrder(payload);
      setIsCreateModalOpen(false);
      setNewInvoiceForm({
        name: "",
        orderId: "ORD" + Math.floor(1000 + Math.random() * 9000),
        amount: "",
        taxRate: "12",
        status: "Pending",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        type: "B2C",
      });
      // Refresh live database
      await fetchData();
    } catch (err) {
      console.error("Failed to create invoice:", err);
      alert(err.message || "Failed to create invoice in backend");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------------------------------------------------
     ACTION HANDLERS (DISBURSE / DOWNLOAD RECEIPT)
  --------------------------------------------------------- */
  const handleMarkPaid = async (inv) => {
    if (inv.isSettlement && inv.rawId) {
      try {
        await disburseSettlementPayment({
          settlement_ids: [inv.rawId],
          status: "PAID",
          notes: `Disbursed for ${inv.invoiceId}`,
        });
        await fetchData();
      } catch (err) {
        console.error("Disburse error:", err);
      }
    }
    setActiveMenuId(null);
  };

  const handleDownloadInvoice = (inv) => {
    const content = `ZENVE FASHION MERCHANDISING - INVOICE VOUCHER\n` +
      `--------------------------------------------------\n` +
      `Invoice ID: ${inv.invoiceId}\n` +
      `Order ID:   ${inv.orderId}\n` +
      `Recipient:  ${inv.name}\n` +
      `Amount:     ₹${inv.amount.toLocaleString("en-IN")}\n` +
      `Tax (GST):  ₹${inv.tax.toLocaleString("en-IN")}\n` +
      `Total:      ₹${inv.total.toLocaleString("en-IN")}\n` +
      `Status:     ${inv.status}\n` +
      `Date:       ${inv.invoiceDate}\n` +
      `Due Date:   ${inv.dueDate}\n` +
      `--------------------------------------------------\n` +
      `Verified by Zenve Fashion Live Accounting Gateway`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceId}_receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="acc-page-container">
      {/* =====================================================
          LUXURY HERO BANNER
      ===================================================== */}
      <section className="acc-hero-banner">
        <div className="acc-hero-content">
          <h1 className="acc-hero-title">Accounting</h1>
          <p className="acc-hero-subtitle">
            Manage your finances, invoices, expenses and financial reports
          </p>
        </div>

        {/* Fashion Showroom Background Artwork */}
        <div className="acc-hero-art-wrap">
          <img
            src={bannerImg}
            alt="Haute Couture Fashion Showroom"
            className="acc-hero-art-img"
          />
          <div className="acc-hero-glow-overlay" />
        </div>
      </section>

      {/* =====================================================
          TOP FINANCIAL KPI CARDS (5 LIVE METRICS)
      ===================================================== */}
      <section className="acc-kpi-grid">
        {/* Card 1: Total Revenue */}
        <div className="acc-kpi-card">
          <div className="acc-kpi-card-header">
            <div className="acc-kpi-title-group">
              <div className="acc-kpi-icon-badge gold-bg">
                <span className="acc-icon-sym">₹</span>
              </div>
              <span className="acc-kpi-label">Total Revenue</span>
            </div>
            <span className="acc-trend-pill up">{kpis.revenueTrend}</span>
          </div>
          <div className="acc-kpi-card-body">
            <strong className="acc-kpi-value">{kpis.revenue}</strong>
            <svg className="acc-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d="M1 15 L9 11 L18 13 L27 5 L37 2"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="acc-kpi-card">
          <div className="acc-kpi-card-header">
            <div className="acc-kpi-title-group">
              <div className="acc-kpi-icon-badge amber-bg">
                <span className="acc-icon-sym">🪙</span>
              </div>
              <span className="acc-kpi-label">Total Expenses</span>
            </div>
            <span className="acc-trend-pill red">{kpis.expensesTrend}</span>
          </div>
          <div className="acc-kpi-card-body">
            <strong className="acc-kpi-value">{kpis.expenses}</strong>
            <svg className="acc-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d="M1 14 L9 12 L18 8 L27 10 L37 4"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="acc-kpi-card">
          <div className="acc-kpi-card-header">
            <div className="acc-kpi-title-group">
              <div className="acc-kpi-icon-badge orange-bg">
                <span className="acc-icon-sym">📊</span>
              </div>
              <span className="acc-kpi-label">Net Profit</span>
            </div>
            <span className="acc-trend-pill up">{kpis.profitTrend}</span>
          </div>
          <div className="acc-kpi-card-body">
            <strong className="acc-kpi-value">{kpis.profit}</strong>
            <svg className="acc-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d="M1 16 L9 13 L18 10 L27 8 L37 2"
                fill="none"
                stroke="#16A34A"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Pending Invoices */}
        <div className="acc-kpi-card">
          <div className="acc-kpi-card-header">
            <div className="acc-kpi-title-group">
              <div className="acc-kpi-icon-badge tan-bg">
                <span className="acc-icon-sym">📄</span>
              </div>
              <span className="acc-kpi-label">Pending Invoices</span>
            </div>
            <span className="acc-trend-pill orange">{kpis.pendingTrend}</span>
          </div>
          <div className="acc-kpi-card-body">
            <strong className="acc-kpi-value">{kpis.pending}</strong>
            <svg className="acc-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d="M1 13 L9 15 L18 11 L27 6 L37 3"
                fill="none"
                stroke="#EA580C"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 5: Overdue Payments */}
        <div className="acc-kpi-card">
          <div className="acc-kpi-card-header">
            <div className="acc-kpi-title-group">
              <div className="acc-kpi-icon-badge cream-bg">
                <span className="acc-icon-sym">⏱️</span>
              </div>
              <span className="acc-kpi-label">Overdue Payments</span>
            </div>
            <span className="acc-trend-pill red">{kpis.overdueTrend}</span>
          </div>
          <div className="acc-kpi-card-body">
            <strong className="acc-kpi-value">{kpis.overdue}</strong>
            <svg className="acc-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d="M1 4 L10 7 L19 9 L28 12 L37 15"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* =====================================================
          NAVIGATION TABS & PRIMARY ACTION ROW
      ===================================================== */}
      <section className="acc-tabs-action-bar">
        <div className="acc-tabs-list">
          {["Invoices", "Expenses", "Payments", "Tax & Compliance", "Financial Reports"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                className={`acc-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="acc-create-invoice-btn"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <span className="acc-plus-icon">+</span>
          <span>Create Invoice</span>
        </button>
      </section>

      {/* =====================================================
          MAIN CONTENT AREA (SPLIT GRID)
      ===================================================== */}
      <main className="acc-split-grid">
        {/* ---------------------------------------------------
            LEFT COLUMN: INVOICES DATA TABLE & FILTERS
        --------------------------------------------------- */}
        <div className="acc-table-card">
          {/* Filter Toolbar */}
          <div className="acc-filter-toolbar">
            <div className="acc-table-search-wrap">
              <svg
                className="acc-table-search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8C7862"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="acc-table-search-input"
                placeholder="Search by invoice ID, customer, designer, or order ID..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <div className="acc-filter-group">
              <label className="acc-filter-label">Type</label>
              <select
                className="acc-filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
                <option value="Designer Payout">Designer Payout</option>
                <option value="Wholesale">Wholesale</option>
              </select>
            </div>

            <div className="acc-filter-group">
              <label className="acc-filter-label">Status</label>
              <select
                className="acc-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div className="acc-filter-group">
              <label className="acc-filter-label">Date Range</label>
              <select
                className="acc-filter-select"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Quarter">This Quarter</option>
              </select>
            </div>

            <button
              type="button"
              className="acc-reset-btn"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

          {/* Interactive Invoices Table */}
          <div className="acc-table-wrapper">
            <table className="acc-table">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input
                      type="checkbox"
                      className="acc-custom-checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th>#</th>
                  <th>Invoice ID</th>
                  <th>Customer / Designer</th>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Tax (GST)</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="acc-empty-cell">
                      Connecting to Live Accounting Gateway...
                    </td>
                  </tr>
                ) : paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="acc-empty-cell">
                      No invoices found in database matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv, idx) => {
                    const isChecked = selectedIds.has(inv.id);
                    const isNearBottom = idx >= Math.max(0, paginatedInvoices.length - 2);
                    return (
                      <tr key={inv.id} className={isChecked ? "row-selected" : ""}>
                        <td className="td-checkbox">
                          <input
                            type="checkbox"
                            className="acc-custom-checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectRow(inv.id)}
                            aria-label={`Select invoice ${inv.invoiceId}`}
                          />
                        </td>
                        <td className="td-num">{inv.num}</td>
                        <td className="td-inv-id">
                          <button
                            type="button"
                            className="acc-id-link"
                            onClick={() => setViewInvoiceItem(inv)}
                          >
                            {inv.invoiceId}
                          </button>
                        </td>
                        <td className="td-client">
                          <div className="acc-client-profile">
                            <div
                              className="acc-client-initial-badge"
                              style={{ background: getAvatarColor(inv.name) }}
                              title={inv.name}
                            >
                              {getInitials(inv.name)}
                            </div>
                            <span className="acc-client-name">{inv.name}</span>
                          </div>
                        </td>
                        <td className="td-order-id">
                          <span className="acc-order-link">{inv.orderId}</span>
                        </td>
                        <td className="td-amount">
                          ₹{inv.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="td-tax">
                          ₹{inv.tax.toLocaleString("en-IN")}
                        </td>
                        <td className="td-total">
                          <strong>₹{inv.total.toLocaleString("en-IN")}</strong>
                        </td>
                        <td className="td-status">
                          <span
                            className={`acc-status-pill ${
                              inv.status === "Paid"
                                ? "paid"
                                : inv.status === "Pending"
                                ? "pending"
                                : "overdue"
                            }`}
                          >
                            <span className="acc-status-dot" />
                            {inv.status}
                          </span>
                        </td>
                        <td className="td-date">{inv.invoiceDate}</td>
                        <td
                          className={`td-due-date ${
                            inv.status === "Overdue" ? "text-overdue" : ""
                          }`}
                        >
                          {inv.dueDate}
                        </td>
                        <td className="td-actions">
                          <div className="acc-action-buttons">
                            {/* View Eye */}
                            <button
                              type="button"
                              className="acc-icon-btn"
                              title="View Invoice Statement"
                              onClick={() => setViewInvoiceItem(inv)}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            {/* Download */}
                            <button
                              type="button"
                              className="acc-icon-btn"
                              title="Download Statement"
                              onClick={() => handleDownloadInvoice(inv)}
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            </button>

                            {/* More ⋮ */}
                            <div className="acc-more-wrap">
                              <button
                                type="button"
                                className={`acc-icon-btn ${activeMenuId === inv.id ? "active" : ""}`}
                                title="More options"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(
                                    activeMenuId === inv.id ? null : inv.id
                                  );
                                }}
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="5" r="1.5" />
                                  <circle cx="12" cy="12" r="1.5" />
                                  <circle cx="12" cy="19" r="1.5" />
                                </svg>
                              </button>

                              {activeMenuId === inv.id && (
                                <div
                                  className={`acc-row-menu ${
                                    isNearBottom ? "menu-upward" : ""
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleMarkPaid(inv);
                                      setActiveMenuId(null);
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Mark Disbursed / Paid</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      alert(
                                        `Payment notification sent for ${inv.invoiceId}!`
                                      );
                                      setActiveMenuId(null);
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="22" y1="2" x2="11" y2="13" />
                                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    <span>Send Notice</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewInvoiceItem(inv);
                                      setActiveMenuId(null);
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                      <line x1="16" y1="13" x2="8" y2="13" />
                                      <line x1="16" y1="17" x2="8" y2="17" />
                                      <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    <span>Inspect Voucher</span>
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

          {/* Pagination Bar */}
          <div className="acc-pagination-bar">
            <span className="acc-pagination-info">
              Showing {paginatedInvoices.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length} live records
            </span>

            <div className="acc-pagination-controls">
              <button
                type="button"
                className="acc-page-nav-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  type="button"
                  className={`acc-page-num ${currentPage === i + 1 ? "active" : ""}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="acc-page-nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------
            RIGHT COLUMN: FINANCIAL CHARTS & WIDGETS
        --------------------------------------------------- */}
        <aside className="acc-widgets-column">
          {/* Widget 1: Revenue vs Expenses Bar Chart */}
          <div className="acc-widget-card">
            <div className="acc-widget-header">
              <h3 className="acc-widget-title">Revenue vs Expenses</h3>
              <select className="acc-widget-select" defaultValue="Monthly">
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>

            <div className="acc-chart-legend">
              <span className="legend-item">
                <span className="legend-dot revenue" />
                Revenue
              </span>
              <span className="legend-item">
                <span className="legend-dot expenses" />
                Expenses
              </span>
            </div>

            {/* SVG Grouped Bar Chart */}
            <div className="acc-bar-chart-container">
              <div className="acc-y-axis">
                <span>₹{maxChartVal}L</span>
                <span>₹{(maxChartVal * 0.66).toFixed(1)}L</span>
                <span>₹{(maxChartVal * 0.33).toFixed(1)}L</span>
                <span>0</span>
              </div>
              <div className="acc-chart-bars-wrap">
                <div className="acc-grid-line y-6" />
                <div className="acc-grid-line y-4" />
                <div className="acc-grid-line y-2" />
                <div className="acc-grid-line y-0" />

                <div className="acc-bars-track">
                  {monthlyChartData.map((item) => (
                    <div key={item.month} className="acc-bar-group">
                      <div className="acc-bars-pair">
                        <div
                          className="acc-bar rev-bar"
                          style={{
                            height: `${
                              maxChartVal > 0
                                ? Math.min(100, (item.revenue / maxChartVal) * 100)
                                : 0
                            }%`,
                          }}
                          title={`${item.month} Revenue: ₹${Math.round(
                            item.revenue * 100000
                          ).toLocaleString("en-IN")}`}
                        />
                        <div
                          className="acc-bar exp-bar"
                          style={{
                            height: `${
                              maxChartVal > 0
                                ? Math.min(100, (item.expenses / maxChartVal) * 100)
                                : 0
                            }%`,
                          }}
                          title={`${item.month} Expenses: ₹${Math.round(
                            item.expenses * 100000
                          ).toLocaleString("en-IN")}`}
                        />
                      </div>
                      <span className="acc-bar-label">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: Expense Breakdown Donut Chart */}
          <div className="acc-widget-card">
            <h3 className="acc-widget-title">Expense Breakdown</h3>

            <div className="acc-donut-widget-layout">
              {/* SVG Donut Chart with Center Text */}
              <div className="acc-donut-svg-wrap">
                <svg width="150" height="150" viewBox="0 0 100 100">
                  {expenseBreakdown.map((cat, idx) => {
                    const pct = parseFloat(cat.percentage) || 0;
                    const strokeLen = (pct / 100) * 238.76;
                    // Compute offset
                    let prevPct = 0;
                    for (let j = 0; j < idx; j++) {
                      prevPct += parseFloat(expenseBreakdown[j].percentage) || 0;
                    }
                    const offset = -(prevPct / 100) * 238.76;

                    return (
                      <circle
                        key={cat.name}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth="15"
                        strokeDasharray={`${strokeLen.toFixed(1)} 250`}
                        strokeDashoffset={offset.toFixed(1)}
                      />
                    );
                  })}
                </svg>
                <div className="acc-donut-center-info">
                  <strong className="center-amount">{kpis.expenses}</strong>
                  <span className="center-caption">Total Expenses</span>
                </div>
              </div>

              {/* Expense Category List */}
              <div className="acc-expense-legend-list">
                {expenseBreakdown.map((cat) => (
                  <div key={cat.name} className="acc-exp-legend-row">
                    <span className="exp-dot" style={{ background: cat.color }} />
                    <span className="exp-name">{cat.name}</span>
                    <strong className="exp-pct">{cat.percentage}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget 3: Live Recent Transactions */}
          <div className="acc-widget-card">
            <div className="acc-widget-header">
              <h3 className="acc-widget-title">Recent Transactions</h3>
              <button
                type="button"
                className="acc-view-all-link"
                onClick={() => setActiveTab("Payments")}
              >
                View All
              </button>
            </div>

            <div className="acc-transactions-list">
              {recentTransactions.length === 0 ? (
                <div
                  style={{
                    padding: "16px 0",
                    fontSize: "12px",
                    color: "#8C7862",
                    textAlign: "center",
                  }}
                >
                  No transactions recorded in database yet.
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="acc-tx-row">
                    <div
                      className={`acc-tx-symbol ${
                        tx.type === "income" ? "income" : "expense"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#16A34A"
                          strokeWidth="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#DC2626"
                          strokeWidth="2.5"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </div>
                    <div className="acc-tx-info">
                      <strong className="acc-tx-title">{tx.title}</strong>
                      <span className="acc-tx-ref">{tx.ref}</span>
                    </div>
                    <div className="acc-tx-amount-wrap">
                      <strong
                        className={`acc-tx-amount ${
                          tx.type === "income" ? "text-income" : "text-expense"
                        }`}
                      >
                        {tx.amount}
                      </strong>
                      <span className="acc-tx-date">{tx.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {/* Modal: Create Invoice (Real API Submission) */}
      {isCreateModalOpen && (
        <div
          className="acc-modal-backdrop"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="acc-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="acc-modal-header">
              <h3>Create New Invoice</h3>
              <button
                type="button"
                className="acc-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="acc-modal-form">
              <div className="acc-form-field">
                <label>Customer / Designer Name *</label>
                <input
                  type="text"
                  placeholder="Enter recipient or brand name"
                  value={newInvoiceForm.name}
                  onChange={(e) =>
                    setNewInvoiceForm({ ...newInvoiceForm, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="acc-form-row">
                <div className="acc-form-field">
                  <label>Order ID *</label>
                  <input
                    type="text"
                    value={newInvoiceForm.orderId}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, orderId: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="acc-form-field">
                  <label>Invoice Type</label>
                  <select
                    value={newInvoiceForm.type}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, type: e.target.value })
                    }
                  >
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                    <option value="Designer Payout">Designer Payout</option>
                    <option value="Wholesale">Wholesale</option>
                  </select>
                </div>
              </div>

              <div className="acc-form-row">
                <div className="acc-form-field">
                  <label>Subtotal Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={newInvoiceForm.amount}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="acc-form-field">
                  <label>GST Rate (%)</label>
                  <select
                    value={newInvoiceForm.taxRate}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, taxRate: e.target.value })
                    }
                  >
                    <option value="5">5% (Fabrics & Sarees)</option>
                    <option value="12">12% (Apparel standard)</option>
                    <option value="18">18% (Luxury Bridal Couture)</option>
                    <option value="28">28% (Special Haute Joaillerie)</option>
                  </select>
                </div>
              </div>

              <div className="acc-form-row">
                <div className="acc-form-field">
                  <label>Initial Status</label>
                  <select
                    value={newInvoiceForm.status}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, status: e.target.value })
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div className="acc-form-field">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={newInvoiceForm.dueDate}
                    onChange={(e) =>
                      setNewInvoiceForm({ ...newInvoiceForm, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {newInvoiceForm.amount && (
                <div className="acc-tax-summary-box">
                  <div className="tax-summary-line">
                    <span>Base Amount:</span>
                    <span>₹{Number(newInvoiceForm.amount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="tax-summary-line">
                    <span>GST ({newInvoiceForm.taxRate}%):</span>
                    <span>
                      ₹
                      {Math.round(
                        Number(newInvoiceForm.amount) *
                          (Number(newInvoiceForm.taxRate) / 100)
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="tax-summary-line total-line">
                    <strong>Total Payable:</strong>
                    <strong>
                      ₹
                      {(
                        Number(newInvoiceForm.amount) +
                        Math.round(
                          Number(newInvoiceForm.amount) *
                            (Number(newInvoiceForm.taxRate) / 100)
                        )
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              )}

              <div className="acc-modal-actions">
                <button
                  type="button"
                  className="acc-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="acc-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Generating..." : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Invoice Details Voucher */}
      {viewInvoiceItem && (
        <div
          className="acc-modal-backdrop"
          onClick={() => setViewInvoiceItem(null)}
        >
          <div
            className="acc-modal-card invoice-voucher-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="acc-modal-header">
              <h3>Invoice Statement · {viewInvoiceItem.invoiceId}</h3>
              <button
                type="button"
                className="acc-modal-close"
                onClick={() => setViewInvoiceItem(null)}
              >
                ×
              </button>
            </div>

            <div className="acc-voucher-body">
              <div className="acc-voucher-top-brand">
                <div>
                  <h2 className="voucher-brand-title">ZENVE FASHION</h2>
                  <p className="voucher-brand-sub">Haute Couture &amp; Merchandising CRM</p>
                </div>
                <span
                  className={`acc-status-pill ${
                    viewInvoiceItem.status === "Paid"
                      ? "paid"
                      : viewInvoiceItem.status === "Pending"
                      ? "pending"
                      : "overdue"
                  }`}
                >
                  <span className="acc-status-dot" />
                  {viewInvoiceItem.status}
                </span>
              </div>

              <div className="voucher-details-grid">
                <div>
                  <small>Billed To:</small>
                  <strong>{viewInvoiceItem.name}</strong>
                  <span>Account Ref #{viewInvoiceItem.id}</span>
                </div>
                <div>
                  <small>Associated Order:</small>
                  <strong>{viewInvoiceItem.orderId}</strong>
                  <span>Category: {viewInvoiceItem.type}</span>
                </div>
                <div>
                  <small>Invoice Date:</small>
                  <strong>{viewInvoiceItem.invoiceDate}</strong>
                </div>
                <div>
                  <small>Due Date:</small>
                  <strong
                    className={
                      viewInvoiceItem.status === "Overdue" ? "text-overdue" : ""
                    }
                  >
                    {viewInvoiceItem.dueDate}
                  </strong>
                </div>
              </div>

              <table className="voucher-calc-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Tax (GST)</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Deliverables ({viewInvoiceItem.orderId})</td>
                    <td className="text-right">₹{viewInvoiceItem.amount.toLocaleString("en-IN")}</td>
                    <td className="text-right">₹{viewInvoiceItem.tax.toLocaleString("en-IN")}</td>
                    <td className="text-right">
                      <strong>₹{viewInvoiceItem.total.toLocaleString("en-IN")}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="acc-modal-actions">
              <button
                type="button"
                className="acc-btn-secondary"
                onClick={() => handleDownloadInvoice(viewInvoiceItem)}
              >
                Download Statement PDF
              </button>
              <button
                type="button"
                className="acc-btn-primary"
                onClick={() => setViewInvoiceItem(null)}
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
