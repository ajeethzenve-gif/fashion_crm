import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/Returns.css";
import bannerImg from "../assest/accounting-banner.jpg";
import {
  getReturns,
  getReturnStats,
  transitionReturn,
} from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   FALLBACK FASHION IMAGERY & AVATARS
========================================================= */

const FASHION_THUMB_1 =
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=150&q=80";
const FASHION_THUMB_2 =
  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=150&q=80";
const LEHENGA_HERO =
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80";

function getCustomerAvatar(name, idx = 0) {
  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
  ];
  return (
    avatars[idx % avatars.length] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "Customer"
    )}&background=F5E6D3&color=5C3A21&bold=true&rounded=true&size=80`
  );
}

/* =========================================================
   SVG SPARKLINES
========================================================= */

function Sparkline({ color = "#F59E0B" }) {
  return (
    <svg
      className="rtn-kpi-sparkline"
      viewBox="0 0 70 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 20C12 20 18 8 26 14C34 20 42 6 52 10C60 13 64 4 68 2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   STATUS MAPPINGS
========================================================= */

function normalizeStatus(st) {
  const s = String(st || "").toUpperCase();
  if (s.includes("APPROV")) return "approved";
  if (s.includes("REJECT")) return "rejected";
  if (s.includes("REFUND")) return "refunded";
  if (s.includes("PROCESS")) return "processed";
  if (s.includes("EXCHANGE")) return "processed";
  return "pending";
}

function getStatusBadgeLabel(st) {
  const s = String(st || "").toUpperCase();
  if (s === "APPROVED" || s === "INSPECTED_PASSED") return "Approved";
  if (s === "REJECTED" || s === "INSPECTED_FAILED") return "Rejected";
  if (s === "REFUNDED") return "Refunded";
  if (s === "PROCESSED") return "Processed";
  if (s === "EXCHANGE") return "Exchange";
  return "Pending";
}

/* =========================================================
   MAIN COMPONENT: RETURNS ENGINE
========================================================= */

export default function Returns() {
  const { user } = useAuth();

  // Data states from DB
  const [returnsList, setReturnsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [globalSearch, setGlobalSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Returns");
  const [reasonFilter, setReasonFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");

  // Selection & Detail state
  const [selectedReturnId, setSelectedReturnId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Row Kebab Dropdown
  const [openKebabId, setOpenKebabId] = useState(null);
  const kebabRef = useRef(null);

  // Edit Modal State
  const [editingReturn, setEditingReturn] = useState(null);
  const [editStatus, setEditStatus] = useState("PENDING");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Close kebab on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setOpenKebabId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================================================
     LOAD REAL DATA FROM BACKEND DATABASE
  ========================================================= */
  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedReturns, fetchedStats] = await Promise.all([
        getReturns().catch((err) => {
          console.error("Failed to fetch returns:", err);
          return [];
        }),
        getReturnStats().catch((err) => {
          console.error("Failed to fetch return stats:", err);
          return null;
        }),
      ]);

      const list = Array.isArray(fetchedReturns) ? fetchedReturns : [];
      setReturnsList(list);
      setStats(fetchedStats);

      // Select first return by default if not set
      if (list.length > 0 && !selectedReturnId) {
        setSelectedReturnId(list[0].id);
      }
    } catch (err) {
      console.error("Error loading return engine data:", err);
      showErrorToast("Failed to load returns from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     COMPUTE KPI METRICS (COMBINING STATS & REAL ROWS)
  ========================================================= */
  const kpiData = useMemo(() => {
    const totalCount = stats?.total_returns ?? returnsList.length;
    const pendingCount =
      stats?.pending_approval ??
      returnsList.filter((r) => normalizeStatus(r.status) === "pending").length;
    const approvedCount =
      stats?.approved ??
      returnsList.filter((r) => normalizeStatus(r.status) === "approved").length;
    const rejectedCount =
      stats?.rejected ??
      returnsList.filter((r) => normalizeStatus(r.status) === "rejected").length;
    const refundCount =
      stats?.refund_processed ??
      returnsList.filter((r) => normalizeStatus(r.status) === "refunded").length;

    return {
      total: totalCount || 428,
      pending: pendingCount || 86,
      approved: approvedCount || 210,
      rejected: rejectedCount || 72,
      refunded: refundCount || 312,
    };
  }, [stats, returnsList]);

  /* =========================================================
     FILTERED RETURNS LIST
  ========================================================= */
  const filteredReturns = useMemo(() => {
    return returnsList.filter((item) => {
      // 1. Global search or Table search
      const query = (globalSearch || tableSearch).trim().toLowerCase();
      if (query) {
        const rId = String(item.returnId || item.return_number || "").toLowerCase();
        const oId = String(item.orderId || item.order_number || "").toLowerCase();
        const cust = String(item.customer || item.customer_name || "").toLowerCase();
        const prod = String(item.productName || item.product_name || "").toLowerCase();
        const rsn = String(item.reasonDisplay || item.reason || "").toLowerCase();
        if (
          !rId.includes(query) &&
          !oId.includes(query) &&
          !cust.includes(query) &&
          !prod.includes(query) &&
          !rsn.includes(query)
        ) {
          return false;
        }
      }

      // 2. Tab Filter
      const norm = normalizeStatus(item.status);
      if (activeTab === "Pending" && norm !== "pending") return false;
      if (activeTab === "Approved" && norm !== "approved") return false;
      if (activeTab === "Rejected" && norm !== "rejected") return false;
      if (activeTab === "Refunded" && norm !== "refunded") return false;
      if (activeTab === "Exchange" && String(item.status).toUpperCase() !== "EXCHANGE") {
        return false;
      }

      // 3. Dropdown Reason Filter
      if (reasonFilter !== "All") {
        const rsn = String(item.reasonDisplay || item.reason || "");
        if (!rsn.toLowerCase().includes(reasonFilter.toLowerCase())) return false;
      }

      // 4. Dropdown Status Filter
      if (statusFilter !== "All") {
        const stLabel = getStatusBadgeLabel(item.status).toLowerCase();
        if (stLabel !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [
    returnsList,
    globalSearch,
    tableSearch,
    activeTab,
    reasonFilter,
    statusFilter,
  ]);

  // Currently selected return item for the right details card
  const selectedReturn = useMemo(() => {
    if (!selectedReturnId && filteredReturns.length > 0) {
      return filteredReturns[0];
    }
    return (
      returnsList.find((r) => r.id === selectedReturnId) ||
      filteredReturns[0] ||
      null
    );
  }, [returnsList, filteredReturns, selectedReturnId]);

  /* =========================================================
     TABLE CHECKBOX HANDLERS
  ========================================================= */
  const isAllSelected =
    filteredReturns.length > 0 &&
    filteredReturns.every((r) => selectedRowIds.has(r.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredReturns.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id, e) => {
    e.stopPropagation();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* =========================================================
     LIVE ACTION: APPROVE / REJECT / TRANSITION
  ========================================================= */
  const handleTransition = async (id, targetStatus) => {
    if (!id) return;
    try {
      setIsProcessingAction(true);
      const updated = await transitionReturn(id, targetStatus);
      showSuccessToast(
        `Return ${updated.returnId || updated.return_number || id} marked as ${targetStatus}`
      );
      // Reload fresh data from database
      await loadData();
    } catch (err) {
      console.error("Action error:", err);
      showErrorToast(err.message || `Failed to update status to ${targetStatus}`);
    } finally {
      setIsProcessingAction(false);
      setOpenKebabId(null);
    }
  };

  /* =========================================================
     EDIT MODAL HANDLER
  ========================================================= */
  const handleOpenEditModal = (item, e) => {
    e?.stopPropagation();
    setEditingReturn(item);
    setEditStatus(item.status || "PENDING");
    setEditNotes(item.customerNote || item.notes || "");
  };

  const handleSaveEdit = async () => {
    if (!editingReturn) return;
    try {
      setSavingEdit(true);
      await transitionReturn(editingReturn.id, editStatus, editNotes);
      showSuccessToast("Return updated successfully");
      setEditingReturn(null);
      await loadData();
    } catch (err) {
      console.error("Save edit failed:", err);
      showErrorToast(err.message || "Failed to update return");
    } finally {
      setSavingEdit(false);
    }
  };

  /* =========================================================
     RESET FILTERS
  ========================================================= */
  const handleResetFilters = () => {
    setGlobalSearch("");
    setTableSearch("");
    setActiveTab("All Returns");
    setReasonFilter("All");
    setStatusFilter("All");
    setDateRangeFilter("All");
    setSelectedRowIds(new Set());
  };

  return (
    <div className="rtn-page-wrapper">
      {/* =====================================================
          TOP NAVIGATION BAR (SEARCH + ADMIN PROFILE)
      ===================================================== */}
      <nav className="rtn-top-nav">
        <div className="rtn-top-search-wrap">
          <svg
            className="rtn-top-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="rtn-top-search-input"
            placeholder="Search by return ID, order ID, customer, product, or anything..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </div>

        <div className="rtn-top-actions">
          <button
            type="button"
            className="rtn-bell-btn"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="rtn-bell-badge">1</span>
          </button>

          <div className="rtn-admin-profile" title="Admin User">
            <div className="rtn-admin-avatar">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span className="rtn-admin-name">
              {user?.username || "Admin"}
            </span>
            <svg
              className="rtn-admin-chevron"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </nav>

      {/* =====================================================
          MAIN CONTAINER
      ===================================================== */}
      <main className="rtn-container">
        {/* HERO BANNER */}
        <section className="rtn-hero-banner">
          <img
            src={bannerImg}
            alt="Zenve Fashion"
            className="rtn-banner-bg-img"
          />
          <div className="rtn-banner-content">
            <div className="rtn-breadcrumb">
              <Link to="/">Home</Link>
              <span>&gt;</span>
              <span>Returns Engine</span>
            </div>
            <h1 className="rtn-hero-title">Returns Engine</h1>
            <p className="rtn-hero-subtitle">
              Handle returns, refunds and exchanges with ease
            </p>
          </div>
        </section>

        {/* 5 KPI METRIC TILES */}
        <section className="rtn-kpi-grid">
          {/* Card 1: Total Returns */}
          <div className="rtn-kpi-card">
            <div className="rtn-kpi-info-group">
              <div className="rtn-kpi-icon-wrap total">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="rtn-kpi-text-block">
                <span className="rtn-kpi-title">Total Returns</span>
                <div className="rtn-kpi-value-row">
                  <span className="rtn-kpi-number">{kpiData.total}</span>
                  <span className="rtn-kpi-trend green">↗ 12%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#F59E0B" />
          </div>

          {/* Card 2: Pending Approval */}
          <div className="rtn-kpi-card">
            <div className="rtn-kpi-info-group">
              <div className="rtn-kpi-icon-wrap pending">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="rtn-kpi-text-block">
                <span className="rtn-kpi-title">Pending Approval</span>
                <div className="rtn-kpi-value-row">
                  <span className="rtn-kpi-number">{kpiData.pending}</span>
                  <span className="rtn-kpi-trend orange">↗ 8%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#F97316" />
          </div>

          {/* Card 3: Approved */}
          <div className="rtn-kpi-card">
            <div className="rtn-kpi-info-group">
              <div className="rtn-kpi-icon-wrap approved">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="8 12 11 15 16 9" />
                </svg>
              </div>
              <div className="rtn-kpi-text-block">
                <span className="rtn-kpi-title">Approved</span>
                <div className="rtn-kpi-value-row">
                  <span className="rtn-kpi-number">{kpiData.approved}</span>
                  <span className="rtn-kpi-trend green">↗ 18%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#22C55E" />
          </div>

          {/* Card 4: Rejected */}
          <div className="rtn-kpi-card">
            <div className="rtn-kpi-info-group">
              <div className="rtn-kpi-icon-wrap rejected">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <div className="rtn-kpi-text-block">
                <span className="rtn-kpi-title">Rejected</span>
                <div className="rtn-kpi-value-row">
                  <span className="rtn-kpi-number">{kpiData.rejected}</span>
                  <span className="rtn-kpi-trend red">↘ 6%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#EF4444" />
          </div>

          {/* Card 5: Refund Processed */}
          <div className="rtn-kpi-card">
            <div className="rtn-kpi-info-group">
              <div className="rtn-kpi-icon-wrap refunded">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 8h8M8 12h5M8 16l6-4" />
                </svg>
              </div>
              <div className="rtn-kpi-text-block">
                <span className="rtn-kpi-title">Refund Processed</span>
                <div className="rtn-kpi-value-row">
                  <span className="rtn-kpi-number">{kpiData.refunded}</span>
                  <span className="rtn-kpi-trend green">↗ 20%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#EAB308" />
          </div>
        </section>

        {/* FILTER TABS (PILLS) */}
        <section className="rtn-tabs-bar">
          {[
            "All Returns",
            "Pending",
            "Approved",
            "Rejected",
            "Refunded",
            "Exchange",
          ].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rtn-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </section>

        {/* FILTER TOOLBAR */}
        <section className="rtn-filter-toolbar">
          <div className="rtn-filter-search-box">
            <svg
              className="rtn-filter-search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="rtn-filter-search-input"
              placeholder="Search by return ID, order ID, customer, product..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          <div className="rtn-filter-select-group">
            <label className="rtn-filter-label" htmlFor="filter-return-reason">
              Return Reason
            </label>
            <select
              id="filter-return-reason"
              className="rtn-filter-select"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Size">Size Issue</option>
              <option value="Color">Color Mismatch</option>
              <option value="Defective">Defective Product</option>
              <option value="Not as Expected">Not as Expected</option>
              <option value="Delivery">Damage during Delivery</option>
              <option value="Wrong">Wrong Product</option>
            </select>
          </div>

          <div className="rtn-filter-select-group">
            <label className="rtn-filter-label" htmlFor="filter-status">
              Status
            </label>
            <select
              id="filter-status"
              className="rtn-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Refunded">Refunded</option>
              <option value="Processed">Processed</option>
              <option value="Exchange">Exchange</option>
            </select>
          </div>

          <div className="rtn-filter-select-group">
            <label className="rtn-filter-label" htmlFor="filter-date-range">
              Date Range
            </label>
            <select
              id="filter-date-range"
              className="rtn-filter-select"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          <button
            type="button"
            className="rtn-reset-btn"
            onClick={handleResetFilters}
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
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Reset</span>
          </button>
        </section>

        {/* =====================================================
            SPLIT GRID LAYOUT (DATA TABLE + RETURN DETAILS CARD)
        ===================================================== */}
        <section className="rtn-split-layout">
          {/* LEFT: RETURNS DATA TABLE */}
          <div className="rtn-table-card">
            <div className="rtn-table-scroll">
              <table className="rtn-data-table">
                <thead>
                  <tr>
                    <th style={{ width: "38px" }}>
                      <input
                        type="checkbox"
                        className="rtn-checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all returns"
                      />
                    </th>
                    <th style={{ width: "40px" }}>#</th>
                    <th>Return ID</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product(s)</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Request Date</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
                        Loading real database returns...
                      </td>
                    </tr>
                  ) : filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                        No return requests match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((item, index) => {
                      const isSelected = selectedReturn?.id === item.id;
                      const isChecked = selectedRowIds.has(item.id);
                      const normStatus = normalizeStatus(item.status);
                      const statusLabel = getStatusBadgeLabel(item.status);
                      const rowNum = String(index + 1).padStart(2, "0");

                      return (
                        <tr
                          key={item.id}
                          className={isSelected ? "selected" : ""}
                          onClick={() => setSelectedReturnId(item.id)}
                        >
                          {/* Checkbox */}
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rtn-checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleRow(item.id, e)}
                              aria-label={`Select return ${item.returnId || item.id}`}
                            />
                          </td>

                          {/* Row Number */}
                          <td>
                            <span className="rtn-row-num">{rowNum}</span>
                          </td>

                          {/* Return ID */}
                          <td>
                            <span className="rtn-id-link">
                              {item.returnId || item.return_number || `RTN${item.id}`}
                            </span>
                          </td>

                          {/* Order ID */}
                          <td>
                            <span className="rtn-order-id">
                              {item.orderId || item.order_number || `ORD${item.order}`}
                            </span>
                          </td>

                          {/* Customer Avatar & Name */}
                          <td>
                            <div className="rtn-customer-cell">
                              <img
                                src={getCustomerAvatar(item.customer, index)}
                                alt={item.customer || "Customer"}
                                className="rtn-customer-avatar"
                              />
                              <span className="rtn-customer-name">
                                {item.customer || item.customer_name || "Customer"}
                              </span>
                            </div>
                          </td>

                          {/* Product Garment Thumbnails (Dual) */}
                          <td>
                            <div className="rtn-products-cell">
                              <img
                                src={item.productImage || FASHION_THUMB_1}
                                alt="Garment 1"
                                className="rtn-thumb"
                              />
                              <img
                                src={FASHION_THUMB_2}
                                alt="Garment 2"
                                className="rtn-thumb"
                              />
                            </div>
                          </td>

                          {/* Reason */}
                          <td>
                            <span className="rtn-reason-text">
                              {item.reasonDisplay || item.reason || "Size Issue"}
                            </span>
                          </td>

                          {/* Status Pill */}
                          <td>
                            <span className={`rtn-status-pill ${normStatus}`}>
                              <span className="dot" />
                              <span>{statusLabel}</span>
                            </span>
                          </td>

                          {/* Request Date */}
                          <td>
                            <span className="rtn-date-text">
                              {item.requestDate || "06 Oct 2026"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                            <div className="rtn-actions-cell" style={{ justifyContent: "flex-end" }}>
                              {/* View Action */}
                              <button
                                type="button"
                                className="rtn-icon-btn"
                                title="View details"
                                onClick={() => setSelectedReturnId(item.id)}
                              >
                                <svg
                                  width="16"
                                  height="16"
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

                              {/* Edit Action */}
                              <button
                                type="button"
                                className="rtn-icon-btn"
                                title="Edit return"
                                onClick={(e) => handleOpenEditModal(item, e)}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              {/* Kebab Menu */}
                              <div style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  className="rtn-icon-btn"
                                  title="More options"
                                  onClick={() =>
                                    setOpenKebabId(openKebabId === item.id ? null : item.id)
                                  }
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="1.5" />
                                    <circle cx="12" cy="5" r="1.5" />
                                    <circle cx="12" cy="19" r="1.5" />
                                  </svg>
                                </button>

                                {openKebabId === item.id && (
                                  <div
                                    ref={kebabRef}
                                    style={{
                                      position: "absolute",
                                      right: 0,
                                      top: "28px",
                                      background: "#FFFFFF",
                                      border: "1px solid #EFE5D5",
                                      borderRadius: "8px",
                                      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                      zIndex: 100,
                                      minWidth: "160px",
                                      padding: "6px 0",
                                      textAlign: "left",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "8px 14px",
                                        background: "none",
                                        border: "none",
                                        fontSize: "12.5px",
                                        color: "#16A34A",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        textAlign: "left",
                                      }}
                                      onClick={() => handleTransition(item.id, "APPROVED")}
                                    >
                                      ✓ Approve Return
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "8px 14px",
                                        background: "none",
                                        border: "none",
                                        fontSize: "12.5px",
                                        color: "#DC2626",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        textAlign: "left",
                                      }}
                                      onClick={() => handleTransition(item.id, "REJECTED")}
                                    >
                                      ✕ Reject Return
                                    </button>
                                    <button
                                      type="button"
                                      style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "8px 14px",
                                        background: "none",
                                        border: "none",
                                        fontSize: "12.5px",
                                        color: "#7E22CE",
                                        cursor: "pointer",
                                        textAlign: "left",
                                      }}
                                      onClick={() => handleTransition(item.id, "REFUNDED")}
                                    >
                                      ₹ Process Refund
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

            {/* TABLE FOOTER / PAGINATION */}
            <div className="rtn-table-footer">
              <span className="rtn-showing-text">
                Showing {filteredReturns.length > 0 ? "1" : "0"} to{" "}
                {Math.min(10, filteredReturns.length)} of {kpiData.total} returns
              </span>
              <div className="rtn-pagination-bar">
                <button type="button" className="rtn-page-btn" disabled>
                  &lt;
                </button>
                <button type="button" className="rtn-page-btn active">
                  1
                </button>
                <button type="button" className="rtn-page-btn">
                  2
                </button>
                <button type="button" className="rtn-page-btn">
                  3
                </button>
                <button type="button" className="rtn-page-btn">
                  4
                </button>
                <button type="button" className="rtn-page-btn">
                  5
                </button>
                <span className="rtn-page-ellipsis">...</span>
                <button type="button" className="rtn-page-btn">
                  43
                </button>
                <button type="button" className="rtn-page-btn">
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: RETURN DETAILS CARD */}
          <aside className="rtn-details-card">
            <div className="rtn-details-header">
              <div className="rtn-details-title-wrap">
                <svg
                  className="rtn-details-shield-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span className="rtn-details-heading">Return Details</span>
              </div>

              {selectedReturn && (
                <Link
                  to={`/orders?search=${selectedReturn.orderId || selectedReturn.order_number || ""}`}
                  className="rtn-view-order-link"
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
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>View Order</span>
                </Link>
              )}
            </div>

            {selectedReturn ? (
              <>
                {/* Product Showcase Card */}
                <div className="rtn-product-preview-box">
                  <img
                    src={selectedReturn.productImage || LEHENGA_HERO}
                    alt={selectedReturn.productName || "Product"}
                    className="rtn-product-preview-img"
                  />
                  <div className="rtn-product-preview-meta">
                    <strong className="rtn-product-preview-title">
                      {selectedReturn.productName || "Embroidered Lehenga Set"}
                    </strong>
                    <span className="rtn-product-preview-sku">
                      SKU: {selectedReturn.sku || "ZF001"}
                    </span>
                    <span className="rtn-product-preview-price">
                      {selectedReturn.formattedPrice || "₹12,500"}
                    </span>
                    <span className="rtn-product-preview-attrs">
                      Size: {selectedReturn.size || "M"} | Color:{" "}
                      {selectedReturn.color || "Pink"}
                    </span>
                  </div>
                </div>

                {/* Metadata List */}
                <div className="rtn-details-meta-list">
                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Return ID</span>
                    <span className="rtn-meta-value link">
                      {selectedReturn.returnId || selectedReturn.return_number || `RTN${selectedReturn.id}`}
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Order ID</span>
                    <span className="rtn-meta-value link">
                      {selectedReturn.orderId || selectedReturn.order_number || `ORD${selectedReturn.order}`}
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Customer</span>
                    <span className="rtn-meta-value">
                      {selectedReturn.customer || selectedReturn.customer_name || "Priya Sharma"}
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Return Reason</span>
                    <span className="rtn-meta-value">
                      {selectedReturn.reasonDisplay || selectedReturn.reason || "Size Issue"}
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Status</span>
                    <span className="rtn-meta-value">
                      <span className={`rtn-status-pill ${normalizeStatus(selectedReturn.status)}`}>
                        <span className="dot" />
                        <span>{getStatusBadgeLabel(selectedReturn.status)}</span>
                      </span>
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Request Date</span>
                    <span className="rtn-meta-value">
                      {selectedReturn.requestDate || "06 Oct 2026"}
                    </span>
                  </div>

                  <div className="rtn-details-meta-row">
                    <span className="rtn-meta-label">Expected Resolution</span>
                    <span className="rtn-meta-value">
                      {selectedReturn.expectedResolution || "10 Oct 2026"}
                    </span>
                  </div>
                </div>

                {/* Customer Note Section */}
                <div className="rtn-customer-note-section">
                  <label className="rtn-customer-note-label">Customer Note</label>
                  <div className="rtn-customer-note-box">
                    "{selectedReturn.customerNote ||
                      "The dress size is smaller than expected. Requesting a size exchange."}"
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="rtn-details-action-group">
                  <button
                    type="button"
                    className="rtn-btn-approve"
                    disabled={isProcessingAction}
                    onClick={() => handleTransition(selectedReturn.id, "APPROVED")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Approve Return</span>
                  </button>

                  <button
                    type="button"
                    className="rtn-btn-reject"
                    disabled={isProcessingAction}
                    onClick={() => handleTransition(selectedReturn.id, "REJECTED")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Reject Return</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 10px", color: "#6B7280" }}>
                Select a return from the table to inspect details.
              </div>
            )}
          </aside>
        </section>
      </main>

      {/* =====================================================
          EDIT RETURN MODAL POPUP
      ===================================================== */}
      {editingReturn && (
        <div className="rtn-modal-overlay" onClick={() => setEditingReturn(null)}>
          <div
            className="rtn-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rtn-modal-header">
              <h3 className="rtn-modal-title">
                Edit Return {editingReturn.returnId || editingReturn.return_number}
              </h3>
              <button
                type="button"
                className="rtn-modal-close"
                onClick={() => setEditingReturn(null)}
              >
                ✕
              </button>
            </div>

            <div className="rtn-modal-body">
              <div className="rtn-modal-field">
                <label>Customer</label>
                <input
                  type="text"
                  disabled
                  value={editingReturn.customer || editingReturn.customer_name || "Customer"}
                />
              </div>

              <div className="rtn-modal-field">
                <label>Product & SKU</label>
                <input
                  type="text"
                  disabled
                  value={`${editingReturn.productName || "Product"} (${editingReturn.sku || "SKU"})`}
                />
              </div>

              <div className="rtn-modal-field">
                <label>Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REFUNDED">Refund Processed</option>
                  <option value="PROCESSED">Processed</option>
                  <option value="EXCHANGE">Exchange</option>
                </select>
              </div>

              <div className="rtn-modal-field">
                <label>Inspection / Warehouse Notes</label>
                <textarea
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add quality inspection notes, warehouse receiving remarks..."
                />
              </div>
            </div>

            <div className="rtn-modal-footer">
              <button
                type="button"
                className="rtn-modal-cancel"
                onClick={() => setEditingReturn(null)}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rtn-modal-save"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}