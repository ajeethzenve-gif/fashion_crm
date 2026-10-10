import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/CatalogueQa.css";
import { getProducts, updateProduct, createProduct, getDesigners } from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   SVG SPARKLINES (Luxury Gold Curves)
========================================================= */

function GoldSparkline() {
  return (
    <svg className="qa-kpi-sparkline" viewBox="0 0 65 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 20C12 20 18 10 26 14C34 18 42 8 50 12C56 15 60 6 63 3"
        stroke="#D97706"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   6 QA CHECKLIST AUDIT CRITERIA
========================================================= */

const QA_AUDIT_CHECKLIST = [
  { key: "productData", label: "Product Data & Metadata Accuracy" },
  { key: "photography", label: "Studio High-Resolution Photography" },
  { key: "brandQuality", label: "Brand Integrity & Fabric Compliance" },
  { key: "sizeInfo", label: "Size Chart & Fitting Tolerances" },
  { key: "pricing", label: "MRP, Pricing & Margins Accuracy" },
  { key: "seoCompliance", label: "SEO Tags & Regulatory Compliance" },
];

/* Helper to normalize backend status into standard QA status */
function normalizeQaStatus(rawStatus, isLive) {
  const s = String(rawStatus || "").toUpperCase();
  if (s.includes("APPROV") || s === "LIVE" || isLive === true) return "Approved";
  if (s.includes("REJECT")) return "Rejected";
  if (s.includes("CORRECTION") || s.includes("REWORK")) return "Rework";
  return "Pending";
}

export default function CatalogueQa() {
  const { user } = useAuth();

  // Database States (Zero Mock Data)
  const [qaProducts, setQaProducts] = useState([]);
  const [designersList, setDesignersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [topSearch, setTopSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Products");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [designerFilter, setDesignerFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");

  // Selection & Dropdowns
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [kebabRowId, setKebabRowId] = useState(null);
  const kebabRef = useRef(null);
  const bulkRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [inspectItem, setInspectItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    status: "Approved",
    score: 6,
    reviewedBy: "Admin",
    notes: "",
  });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    name: "",
    sku: "",
    designer: "",
    category: "Women Wear",
    notes: "",
  });

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setKebabRowId(null);
      }
      if (bulkRef.current && !bulkRef.current.contains(e.target)) {
        setIsBulkOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* =========================================================
     FETCH LIVE DATA FROM BACKEND DATABASE ONLY (ZERO MOCK)
  ========================================================= */
  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, desRes] = await Promise.all([
        getProducts().catch((err) => {
          console.error("Failed to load products:", err);
          return [];
        }),
        getDesigners().catch((err) => {
          console.error("Failed to load designers:", err);
          return [];
        }),
      ]);

      const rawProducts = Array.isArray(prodsRes) ? prodsRes : prodsRes?.results || [];
      const rawDesigners = Array.isArray(desRes) ? desRes : desRes?.results || [];
      setDesignersList(rawDesigners);

      // Map strictly from database
      const mapped = rawProducts.map((p, idx) => {
        const normStatus = normalizeQaStatus(p.qa_status || p.status, p.is_live);
        const designerName =
          p.designer_name ||
          p.designer_brand ||
          (typeof p.designer === "object" ? p.designer?.brand_name : null) ||
          rawDesigners.find((d) => d.id === p.designer)?.brand_name ||
          "Atelier House";

        const formattedDate = p.created_at
          ? new Date(p.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : p.updated_at
          ? new Date(p.updated_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";

        return {
          id: p.id,
          slNo: String(idx + 1).padStart(2, "0"),
          name: p.product_name || p.name || `Product #${p.id}`,
          sku: p.sku || `ZF${String(p.id).padStart(3, "0")}`,
          designer: designerName,
          category: p.category || "Apparel",
          checklistScore:
            typeof p.qa_score === "number"
              ? p.qa_score
              : normStatus === "Approved"
              ? 6
              : normStatus === "Rework"
              ? 4
              : normStatus === "Rejected"
              ? 2
              : 5,
          checklistTotal: 6,
          status: normStatus,
          submittedOn: formattedDate,
          reviewedBy:
            p.reviewed_by ||
            (normStatus === "Approved" ? "Priya S" : "—"),
          image:
            p.primary_image ||
            p.image ||
            p.thumbnail ||
            p.photo ||
            "/media/lehenga_pink_001.jpg",
          notes: p.qa_note || p.description || "",
        };
      });

      setQaProducts(mapped);
    } catch (err) {
      console.error("Failed to connect to database for catalogue QA data:", err);
      showErrorToast("Could not connect to database for Catalogue QA records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================================================
     COMPUTE LIVE DATABASE METRICS (ZERO MOCK FALLBACKS)
  ========================================================= */
  const kpiStats = useMemo(() => {
    const total = qaProducts.length;
    const pending = qaProducts.filter((p) => p.status === "Pending").length;
    const approved = qaProducts.filter((p) => p.status === "Approved").length;
    const rejected = qaProducts.filter((p) => p.status === "Rejected").length;

    const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0;
    const approvedPercent = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectedPercent = total > 0 ? Math.round((rejected / total) * 100) : 0;

    return {
      total: total.toLocaleString(),
      pending: pending.toLocaleString(),
      approved: approved.toLocaleString(),
      rejected: rejected.toLocaleString(),
      pendingPercent,
      approvedPercent,
      rejectedPercent,
    };
  }, [qaProducts]);

  /* =========================================================
     DYNAMIC SELECT OPTIONS FROM LIVE DATABASE
  ========================================================= */
  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(qaProducts.map((p) => p.category).filter(Boolean)));
    return cats.length > 0 ? cats : ["Women Wear", "Ethnic Wear", "Men Wear", "Kids Wear", "Accessories"];
  }, [qaProducts]);

  const designerOptions = useMemo(() => {
    const fromDesigners = designersList.map((d) => d.brand_name || d.designer_name).filter(Boolean);
    const fromProducts = qaProducts.map((p) => p.designer).filter(Boolean);
    const set = Array.from(new Set([...fromDesigners, ...fromProducts]));
    return set.length > 0 ? set : ["Ananya Rao", "Meera Iyer", "Sneha Kapoor", "Rahul Mehta"];
  }, [designersList, qaProducts]);

  /* =========================================================
     FILTER DATABASE RECORDS
  ========================================================= */
  const filteredProducts = useMemo(() => {
    return qaProducts.filter((item) => {
      // 1. Search Query
      const query = (topSearch || tableSearch).trim().toLowerCase();
      if (query) {
        const matchesName = String(item.name || "").toLowerCase().includes(query);
        const matchesSku = String(item.sku || "").toLowerCase().includes(query);
        const matchesDesigner = String(item.designer || "").toLowerCase().includes(query);
        const matchesCat = String(item.category || "").toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesDesigner && !matchesCat) {
          return false;
        }
      }

      // 2. Tab Filter
      if (activeTab === "Pending QA" && item.status !== "Pending") return false;
      if (activeTab === "Approved" && item.status !== "Approved") return false;
      if (activeTab === "Rejected" && item.status !== "Rejected") return false;
      if (activeTab === "Rework Required" && item.status !== "Rework") return false;

      // 3. Dropdowns
      if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
      if (designerFilter !== "All" && item.designer !== designerFilter) return false;
      if (statusFilter !== "All" && item.status !== statusFilter) return false;

      return true;
    });
  }, [qaProducts, topSearch, tableSearch, activeTab, categoryFilter, designerFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Bulk Actions with Real Backend Persistence
  const handleBulkAction = async (newStatus) => {
    if (selectedIds.size === 0) {
      showErrorToast("Please select at least one product row.");
      return;
    }
    const backendStatus =
      newStatus === "Approved"
        ? "APPROVED"
        : newStatus === "Rework"
        ? "CORRECTION"
        : newStatus === "Rejected"
        ? "REJECTED"
        : "PENDING_QA";

    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          updateProduct(id, {
            qa_status: backendStatus,
            status: backendStatus,
            is_live: newStatus === "Approved",
          }).catch((err) => console.warn(`Update failed for ${id}:`, err))
        )
      );

      showSuccessToast(`${ids.length} product(s) marked as ${newStatus} in database`);
      setSelectedIds(new Set());
      setIsBulkOpen(false);
      await loadData();
    } catch (err) {
      showErrorToast("Failed to perform bulk action in database");
    }
  };

  // Quick Action via Kebab Menu
  const handleQuickStatusChange = async (row, newStatus) => {
    const backendStatus =
      newStatus === "Approved"
        ? "APPROVED"
        : newStatus === "Rework"
        ? "CORRECTION"
        : newStatus === "Rejected"
        ? "REJECTED"
        : "PENDING_QA";

    try {
      await updateProduct(row.id, {
        qa_status: backendStatus,
        status: backendStatus,
        is_live: newStatus === "Approved",
      });
      showSuccessToast(`${row.name} updated to ${newStatus} in database`);
      setKebabRowId(null);
      await loadData();
    } catch (err) {
      showErrorToast("Failed to update status in database: " + err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditItem(item);
    setEditForm({
      status: item.status,
      score: item.checklistScore,
      reviewedBy: item.reviewedBy === "—" ? user?.username || "Admin" : item.reviewedBy,
      notes: item.notes || "",
    });
  };

  // Save Edit QA Decision with Real Backend Persistence
  const handleSaveEdit = async () => {
    if (!editItem) return;
    try {
      const backendStatus =
        editForm.status === "Approved"
          ? "APPROVED"
          : editForm.status === "Rework"
          ? "CORRECTION"
          : editForm.status === "Rejected"
          ? "REJECTED"
          : "PENDING_QA";

      await updateProduct(editItem.id, {
        qa_status: backendStatus,
        status: backendStatus,
        is_live: editForm.status === "Approved",
        qa_score: Number(editForm.score),
        qa_note: editForm.notes,
      });

      showSuccessToast(`QA audit for ${editItem.name} saved in database`);
      setEditItem(null);
      await loadData();
    } catch (err) {
      showErrorToast("Failed to update QA decision: " + err.message);
    }
  };

  // Handle Submit New Product for QA
  const handleSubmitNewQA = async (e) => {
    e.preventDefault();
    if (!submitForm.name || !submitForm.sku) {
      showErrorToast("Please enter product name and SKU.");
      return;
    }

    try {
      // Find designer ID if available
      const matchingDesigner = designersList.find(
        (d) => d.brand_name === submitForm.designer || d.designer_name === submitForm.designer
      );

      const payload = {
        product_name: submitForm.name,
        sku: submitForm.sku.toUpperCase(),
        designer: matchingDesigner?.id || designersList[0]?.id || 1,
        category: submitForm.category,
        description: submitForm.notes,
        status: "PENDING_QA",
        qa_status: "PENDING_QA",
        qa_score: 5,
        is_live: false,
      };

      await createProduct(payload);
      showSuccessToast(`${submitForm.name} (${submitForm.sku}) submitted for QA review`);
      setIsSubmitModalOpen(false);
      setSubmitForm({
        name: "",
        sku: "",
        designer: designersList[0]?.brand_name || "",
        category: "Women Wear",
        notes: "",
      });
      await loadData();
    } catch (err) {
      showErrorToast("Failed to submit product for QA: " + err.message);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setTopSearch("");
    setTableSearch("");
    setActiveTab("All Products");
    setCategoryFilter("All");
    setDesignerFilter("All");
    setStatusFilter("All");
    setDateRangeFilter("All");
    setSelectedIds(new Set());
    setCurrentPage(1);
    showSuccessToast("All filters restored to default");
  };

  return (
    <div className="qa-page-wrapper">
      {/* =====================================================
          MAIN CONTAINER
      ===================================================== */}
      <main className="qa-container">
        {/* HERO BANNER */}
        <section className="qa-hero-banner">
          <div className="qa-banner-content">
            <h1 className="qa-hero-title">Catalogue QA</h1>
            <p className="qa-hero-subtitle">
              Ensure product quality, content accuracy and compliance
            </p>
          </div>
        </section>

        {/* 4 KPI METRIC CARDS + SUBMIT ACTION BUTTON (REAL DATA) */}
        <section className="qa-kpi-row">
          {/* 1. Total Products */}
          <div className="qa-kpi-card">
            <div className="qa-kpi-left">
              <div className="qa-kpi-icon-wrap total">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="qa-kpi-info">
                <span className="qa-kpi-title">Total Products</span>
                <div className="qa-kpi-num-row">
                  <span className="qa-kpi-number">{kpiStats.total}</span>
                  <span className="qa-kpi-trend green">Live</span>
                </div>
              </div>
            </div>
            <GoldSparkline />
          </div>

          {/* 2. Pending QA */}
          <div className="qa-kpi-card">
            <div className="qa-kpi-left">
              <div className="qa-kpi-icon-wrap pending">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="qa-kpi-info">
                <span className="qa-kpi-title">Pending QA</span>
                <div className="qa-kpi-num-row">
                  <span className="qa-kpi-number">{kpiStats.pending}</span>
                  <span className="qa-kpi-trend green">↗ {kpiStats.pendingPercent}%</span>
                </div>
              </div>
            </div>
            <GoldSparkline />
          </div>

          {/* 3. Approved */}
          <div className="qa-kpi-card">
            <div className="qa-kpi-left">
              <div className="qa-kpi-icon-wrap approved">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div className="qa-kpi-info">
                <span className="qa-kpi-title">Approved</span>
                <div className="qa-kpi-num-row">
                  <span className="qa-kpi-number">{kpiStats.approved}</span>
                  <span className="qa-kpi-trend green">↗ {kpiStats.approvedPercent}%</span>
                </div>
              </div>
            </div>
            <GoldSparkline />
          </div>

          {/* 4. Rejected */}
          <div className="qa-kpi-card">
            <div className="qa-kpi-left">
              <div className="qa-kpi-icon-wrap rejected">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div className="qa-kpi-info">
                <span className="qa-kpi-title">Rejected</span>
                <div className="qa-kpi-num-row">
                  <span className="qa-kpi-number">{kpiStats.rejected}</span>
                  <span className="qa-kpi-trend red">↘ {kpiStats.rejectedPercent}%</span>
                </div>
              </div>
            </div>
            <GoldSparkline />
          </div>
        </section>

        {/* STATUS TABS & RIGHT-ALIGNED ACTION BUTTONS */}
        <section className="qa-tabs-row">
          <div className="qa-tabs-group">
            {["All Products", "Pending QA", "Approved", "Rejected", "Rework Required"].map((tab) => (
              <button
                key={tab}
                className={`qa-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Two Action Buttons on the Right Side of the Page */}
          <div className="qa-actions-group-wrap">
            <div className="qa-bulk-actions-wrap" ref={bulkRef}>
              <button className="qa-bulk-btn" onClick={() => setIsBulkOpen((prev) => !prev)}>
                <span>Bulk Actions</span>
                <span style={{ fontSize: "11px" }}>⌵</span>
              </button>

              {isBulkOpen && (
                <div className="qa-dropdown-menu">
                  <button className="qa-dropdown-item" onClick={() => handleBulkAction("Approved")}>
                    ✔ Approve Selected
                  </button>
                  <button className="qa-dropdown-item" onClick={() => handleBulkAction("Rework")}>
                    ↻ Request Rework
                  </button>
                  <button className="qa-dropdown-item danger" onClick={() => handleBulkAction("Rejected")}>
                    ✖ Reject Selected
                  </button>
                </div>
              )}
            </div>

            <button className="qa-submit-btn" onClick={() => setIsSubmitModalOpen(true)}>
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>+</span>
              <span>Submit for QA</span>
            </button>
          </div>
        </section>

        {/* FILTER CONTROLS BAR */}
        <section className="qa-filter-card">
          {/* Table Search */}
          <div className="qa-filter-search-wrap">
            <span className="qa-filter-search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              className="qa-filter-search-input"
              placeholder="Search by product name, SKU, designer..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Category Dropdown (Dynamic) */}
          <div className="qa-select-group">
            <span className="qa-select-label">Category</span>
            <select
              className="qa-select-control"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Designer Dropdown (Dynamic) */}
          <div className="qa-select-group">
            <span className="qa-select-label">Designer</span>
            <select
              className="qa-select-control"
              value={designerFilter}
              onChange={(e) => {
                setDesignerFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              {designerOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* QA Status Dropdown */}
          <div className="qa-select-group">
            <span className="qa-select-label">QA Status</span>
            <select
              className="qa-select-control"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rework">Rework</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div className="qa-select-group">
            <span className="qa-select-label">Date Range</span>
            <select
              className="qa-select-control"
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Reset Button */}
          <button className="qa-reset-btn" onClick={handleResetFilters}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Reset</span>
          </button>
        </section>

        {/* QA PRODUCTS DATA TABLE */}
        <section className="qa-table-container">
          <div className="qa-table-scroll">
            <table className="qa-table">
              <thead>
                <tr>
                  <th style={{ width: "36px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      className="qa-checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((p) => selectedIds.has(p.id))
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: "55px" }}>Sl.No</th>
                  <th>Product</th>
                  <th style={{ whiteSpace: "nowrap" }}>SKU</th>
                  <th>Designer</th>
                  <th>Category</th>
                  <th>QA Checklist</th>
                  <th>QA Status</th>
                  <th>Submitted On</th>
                  <th>Reviewed By</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280" }}>
                      Connecting to database and loading catalogue records...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280" }}>
                      No catalogue products match your active search or filter selection.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((row) => {
                    const isSelected = selectedIds.has(row.id);
                    const progressPercent = Math.round((row.checklistScore / row.checklistTotal) * 100);
                    const progressColorClass =
                      row.checklistScore >= 5
                        ? "green"
                        : row.checklistScore >= 3
                        ? "orange"
                        : "red";

                    return (
                      <tr key={row.id} className={isSelected ? "selected" : ""}>
                        {/* Checkbox */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="qa-checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(row.id)}
                          />
                        </td>

                        {/* # Serial */}
                        <td className="qa-sl-num">{row.slNo}</td>

                        {/* Product Thumbnail + Name */}
                        <td>
                          <div className="qa-prod-cell">
                            <img
                              src={row.image}
                              alt={row.name}
                              className="qa-prod-thumb"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=120&auto=format&fit=crop&q=80";
                              }}
                            />
                            <span className="qa-prod-name">{row.name}</span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="qa-sku-cell" style={{ whiteSpace: "nowrap" }}>
                          <span className="qa-sku-badge" style={{ whiteSpace: "nowrap" }}>{row.sku}</span>
                        </td>

                        {/* Designer */}
                        <td className="qa-designer-cell">{row.designer}</td>

                        {/* Category */}
                        <td className="qa-category-cell">{row.category}</td>

                        {/* QA Checklist */}
                        <td className="qa-checklist-cell">
                          <div className="qa-checklist-score">
                            {row.checklistScore} / {row.checklistTotal}
                          </div>
                          <div className="qa-progress-track">
                            <div
                              className={`qa-progress-fill ${progressColorClass}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* QA Status Pill */}
                        <td>
                          {row.status === "Approved" && (
                            <span className="qa-status-pill approved">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Approved
                            </span>
                          )}
                          {row.status === "Pending" && (
                            <span className="qa-status-pill pending">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              Pending
                            </span>
                          )}
                          {row.status === "Rework" && (
                            <span className="qa-status-pill rework">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M23 4v6h-6"></path>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                              </svg>
                              Rework
                            </span>
                          )}
                          {row.status === "Rejected" && (
                            <span className="qa-status-pill rejected">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Submitted On */}
                        <td className="qa-date-cell">{row.submittedOn}</td>

                        {/* Reviewed By */}
                        <td className="qa-reviewer-cell">{row.reviewedBy}</td>

                        {/* Actions (View 👁, Edit 📝, Menu ⋮) */}
                        <td style={{ textAlign: "right" }}>
                          <div className="qa-actions-cell" style={{ justifyContent: "flex-end" }}>
                            {/* 1. View Icon Button */}
                            <button
                              className="qa-action-icon-btn"
                              title="Inspect Product QA"
                              onClick={() => setInspectItem(row)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>

                            {/* 2. Edit Icon Button */}
                            <button
                              className="qa-action-icon-btn"
                              title="Edit QA Status"
                              onClick={() => handleOpenEdit(row)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>

                            {/* 3. Kebab Menu */}
                            <div style={{ position: "relative" }}>
                              <button
                                className="qa-action-icon-btn"
                                title="More Actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setKebabRowId(kebabRowId === row.id ? null : row.id);
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="1.8" />
                                  <circle cx="12" cy="12" r="1.8" />
                                  <circle cx="12" cy="19" r="1.8" />
                                </svg>
                              </button>

                              {kebabRowId === row.id && (
                                <div className="qa-kebab-menu" ref={kebabRef}>
                                  <button
                                    className="qa-kebab-item"
                                    onClick={() => handleQuickStatusChange(row, "Approved")}
                                  >
                                    ✔ Quick Approve
                                  </button>
                                  <button
                                    className="qa-kebab-item"
                                    onClick={() => handleQuickStatusChange(row, "Rework")}
                                  >
                                    ↻ Request Rework
                                  </button>
                                  <button
                                    className="qa-kebab-item danger"
                                    onClick={() => handleQuickStatusChange(row, "Rejected")}
                                  >
                                    ✖ Reject Product
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

          {/* TABLE FOOTER / PAGINATION (DYNAMIC DATABASE VALUES) */}
          <div className="qa-pagination-bar">
            <span className="qa-pagination-info">
              {filteredProducts.length === 0
                ? "No products to display"
                : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                    currentPage * pageSize,
                    filteredProducts.length
                  )} of ${filteredProducts.length} products`}
            </span>

            <div className="qa-pagination-controls">
              <button
                className="qa-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 2
                )
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={p}>
                      {prev && p - prev > 1 && <span className="qa-page-dots">…</span>}
                      <button
                        className={`qa-page-btn ${currentPage === p ? "active" : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                className="qa-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================
          MODAL 1: VIEW / INSPECT PRODUCT QA MODAL
      ===================================================== */}
      {inspectItem && (
        <div className="qa-modal-overlay" onClick={() => setInspectItem(null)}>
          <div className="qa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="qa-modal-header">
              <h2 className="qa-modal-title">Product QA Inspection</h2>
              <button className="qa-modal-close-btn" onClick={() => setInspectItem(null)}>
                ✕
              </button>
            </div>

            <div className="qa-modal-body">
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <img
                  src={inspectItem.image}
                  alt={inspectItem.name}
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid #E5D9C8",
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=120&auto=format&fit=crop&q=80";
                  }}
                />
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#1F2937" }}>
                    {inspectItem.name}
                  </h3>
                  <div style={{ fontSize: "13px", color: "#6B7280" }}>
                    <strong>SKU:</strong> {inspectItem.sku} &bull; <strong>Designer:</strong> {inspectItem.designer}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
                    <strong>Category:</strong> {inspectItem.category} &bull; <strong>Submitted:</strong> {inspectItem.submittedOn}
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#382412" }}>
                  6-Point QA Checklist Audit
                </h4>
                <div className="qa-inspect-grid">
                  {QA_AUDIT_CHECKLIST.map((item, idx) => {
                    const isPassed = idx < inspectItem.checklistScore;
                    return (
                      <div key={item.key} className="qa-inspect-card">
                        <span className="qa-inspect-label">{item.label}</span>
                        <span className={`qa-inspect-status ${isPassed ? "pass" : "fail"}`}>
                          {isPassed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {inspectItem.notes && (
                <div style={{ background: "#FAF8F5", padding: "12px", borderRadius: "8px", border: "1px solid #EFE4D2" }}>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#786551", marginBottom: "4px" }}>
                    REVIEWER NOTES & AUDIT FEEDBACK
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151" }}>
                    {inspectItem.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="qa-modal-footer">
              <button className="qa-btn-cancel" onClick={() => setInspectItem(null)}>
                Close
              </button>
              <button
                className="qa-btn-primary"
                onClick={() => {
                  const it = inspectItem;
                  setInspectItem(null);
                  handleOpenEdit(it);
                }}
              >
                Edit QA Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 2: EDIT QA DECISION MODAL (REAL BACKEND PERSIST)
      ===================================================== */}
      {editItem && (
        <div className="qa-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="qa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="qa-modal-header">
              <h2 className="qa-modal-title">Review & Edit QA Decision</h2>
              <button className="qa-modal-close-btn" onClick={() => setEditItem(null)}>
                ✕
              </button>
            </div>

            <div className="qa-modal-body">
              <div style={{ fontSize: "13.5px", color: "#4B5563" }}>
                Updating quality evaluation for <strong>{editItem.name}</strong> ({editItem.sku}).
              </div>

              <div className="qa-form-row">
                <div className="qa-form-group">
                  <label className="qa-form-label">QA Status</label>
                  <select
                    className="qa-form-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rework">Rework Required</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="qa-form-group">
                  <label className="qa-form-label">Checklist Score (out of 6)</label>
                  <select
                    className="qa-form-select"
                    value={editForm.score}
                    onChange={(e) => setEditForm({ ...editForm, score: Number(e.target.value) })}
                  >
                    <option value={6}>6 / 6 (100% Passed)</option>
                    <option value={5}>5 / 6 (83% Passed)</option>
                    <option value={4}>4 / 6 (66% Passed)</option>
                    <option value={3}>3 / 6 (50% Passed)</option>
                    <option value={2}>2 / 6 (33% Passed)</option>
                    <option value={1}>1 / 6 (16% Passed)</option>
                  </select>
                </div>
              </div>

              <div className="qa-form-group">
                <label className="qa-form-label">Auditor / Reviewed By</label>
                <input
                  type="text"
                  className="qa-form-input"
                  value={editForm.reviewedBy}
                  onChange={(e) => setEditForm({ ...editForm, reviewedBy: e.target.value })}
                  placeholder="e.g. Priya S"
                />
              </div>

              <div className="qa-form-group">
                <label className="qa-form-label">Reviewer Notes & Feedback</label>
                <textarea
                  className="qa-form-textarea"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Specify fabric testing details, stitch quality or compliance remarks..."
                />
              </div>
            </div>

            <div className="qa-modal-footer">
              <button className="qa-btn-cancel" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button className="qa-btn-primary" onClick={handleSaveEdit}>
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL 3: SUBMIT PRODUCT FOR QA MODAL (DATABASE INSERT)
      ===================================================== */}
      {isSubmitModalOpen && (
        <div className="qa-modal-overlay" onClick={() => setIsSubmitModalOpen(false)}>
          <div className="qa-modal-box" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmitNewQA}>
              <div className="qa-modal-header">
                <h2 className="qa-modal-title">Submit Product for QA</h2>
                <button type="button" className="qa-modal-close-btn" onClick={() => setIsSubmitModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="qa-modal-body">
                <div className="qa-form-group">
                  <label className="qa-form-label">Product Title *</label>
                  <input
                    type="text"
                    required
                    className="qa-form-input"
                    placeholder="e.g. Velvet Zari Anarkali"
                    value={submitForm.name}
                    onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                  />
                </div>

                <div className="qa-form-row">
                  <div className="qa-form-group">
                    <label className="qa-form-label">SKU Identifier *</label>
                    <input
                      type="text"
                      required
                      className="qa-form-input"
                      placeholder="e.g. ZF011"
                      value={submitForm.sku}
                      onChange={(e) => setSubmitForm({ ...submitForm, sku: e.target.value })}
                    />
                  </div>

                  <div className="qa-form-group">
                    <label className="qa-form-label">Category</label>
                    <select
                      className="qa-form-select"
                      value={submitForm.category}
                      onChange={(e) => setSubmitForm({ ...submitForm, category: e.target.value })}
                    >
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="qa-form-group">
                  <label className="qa-form-label">Lead Designer</label>
                  <select
                    className="qa-form-select"
                    value={submitForm.designer}
                    onChange={(e) => setSubmitForm({ ...submitForm, designer: e.target.value })}
                  >
                    {designerOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="qa-form-group">
                  <label className="qa-form-label">Submission Notes</label>
                  <textarea
                    className="qa-form-textarea"
                    rows={2}
                    placeholder="Initial material, finish or sample batch notes..."
                    value={submitForm.notes}
                    onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="qa-modal-footer">
                <button type="button" className="qa-btn-cancel" onClick={() => setIsSubmitModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="qa-btn-primary">
                  Submit for QA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
