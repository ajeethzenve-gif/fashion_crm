import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Orders.css";
import bannerImg from "../assest/accounting-banner.jpg";
import { getOrders, getOrderStats, transitionOrder, cancelOrder } from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   SVG SPARKLINES COMPONENT
========================================================= */
function Sparkline({ color = "#F59E0B", points = "2,18 14,14 26,19 38,10 50,14 62,4" }) {
  return (
    <svg className="ord-kpi-sparkline" viewBox="0 0 66 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline
        points={points}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   ICONS
========================================================= */
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

/* =========================================================
   STATUS BADGE COMPONENT
========================================================= */
function StatusBadge({ type, value }) {
  const norm = String(value || "").toLowerCase();

  if (type === "payment") {
    if (norm.includes("paid")) {
      return (
        <span className="ord-status-pill paid">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Paid
        </span>
      );
    }
    return (
      <span className="ord-status-pill cod">
        <span style={{ fontSize: "14px", lineHeight: "0" }}>●</span> COD
      </span>
    );
  }

  // Order Status
  if (norm.includes("cancel") || norm.includes("reject")) {
    return (
      <span className="ord-status-pill cancelled">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        Cancelled
      </span>
    );
  }
  if (norm.includes("out")) {
    return (
      <span className="ord-status-pill out-of-delivery">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Out of delivery
      </span>
    );
  }
  if (norm.includes("deliver")) {
    return (
      <span className="ord-status-pill delivered">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Delivered
      </span>
    );
  }
  if (norm.includes("ship") || norm.includes("transit")) {
    return (
      <span className="ord-status-pill shipped">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
        Shipped
      </span>
    );
  }
  if (norm.includes("pack")) {
    return (
      <span className="ord-status-pill packed">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        Packed
      </span>
    );
  }
  if (norm.includes("confirm")) {
    return (
      <span className="ord-status-pill confirmed">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Confirmed
      </span>
    );
  }
  if (norm.includes("place")) {
    return (
      <span className="ord-status-pill placed">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Placed
      </span>
    );
  }
  if (norm.includes("process")) {
    return (
      <span className="ord-status-pill processing">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Processing
      </span>
    );
  }
  if (norm.includes("pend")) {
    return (
      <span className="ord-status-pill pending">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Pending
      </span>
    );
  }
  return <span className="ord-status-pill returned">{value}</span>;
}

/* =========================================================
   MAIN ORDERS COMPONENT (07)
========================================================= */
export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [activeTab, setActiveTab] = useState("All Orders");
  const [globalSearch, setGlobalSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [designerFilter, setDesignerFilter] = useState("All");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [viewOrderModal, setViewOrderModal] = useState(null);
  const [editOrderModal, setEditOrderModal] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  /* -------------------------------------------------------
     FETCH LIVE DATA STRICTLY FROM BACKEND DATABASE
  ------------------------------------------------------- */
  const loadLiveOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        getOrders().catch((err) => {
          console.error("Failed to fetch live orders:", err);
          return [];
        }),
        getOrderStats().catch((err) => {
          console.warn("Live order stats endpoint:", err);
          return null;
        }),
      ]);

      if (statsRes) {
        setStats(statsRes);
      }

      const orderList = Array.isArray(ordersRes)
        ? ordersRes
        : Array.isArray(ordersRes?.results)
        ? ordersRes.results
        : [];

      // Map real backend database orders directly
      const mapped = orderList.map((o, idx) => {
        const rawId = o.id;
        const orderNum = o.order_number || (o.id ? `ORD${1000 + o.id}` : `ORD${1000 + idx + 1}`);
        const custName = o.shipping_full_name || o.customer_name || "Guest Customer";
        const designerName = o.items?.[0]?.brand_name || o.designer_name || "Zenve Atelier";
        const amount = Number(o.total || o.total_amount || o.subtotal || 0);
        const pStatus = (o.payment_status || "Pending").toUpperCase().includes("PAID") ? "Paid" : (o.payment_method === "COD" || (o.payment_status || "").toUpperCase().includes("COD") ? "COD" : o.payment_status || "Pending");
        const oStatus = o.order_status || o.status || "Pending";
        const dt = o.created_at
          ? new Date(o.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—";
        const dlvDt = o.estimated_delivery || (oStatus.toLowerCase().includes("deliver") ? dt : "—");

        const itemsCount = o.items ? o.items.length : 1;
        const thumbs = (o.items && o.items.length > 0)
          ? o.items.map((it) => it.product_image).filter(Boolean).slice(0, 3)
          : [];

        return {
          rawId,
          id: orderNum,
          customer: custName,
          avatar: o.customer_avatar || null,
          itemCount: itemsCount,
          thumbs,
          designer: designerName,
          orderDate: dt,
          amount,
          paymentStatus: pStatus,
          orderStatus: oStatus,
          deliveryDate: dlvDt,
          phone: o.shipping_phone || o.customer_phone || "",
          address: [
            o.shipping_address_line1,
            o.shipping_address_line2,
            o.shipping_city,
            o.shipping_state,
            o.shipping_postal_code,
          ].filter(Boolean).join(", ") || o.delivery_address || "",
          raw: o,
        };
      });

      setOrders(mapped);
    } catch (err) {
      console.error("Backend orders loading error:", err);
      showErrorToast("Failed to load orders from backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveOrders();
  }, []);

  // Designers dropdown list strictly from live orders
  const uniqueDesigners = useMemo(() => {
    const list = Array.from(new Set(orders.map((o) => o.designer))).filter(Boolean);
    return list.sort();
  }, [orders]);

  /* -------------------------------------------------------
     DYNAMIC KPI VALUES DERIVED DIRECTLY FROM DATABASE
  ------------------------------------------------------- */
  const kpiData = useMemo(() => {
    const total = stats?.total_orders ?? orders.length;
    const pending = stats?.pending_orders ?? orders.filter((o) => {
      const s = o.orderStatus.toLowerCase();
      return s.includes("pend") || s.includes("place");
    }).length;
    const processing = stats?.processing_orders ?? orders.filter((o) => {
      const s = o.orderStatus.toLowerCase();
      return s.includes("process") || s.includes("pack") || s.includes("confirm");
    }).length;
    const shipped = stats?.shipped_orders ?? orders.filter((o) => {
      const s = o.orderStatus.toLowerCase();
      return s.includes("ship") || s.includes("transit") || s.includes("out");
    }).length;
    const delivered = stats?.delivered_orders ?? orders.filter((o) => {
      return o.orderStatus.toLowerCase().includes("deliver");
    }).length;
    const cancelled = stats?.cancelled_orders ?? orders.filter((o) => {
      return o.orderStatus.toLowerCase().includes("cancel") || o.orderStatus.toLowerCase().includes("reject");
    }).length;

    return { total, pending, processing, shipped, delivered, cancelled };
  }, [orders, stats]);

  /* -------------------------------------------------------
     FILTER LOGIC APPLIED TO REAL DATABASE RECORDS
  ------------------------------------------------------- */
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      // 1. Status Tab filter
      const normStatus = item.orderStatus.toLowerCase();
      if (activeTab === "Placed" && !(normStatus.includes("place") || normStatus.includes("pend"))) return false;
      if (activeTab === "Confirmed" && !normStatus.includes("confirm")) return false;
      if (activeTab === "Packed" && !(normStatus.includes("pack") || normStatus.includes("process"))) return false;
      if (activeTab === "Pending" && !(normStatus.includes("pend") || normStatus.includes("place"))) return false;
      if (activeTab === "Processing" && !(normStatus.includes("process") || normStatus.includes("pack") || normStatus.includes("confirm"))) return false;
      if (activeTab === "Shipped" && !(normStatus.includes("ship") || normStatus.includes("transit"))) return false;
      if (activeTab === "Out of delivery" && !normStatus.includes("out")) return false;
      if (activeTab === "Delivered" && !(normStatus.includes("deliver") && !normStatus.includes("out"))) return false;
      if (activeTab === "Cancelled" && !(normStatus.includes("cancel") || normStatus.includes("reject"))) return false;
      if (activeTab === "Returned" && !normStatus.includes("return")) return false;

      // 2. Search query (Global or table search)
      const q = (globalSearch || tableSearch).trim().toLowerCase();
      if (q) {
        const idMatch = item.id.toLowerCase().includes(q);
        const custMatch = item.customer.toLowerCase().includes(q);
        const desMatch = item.designer.toLowerCase().includes(q);
        const phoneMatch = (item.phone || "").toLowerCase().includes(q);
        const addrMatch = (item.address || "").toLowerCase().includes(q);
        if (!idMatch && !custMatch && !desMatch && !phoneMatch && !addrMatch) return false;
      }

      // 3. Dropdown filters
      if (orderStatusFilter !== "All" && !normStatus.includes(orderStatusFilter.toLowerCase())) return false;
      if (deliveryStatusFilter !== "All" && !normStatus.includes(deliveryStatusFilter.toLowerCase())) return false;
      if (paymentStatusFilter !== "All" && item.paymentStatus.toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
      if (designerFilter !== "All" && item.designer !== designerFilter) return false;

      return true;
    });
  }, [orders, activeTab, globalSearch, tableSearch, orderStatusFilter, deliveryStatusFilter, paymentStatusFilter, designerFilter]);

  /* -------------------------------------------------------
     PAGINATION & SELECTION
  ------------------------------------------------------- */
  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Auto reset page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const isAllSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedIds.has(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      paginatedOrders.forEach((o) => next.add(o.id));
      setSelectedIds(next);
    }
  };

  const handleToggleRow = (id, e) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleResetFilters = () => {
    setGlobalSearch("");
    setTableSearch("");
    setActiveTab("All Orders");
    setDateRangeFilter("All");
    setOrderStatusFilter("All");
    setDeliveryStatusFilter("All");
    setPaymentStatusFilter("All");
    setDesignerFilter("All");
    setCurrentPage(1);
    setSelectedIds(new Set());
    showSuccessToast("All filters have been reset.");
  };

  const handleExport = () => {
    if (filteredOrders.length === 0) {
      showErrorToast("No orders available to export.");
      return;
    }
    const headers = ["Order ID", "Customer", "Designer", "Order Date", "Amount", "Payment Status", "Order Status", "Delivery Date"];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customer}"`,
      `"${o.designer}"`,
      o.orderDate,
      o.amount,
      o.paymentStatus,
      o.orderStatus,
      o.deliveryDate,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Zenve_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast(`Exported ${filteredOrders.length} orders successfully.`);
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const target = orders.find((o) => o.id === orderId);
      if (target && target.rawId) {
        if (newStatus.toUpperCase() === "CANCELLED") {
          await cancelOrder(target.rawId);
        } else {
          await transitionOrder(target.rawId, newStatus);
        }
      }
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o))
      );
      setEditOrderModal(null);
      showSuccessToast(`Order ${orderId} updated to ${newStatus}`);
    } catch (err) {
      showErrorToast(`Failed to update status: ${err.message}`);
    }
  };

  return (
    <div className="ord-page-wrapper">
      {/* =====================================================
          1. LUXURY HERO BANNER WITH FASHION COUTURE ATELIER
      ===================================================== */}
      <section className="ord-hero-banner">
        <div className="ord-hero-content">
          <h1 className="ord-hero-title">Orders</h1>
          <p className="ord-hero-subtitle">
            Manage, track and fulfill all customer orders seamlessly
          </p>
        </div>

        {/* Fashion Montage Artwork & Golden Glow */}
        <div className="ord-hero-art-wrap">
          <img
            src={bannerImg}
            alt="Zenve Fashion Haute Couture Atelier"
            className="ord-hero-art-img"
          />
          <div className="ord-hero-glow-overlay" />
        </div>
      </section>

      {/* =====================================================
          3. 6 KPI METRIC CARDS ROW (LIVE DATABASE METRICS)
      ===================================================== */}
      <section className="ord-kpi-grid">
        {/* 1. Total Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap total">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Total Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.total.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend green">↗ 12%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,18 14,14 26,19 38,10 50,14 62,4" />
        </div>

        {/* 2. Pending Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap pending">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Pending Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.pending.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend orange">↗ 8%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,18 16,16 30,12 44,15 56,8 62,6" />
        </div>

        {/* 3. Processing Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap processing">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Processing Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.processing.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend green">↗ 15%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,16 14,14 26,17 38,9 50,12 62,5" />
        </div>

        {/* 4. Shipped Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap shipped">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Shipped Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.shipped.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend green">↗ 18%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,19 14,15 28,17 40,8 52,11 62,4" />
        </div>

        {/* 5. Delivered Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap delivered">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Delivered Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.delivered.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend green">↗ 20%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,18 16,13 30,17 44,9 56,12 62,3" />
        </div>

        {/* 6. Cancelled Orders */}
        <div className="ord-kpi-card">
          <div className="ord-kpi-info-group">
            <div className="ord-kpi-icon-wrap cancelled">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="ord-kpi-text-block">
              <span className="ord-kpi-title">Cancelled Orders</span>
              <div className="ord-kpi-value-row">
                <span className="ord-kpi-number">{kpiData.cancelled.toLocaleString("en-IN")}</span>
                <span className="ord-kpi-trend red">↘ 6%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#DC2626" points="2,8 14,10 26,6 40,14 52,12 62,19" />
        </div>
      </section>

      {/* =====================================================
          4. STATUS TAB PILLS
      ===================================================== */}
      <section className="ord-tabs-row" aria-label="Order Status Navigation">
        {["All Orders", "Placed", "Confirmed", "Packed", "Shipped", "Out of delivery", "Delivered", "Cancelled"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`ord-tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
          >
            {tab}
          </button>
        ))}
      </section>

      {/* =====================================================
          5. FILTER & ACTION TOOLBAR
      ===================================================== */}
      <section className="ord-filter-bar">
        {/* Table Search */}
        <div className="ord-table-search-wrap">
          <span className="ord-search-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            className="ord-table-search-input"
            placeholder="Search by order ID, customer name, product, designer..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="ord-dropdown-filters-group">
          <div className="ord-filter-item">
            <span className="ord-filter-label">Date Range</span>
            <select
              className="ord-select-control"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          <div className="ord-filter-item">
            <span className="ord-filter-label">Order Status</span>
            <select
              className="ord-select-control"
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Placed">Placed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Packed">Packed</option>
              <option value="Shipped">Shipped</option>
              <option value="Out of delivery">Out of delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="ord-filter-item">
            <span className="ord-filter-label">Order Status</span>
            <select
              className="ord-select-control"
              value={deliveryStatusFilter}
              onChange={(e) => setDeliveryStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Delivered">Delivered</option>
              <option value="Shipped">Shipped</option>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="ord-filter-item">
            <span className="ord-filter-label">Payment Status</span>
            <select
              className="ord-select-control"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="COD">COD</option>
            </select>
          </div>

          <div className="ord-filter-item">
            <span className="ord-filter-label">Designer</span>
            <select
              className="ord-select-control"
              value={designerFilter}
              onChange={(e) => setDesignerFilter(e.target.value)}
            >
              <option value="All">All</option>
              {uniqueDesigners.map((des) => (
                <option key={des} value={des}>
                  {des}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="ord-filter-actions">
          <button
            type="button"
            className="ord-btn-reset"
            onClick={handleResetFilters}
            title="Reset all filters"
          >
            <ResetIcon />
            <span>Reset</span>
          </button>

          <button
            type="button"
            className="ord-btn-export"
            onClick={handleExport}
            title="Export filtered orders to CSV"
          >
            <ExportIcon />
            <span>Export</span>
          </button>
        </div>
      </section>

      {/* =====================================================
          6. ORDERS DATA TABLE
      ===================================================== */}
      <section className="ord-table-card">
        <div className="ord-table-container">
          <table className="ord-table">
            <thead>
              <tr>
                <th>Sl.No</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Products</th>
                <th>Designer</th>
                <th>Order Date</th>
                <th>Amount</th>
                <th>Payment Status</th>
                <th>Order Status</th>
                <th>Delivery Date</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "48px 20px", color: "#8C7B68" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          border: "3px solid #EFE6D8",
                          borderTopColor: "#9E6424",
                          borderRadius: "50%",
                          animation: "ordSpin 0.8s linear infinite",
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>Connecting to database...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "48px 20px", color: "#8C7B68" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "14px", color: "#4A2E12" }}>No Orders Found</strong>
                      <span style={{ fontSize: "12.5px" }}>
                        {orders.length === 0
                          ? "There are currently no orders in the database."
                          : "No orders match your filter criteria."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const formattedIdx = globalIdx < 10 ? `0${globalIdx}` : `${globalIdx}`;

                  return (
                    <tr key={order.id}>
                      <td className="ord-row-idx">{formattedIdx}</td>

                      <td className="ord-id-code">{order.id}</td>

                      {/* Customer */}
                      <td>
                        <div className="ord-customer-cell">
                          {order.avatar ? (
                            <img
                              src={order.avatar}
                              alt={order.customer}
                              className="ord-customer-avatar"
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="ord-customer-avatar-initials"
                            style={{ display: order.avatar ? "none" : "flex" }}
                          >
                            {order.customer.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="ord-customer-name">{order.customer}</span>
                        </div>
                      </td>

                      {/* Products Thumbnail Strip */}
                      <td>
                        <div className="ord-products-cell">
                          <div className="ord-product-thumbs-strip">
                            {(order.thumbs || []).length > 0 ? (
                              order.thumbs.map((t, i) => (
                                <img
                                  key={i}
                                  src={t}
                                  alt="garment preview"
                                  className="ord-product-thumb"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ))
                            ) : (
                              <div
                                style={{
                                  width: "24px",
                                  height: "28px",
                                  borderRadius: "3px",
                                  background: "#F5EEE2",
                                  border: "1px solid #E0D3C1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  color: "#8C7B6A",
                                }}
                              >
                                👗
                              </div>
                            )}
                          </div>
                          <span className="ord-product-count-badge">
                            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </td>

                      {/* Designer */}
                      <td className="ord-designer-name">{order.designer}</td>

                      {/* Order Date */}
                      <td className="ord-date-text">{order.orderDate}</td>

                      {/* Amount */}
                      <td className="ord-amount-text">
                        ₹{Number(order.amount).toLocaleString("en-IN")}
                      </td>

                      {/* Payment Status */}
                      <td>
                        <StatusBadge type="payment" value={order.paymentStatus} />
                      </td>

                      {/* Order Status */}
                      <td>
                        <StatusBadge type="order" value={order.orderStatus} />
                      </td>

                      {/* Delivery Date */}
                      <td className="ord-date-text">{order.deliveryDate}</td>

                      {/* Actions */}
                      <td>
                        <div className="ord-action-icons">
                          <button
                            type="button"
                            className="ord-icon-action-btn"
                            title="View Order Details"
                            onClick={() => setViewOrderModal(order)}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            className="ord-icon-action-btn"
                            title="Update Status"
                            onClick={() => setEditOrderModal(order)}
                          >
                            <EditIcon />
                          </button>
                          <div style={{ position: "relative" }}>
                            <button
                              type="button"
                              className="ord-icon-action-btn"
                              title="More Options"
                              onClick={() => setActiveMenuId(activeMenuId === order.id ? null : order.id)}
                            >
                              <MoreVerticalIcon />
                            </button>

                            {/* Dropdown Menu */}
                            {activeMenuId === order.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  background: "#FFFFFF",
                                  border: "1px solid #E6DAC8",
                                  borderRadius: "8px",
                                  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                                  zIndex: 100,
                                  minWidth: "150px",
                                  padding: "6px 0",
                                }}
                              >
                                <button
                                  type="button"
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 14px",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    color: "#3D2714",
                                  }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.id);
                                    showSuccessToast(`Copied ID ${order.id}`);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  Copy Order ID
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 14px",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    color: "#3D2714",
                                  }}
                                  onClick={() => {
                                    setViewOrderModal(order);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  View Invoice
                                </button>
                                <button
                                  type="button"
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "8px 14px",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    color: "#DC2626",
                                  }}
                                  onClick={() => {
                                    handleStatusUpdate(order.id, "Cancelled");
                                    setActiveMenuId(null);
                                  }}
                                >
                                  Cancel Order
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

        {/* =====================================================
            7. TABLE FOOTER & PAGINATION (DYNAMIC DATABASE RECORDS)
        ===================================================== */}
        <footer className="ord-table-footer">
          <div className="ord-count-summary">
            Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} orders
          </div>

          <nav className="ord-pagination-nav" aria-label="Orders table pagination">
            <button
              type="button"
              className="ord-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) {
                  acc.push(-arr[i - 1]); // marker for ellipsis
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p) => {
                if (p < 0) {
                  return (
                    <span key={`ell-${p}`} className="ord-page-ellipsis">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    type="button"
                    className={`ord-page-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

            <button
              type="button"
              className="ord-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </nav>
        </footer>
      </section>

      {/* =====================================================
          8. VIEW ORDER DETAILS MODAL
      ===================================================== */}
      {viewOrderModal && (
        <div className="ord-modal-overlay" onClick={() => setViewOrderModal(null)}>
          <div className="ord-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ord-modal-header">
              <h2 className="ord-modal-title">Order Details — {viewOrderModal.id}</h2>
              <button
                type="button"
                className="ord-modal-close-btn"
                onClick={() => setViewOrderModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="ord-modal-body">
              {/* Order Info */}
              <div className="ord-detail-section">
                <div className="ord-detail-section-title">Order Overview</div>
                <div className="ord-detail-grid">
                  <div className="ord-detail-row">
                    <span>Order Date</span>
                    <span>{viewOrderModal.orderDate}</span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Order Status</span>
                    <span>
                      <StatusBadge type="order" value={viewOrderModal.orderStatus} />
                    </span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Payment Method</span>
                    <span>
                      {viewOrderModal.paymentStatus === "Paid"
                        ? "Online / Card (Paid)"
                        : "Cash On Delivery (COD)"}
                    </span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Total Amount</span>
                    <span style={{ color: "#9E6424", fontSize: "15px" }}>
                      ₹{Number(viewOrderModal.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="ord-detail-section">
                <div className="ord-detail-section-title">Customer &amp; Shipping</div>
                <div className="ord-detail-grid">
                  <div className="ord-detail-row">
                    <span>Customer Name</span>
                    <span>{viewOrderModal.customer}</span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Contact Phone</span>
                    <span>{viewOrderModal.phone || "—"}</span>
                  </div>
                  <div className="ord-detail-row" style={{ gridColumn: "span 2" }}>
                    <span>Shipping Address</span>
                    <span>{viewOrderModal.address || "—"}</span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Estimated Delivery</span>
                    <span>{viewOrderModal.deliveryDate}</span>
                  </div>
                  <div className="ord-detail-row">
                    <span>Assigned Designer</span>
                    <span>{viewOrderModal.designer}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="ord-detail-section">
                <div className="ord-detail-section-title">Line Items ({viewOrderModal.itemCount})</div>
                <div className="ord-items-list">
                  {viewOrderModal.raw?.items && viewOrderModal.raw.items.length > 0 ? (
                    viewOrderModal.raw.items.map((it, idx) => (
                      <div key={idx} className="ord-item-card">
                        {it.product_image && (
                          <img
                            src={it.product_image}
                            alt={it.product_name || "garment"}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", fontSize: "13px" }}>
                            {it.product_name || `Item #${idx + 1}`}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#7E7265" }}>
                            {it.brand_name ? `Designer: ${it.brand_name} • ` : ""}
                            {it.size ? `Size: ${it.size} • ` : ""}
                            Qty: {it.quantity || 1}
                          </div>
                        </div>
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "#2D2319" }}>
                          ₹{Number(it.total || it.price || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "8px", fontSize: "12.5px", color: "#7E7265" }}>
                      1 item included in order • Total: ₹{Number(viewOrderModal.amount).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ord-modal-footer">
              <button
                type="button"
                className="ord-btn-reset"
                onClick={() => setViewOrderModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="ord-btn-export"
                onClick={() => {
                  window.print();
                }}
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          9. EDIT ORDER STATUS MODAL
      ===================================================== */}
      {editOrderModal && (
        <div className="ord-modal-overlay" onClick={() => setEditOrderModal(null)}>
          <div className="ord-modal-dialog" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="ord-modal-header">
              <h2 className="ord-modal-title">Update Status — {editOrderModal.id}</h2>
              <button
                type="button"
                className="ord-modal-close-btn"
                onClick={() => setEditOrderModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="ord-modal-body">
              <p style={{ margin: 0, fontSize: "13px", color: "#6C5B49" }}>
                Select the new fulfillment status for customer{" "}
                <strong>{editOrderModal.customer}</strong>:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {["Placed", "Confirmed", "Packed", "Shipped", "Out of delivery", "Delivered", "Cancelled"].map((st) => {
                  const isCurrent =
                    editOrderModal.orderStatus?.toLowerCase() === st.toLowerCase() ||
                    (st === "Placed" && editOrderModal.orderStatus?.toLowerCase() === "pending") ||
                    (st === "Packed" && editOrderModal.orderStatus?.toLowerCase() === "processing") ||
                    (st === "Out of delivery" && editOrderModal.orderStatus?.toLowerCase() === "out for delivery");

                  return (
                    <button
                      key={st}
                      type="button"
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        borderRadius: "8px",
                        border: isCurrent ? "2px solid #9E6424" : "1px solid #E6D8C4",
                        background: isCurrent ? "#FAF4E8" : "#FFFFFF",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#3D2714",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => handleStatusUpdate(editOrderModal.id, st)}
                    >
                      <span>{st}</span>
                      <StatusBadge type="order" value={st} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ord-modal-footer">
              <button
                type="button"
                className="ord-btn-reset"
                onClick={() => setEditOrderModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}