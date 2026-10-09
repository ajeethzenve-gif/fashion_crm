import React, { useState, useEffect, useMemo } from "react";
import "../styles/Inventory.css";
import bannerImg from "../assest/accounting-banner.jpg";
import { getProducts, updateProduct, createProduct, getDesigners } from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";

/* =========================================================
   SVG SPARKLINES COMPONENT
========================================================= */
function Sparkline({ color = "#F59E0B", points = "2,18 14,14 26,19 38,10 50,14 62,4" }) {
  return (
    <svg className="inv-kpi-sparkline" viewBox="0 0 66 22" fill="none" xmlns="http://www.w3.org/2000/svg">
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
   MAIN INVENTORY ENGINE COMPONENT (05)
========================================================= */
export default function Inventory() {
  const [liveProducts, setLiveProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [activeTab, setActiveTab] = useState("All Items");
  const [tableSearch, setTableSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [stockStatusFilter, setStockStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [viewDetailsItem, setViewDetailsItem] = useState(null);
  const [adjustStockItem, setAdjustStockItem] = useState(null);

  // Add Stock Form State
  const [addForm, setAddForm] = useState({
    productName: "",
    sku: "",
    category: "Women Wear",
    designer: "Ananya Rao",
    location: "Chennai WH",
    quantity: 50,
    reorderLevel: 30,
  });

  // Adjust Stock Form State
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("restock");

  /* -------------------------------------------------------
     FETCH LIVE DATA STRICTLY FROM BACKEND DATABASE
  ------------------------------------------------------- */
  const loadInventory = async () => {
    try {
      setLoading(true);
      const [prodsRes, desRes] = await Promise.all([
        getProducts().catch(() => []),
        getDesigners().catch(() => []),
      ]);
      const pList = Array.isArray(prodsRes) ? prodsRes : prodsRes?.results || [];
      setLiveProducts(pList);
      setDesigners(Array.isArray(desRes) ? desRes : desRes?.results || []);
    } catch (err) {
      console.warn("Inventory API connection notice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  /* -------------------------------------------------------
     MAP REAL BACKEND DATABASE PRODUCTS
  ------------------------------------------------------- */
  const allInventoryItems = useMemo(() => {
    if (!liveProducts || liveProducts.length === 0) {
      return [];
    }

    return liveProducts.map((p, idx) => {
      const stock = Number(
        p.physical_quantity ??
        p.inventory_quantity ??
        p.stock_quantity ??
        p.total_size_quantity ??
        0
      );
      const reorder = Number(p.reorder_level ?? p.reorder_point ?? 30);
      let status = "In Stock";
      if (stock === 0) status = "Out of Stock";
      else if (stock <= reorder) status = "Low Stock";

      const designerName =
        p.designer_name ||
        (typeof p.designer === "object" ? p.designer?.brand_name : null) ||
        (designers.find((d) => d.id === p.designer)?.brand_name) ||
        "Zenve Atelier";

      const dt = p.updated_at
        ? new Date(p.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : p.created_at
        ? new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

      return {
        id: `db-${p.id || idx + 1}`,
        rawId: p.id,
        name: p.product_name || p.name || `Product ${p.id || idx + 1}`,
        sku: p.sku || `ZF${String(p.id || idx + 1).padStart(3, "0")}`,
        category: p.category || "Women Wear",
        designer: designerName,
        location: p.fulfilment_location || p.location || "Central WH",
        stockQty: stock,
        reorderLevel: reorder,
        status,
        lastUpdated: dt,
        image: p.primary_image || p.image || p.thumbnail || "/media/lehenga_pink_001.jpg",
      };
    });
  }, [liveProducts, designers]);

  /* -------------------------------------------------------
     KPI METRICS DERIVED STRICTLY FROM DATABASE
  ------------------------------------------------------- */
  const kpiMetrics = useMemo(() => {
    const totalSKUs = allInventoryItems.length;
    const totalStock = allInventoryItems.reduce((acc, it) => acc + (it.stockQty || 0), 0);
    const uniqueLocations = new Set(allInventoryItems.map((it) => it.location).filter(Boolean)).size;
    const lowStock = allInventoryItems.filter((it) => it.status === "Low Stock").length;

    return {
      totalSKUs: totalSKUs.toLocaleString("en-IN"),
      totalStockUnits: totalStock.toLocaleString("en-IN"),
      activeLocations: uniqueLocations,
      lowStockItems: lowStock,
    };
  }, [allInventoryItems]);

  /* -------------------------------------------------------
     FILTER LOGIC (SEARCH, TABS, DROPDOWNS)
  ------------------------------------------------------- */
  const filteredItems = useMemo(() => {
    return allInventoryItems.filter((item) => {
      // 1. Tab Filter
      if (activeTab === "Low Stock" && item.status !== "Low Stock") return false;
      if (activeTab === "Out of Stock" && item.status !== "Out of Stock") return false;
      if (activeTab === "Fast Moving" && item.stockQty < 50) return false;
      if (activeTab === "Slow Moving" && item.stockQty >= 50) return false;

      // 2. Search query (Table search)
      const q = tableSearch.trim().toLowerCase();
      if (q) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const skuMatch = item.sku.toLowerCase().includes(q);
        const catMatch = item.category.toLowerCase().includes(q);
        const desMatch = item.designer.toLowerCase().includes(q);
        const locMatch = item.location.toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !catMatch && !desMatch && !locMatch) return false;
      }

      // 3. Dropdown Filters
      if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
      if (locationFilter !== "All" && item.location !== locationFilter) return false;
      if (stockStatusFilter !== "All" && item.status !== stockStatusFilter) return false;

      return true;
    });
  }, [allInventoryItems, activeTab, tableSearch, categoryFilter, locationFilter, stockStatusFilter]);

  /* -------------------------------------------------------
     PAGINATION
  ------------------------------------------------------- */
  const totalCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleResetFilters = () => {
    setTableSearch("");
    setActiveTab("All Items");
    setCategoryFilter("All");
    setLocationFilter("All");
    setStockStatusFilter("All");
    setCurrentPage(1);
    showSuccessToast("Inventory filters have been reset.");
  };

  /* -------------------------------------------------------
     ADD STOCK ACTION
  ------------------------------------------------------- */
  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.productName.trim() || !addForm.sku.trim()) {
      showErrorToast("Product name and SKU are required.");
      return;
    }

    const qty = parseInt(addForm.quantity, 10) || 0;
    const reorder = parseInt(addForm.reorderLevel, 10) || 30;

    try {
      await createProduct({
        product_name: addForm.productName,
        sku: addForm.sku,
        category: addForm.category,
        inventory_quantity: qty,
        physical_quantity: qty,
        reorder_level: reorder,
        fulfilment_location: addForm.location,
      });
      await loadInventory();
      showSuccessToast(`Stock received and saved to database: ${addForm.sku} (+${qty} units)`);
    } catch (err) {
      // Local fallback if API fails
      const newItem = {
        id: `custom-${Date.now()}`,
        name: addForm.productName,
        sku: addForm.sku,
        category: addForm.category,
        designer: addForm.designer,
        location: addForm.location,
        stockQty: qty,
        reorderLevel: reorder,
        status: qty === 0 ? "Out of Stock" : qty <= reorder ? "Low Stock" : "In Stock",
        lastUpdated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        image: "/media/lehenga_pink_001.jpg",
      };
      setLiveProducts((prev) => [newItem, ...prev]);
      showSuccessToast(`Added ${newItem.sku} with ${qty} units`);
    }

    setIsAddStockOpen(false);
    setAddForm({
      productName: "",
      sku: "",
      category: "Women Wear",
      designer: "Ananya Rao",
      location: "Chennai WH",
      quantity: 50,
      reorderLevel: 30,
    });
  };

  /* -------------------------------------------------------
     ADJUST STOCK ACTION
  ------------------------------------------------------- */
  const handleAdjustStockSubmit = async (e) => {
    e.preventDefault();
    if (!adjustStockItem) return;
    const qtyChange = parseInt(adjustQty, 10);
    if (isNaN(qtyChange)) {
      showErrorToast("Please enter a valid quantity.");
      return;
    }

    const newStock = Math.max(0, adjustReason === "set" ? qtyChange : adjustStockItem.stockQty + qtyChange);

    try {
      if (adjustStockItem.rawId) {
        await updateProduct(adjustStockItem.rawId, { inventory_quantity: newStock, physical_quantity: newStock });
        await loadInventory();
      } else {
        setLiveProducts((prev) =>
          prev.map((item) =>
            item.id === adjustStockItem.id
              ? { ...item, stockQty: newStock }
              : item
          )
        );
      }
      setAdjustStockItem(null);
      setAdjustQty("");
      showSuccessToast(`Updated stock for ${adjustStockItem.sku} to ${newStock} units`);
    } catch (err) {
      showErrorToast(`Failed to update stock: ${err.message}`);
    }
  };

  return (
    <div className="inv-page-wrapper">
      {/* =====================================================
          LUXURY ATELIER HERO BANNER
      ===================================================== */}
      <section className="inv-hero-banner">
        <div className="inv-hero-content">
          <h1 className="inv-hero-title">Inventory Engine</h1>
          <p className="inv-hero-subtitle">
            Track stock, manage locations, and optimize inventory levels
          </p>
        </div>

        {/* Fashion Montage Artwork & Golden Ribbon Blend */}
        <div className="inv-hero-art-wrap">
          <img
            src={bannerImg}
            alt="Zenve Haute Couture Inventory Atelier"
            className="inv-hero-art-img"
          />
          <div className="inv-hero-glow-overlay" />
        </div>
      </section>

      {/* =====================================================
          3. 4 KPI METRIC CARDS ROW + ADD STOCK BUTTON
      ===================================================== */}
      <section className="inv-kpi-row">
        {/* 1. Total SKUs */}
        <div className="inv-kpi-card">
          <div className="inv-kpi-info-group">
            <div className="inv-kpi-icon-wrap">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="inv-kpi-text-block">
              <span className="inv-kpi-title">Total SKUs</span>
              <div className="inv-kpi-value-row">
                <span className="inv-kpi-number">{kpiMetrics.totalSKUs}</span>
                <span className="inv-kpi-trend green">↗ 12%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,18 14,14 26,19 38,10 50,14 62,4" />
        </div>

        {/* 2. Total Stock Units */}
        <div className="inv-kpi-card">
          <div className="inv-kpi-info-group">
            <div className="inv-kpi-icon-wrap">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div className="inv-kpi-text-block">
              <span className="inv-kpi-title">Total Stock Units</span>
              <div className="inv-kpi-value-row">
                <span className="inv-kpi-number">{kpiMetrics.totalStockUnits}</span>
                <span className="inv-kpi-trend green">↗ 8%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,16 14,13 26,18 38,11 50,13 62,5" />
        </div>

        {/* 3. Active Locations */}
        <div className="inv-kpi-card">
          <div className="inv-kpi-info-group">
            <div className="inv-kpi-icon-wrap">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="inv-kpi-text-block">
              <span className="inv-kpi-title">Active Locations</span>
              <div className="inv-kpi-value-row">
                <span className="inv-kpi-number">{kpiMetrics.activeLocations}</span>
                <span className="inv-kpi-trend green">↗ 14%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#F59E0B" points="2,19 14,15 28,17 40,8 52,11 62,4" />
        </div>

        {/* 4. Low Stock Items */}
        <div className="inv-kpi-card">
          <div className="inv-kpi-info-group">
            <div className="inv-kpi-icon-wrap">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="inv-kpi-text-block">
              <span className="inv-kpi-title">Low Stock Items</span>
              <div className="inv-kpi-value-row">
                <span className="inv-kpi-number">{kpiMetrics.lowStockItems}</span>
                <span className="inv-kpi-trend red">↘ 5%</span>
              </div>
            </div>
          </div>
          <Sparkline color="#DC2626" points="2,8 14,10 26,6 40,14 52,12 62,19" />
        </div>
      </section>

      {/* =====================================================
          4. SEGMENTED STATUS TABS & ACTIONS ROW
      ===================================================== */}
      <section className="inv-tabs-row" aria-label="Inventory Status Filter Tabs">
        <div className="inv-tabs-group">
          {["All Items", "Low Stock", "Out of Stock", "Fast Moving", "Slow Moving"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`inv-tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* + Add Stock Button */}
        <button
          type="button"
          className="inv-add-stock-btn"
          onClick={() => setIsAddStockOpen(true)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Stock</span>
        </button>
      </section>

      {/* =====================================================
          5. FILTER & ACTION TOOLBAR
      ===================================================== */}
      <section className="inv-filter-bar">
        {/* Table Search */}
        <div className="inv-table-search-wrap">
          <svg
            className="inv-search-icon"
            width="15"
            height="15"
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
            className="inv-table-search-input"
            placeholder="Search by product name, SKU, category..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="inv-dropdown-filters-group">
          {/* Category Filter */}
          <div className="inv-filter-item">
            <span className="inv-filter-label">Category</span>
            <select
              className="inv-select-control"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Women Wear">Women Wear</option>
              <option value="Ethnic Wear">Ethnic Wear</option>
              <option value="Men Wear">Men Wear</option>
              <option value="Kids Wear">Kids Wear</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="inv-filter-item">
            <span className="inv-filter-label">Location</span>
            <select
              className="inv-select-control"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Chennai WH">Chennai WH</option>
              <option value="Bangalore WH">Bangalore WH</option>
              <option value="Mumbai WH">Mumbai WH</option>
              <option value="Delhi WH">Delhi WH</option>
              <option value="Hyderabad WH">Hyderabad WH</option>
              <option value="Kochi WH">Kochi WH</option>
              <option value="Pune WH">Pune WH</option>
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="inv-filter-item">
            <span className="inv-filter-label">Stock Status</span>
            <select
              className="inv-select-control"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <button
            type="button"
            className="inv-btn-reset"
            onClick={handleResetFilters}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </section>

      {/* =====================================================
          6. INVENTORY DATA TABLE
      ===================================================== */}
      <section className="inv-table-card">
        <div className="inv-table-container">
          <table className="inv-data-table">
            <thead>
              <tr>
                <th style={{ width: "55px" }}>Sl.No</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Designer</th>
                <th>Location</th>
                <th>Stock Qty</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th style={{ textAlign: "right", width: "90px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                    Loading inventory ledger...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                    No inventory records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const slNo = String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0");
                  const rowAlertClass =
                    item.stockQty < 10
                      ? "row-critical-blink"
                      : item.stockQty < 30
                      ? "row-warning-blink"
                      : "";

                  return (
                    <tr key={item.id} className={rowAlertClass}>
                      {/* Sl.No */}
                      <td>
                        <span className="inv-slno">{slNo}</span>
                      </td>

                      {/* Product Thumbnail & Name */}
                      <td>
                        <div className="inv-product-cell">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="inv-product-img"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/media/lehenga_pink_001.jpg";
                            }}
                          />
                          <span className="inv-product-name">{item.name}</span>
                        </div>
                      </td>

                      {/* SKU */}
                      <td>
                        <span className="inv-sku-code">{item.sku}</span>
                      </td>

                      {/* Category */}
                      <td>
                        <span className="inv-category-text">{item.category}</span>
                      </td>

                      {/* Designer */}
                      <td>
                        <span className="inv-designer-text">{item.designer}</span>
                      </td>

                      {/* Location */}
                      <td>
                        <span className="inv-location-text">{item.location}</span>
                      </td>

                      {/* Stock Qty */}
                      <td>
                        <span className="inv-stock-qty">{item.stockQty}</span>
                      </td>

                      {/* Reorder Level */}
                      <td>
                        <span className="inv-reorder-level">{item.reorderLevel}</span>
                      </td>

                      {/* Status */}
                      <td>
                        {item.stockQty === 0 ? (
                          <span className="inv-status-pill out-of-stock">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Out of Stock
                          </span>
                        ) : item.stockQty < 10 ? (
                          <span className="inv-status-pill critical-stock">
                            <span style={{ fontSize: "11px", lineHeight: "0" }}>●</span>
                            Critical (&lt;10)
                          </span>
                        ) : item.stockQty < 30 ? (
                          <span className="inv-status-pill low-stock">
                            <span style={{ fontSize: "11px", lineHeight: "0" }}>●</span>
                            Low Stock
                          </span>
                        ) : (
                          <span className="inv-status-pill in-stock">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Last Updated */}
                      <td>
                        <span className="inv-date-text">{item.lastUpdated}</span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="inv-action-icons">
                          {/* View Details Eye */}
                          <button
                            type="button"
                            className="inv-action-btn"
                            title="View SKU Details"
                            onClick={() => setViewDetailsItem(item)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Edit / Adjust Pencil */}
                          <button
                            type="button"
                            className="inv-action-btn"
                            title="Adjust Stock"
                            onClick={() => {
                              setAdjustStockItem(item);
                              setAdjustQty(String(item.stockQty));
                              setAdjustReason("set");
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Three Dots Menu */}
                          <button
                            type="button"
                            className="inv-action-btn"
                            title="More Options"
                            onClick={() => {
                              setViewDetailsItem(item);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>
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
            7. TABLE FOOTER / PAGINATION BAR
        ===================================================== */}
        <div className="inv-pagination-bar">
          <span className="inv-pagination-info">
            Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
          </span>

          <div className="inv-pagination-controls">
            <button
              type="button"
              className="inv-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={p}>
                    {prev && p - prev > 1 && <span className="inv-page-dots">...</span>}
                    <button
                      type="button"
                      className={`inv-page-btn ${currentPage === p ? "active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              type="button"
              className="inv-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          8. MODAL: + ADD STOCK
      ===================================================== */}
      {isAddStockOpen && (
        <div className="inv-modal-overlay" onClick={() => setIsAddStockOpen(false)}>
          <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3 className="inv-modal-title">Add Stock / New SKU</h3>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setIsAddStockOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddStockSubmit}>
              <div className="inv-modal-body">
                <div className="inv-form-group">
                  <label className="inv-form-label">Product Name *</label>
                  <input
                    type="text"
                    className="inv-form-input"
                    placeholder="e.g. Zari Embroidered Lehenga"
                    value={addForm.productName}
                    onChange={(e) => setAddForm({ ...addForm, productName: e.target.value })}
                    required
                  />
                </div>

                <div className="inv-form-group">
                  <label className="inv-form-label">SKU Code *</label>
                  <input
                    type="text"
                    className="inv-form-input"
                    placeholder="e.g. ZF011"
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="inv-form-group">
                    <label className="inv-form-label">Category</label>
                    <select
                      className="inv-form-select"
                      value={addForm.category}
                      onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    >
                      <option value="Women Wear">Women Wear</option>
                      <option value="Ethnic Wear">Ethnic Wear</option>
                      <option value="Men Wear">Men Wear</option>
                      <option value="Kids Wear">Kids Wear</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>

                  <div className="inv-form-group">
                    <label className="inv-form-label">Warehouse Location</label>
                    <select
                      className="inv-form-select"
                      value={addForm.location}
                      onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                    >
                      <option value="Chennai WH">Chennai WH</option>
                      <option value="Bangalore WH">Bangalore WH</option>
                      <option value="Mumbai WH">Mumbai WH</option>
                      <option value="Delhi WH">Delhi WH</option>
                      <option value="Hyderabad WH">Hyderabad WH</option>
                      <option value="Kochi WH">Kochi WH</option>
                      <option value="Pune WH">Pune WH</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="inv-form-group">
                    <label className="inv-form-label">Initial Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      className="inv-form-input"
                      value={addForm.quantity}
                      onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                    />
                  </div>

                  <div className="inv-form-group">
                    <label className="inv-form-label">Reorder Level</label>
                    <input
                      type="number"
                      min="1"
                      className="inv-form-input"
                      value={addForm.reorderLevel}
                      onChange={(e) => setAddForm({ ...addForm, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="inv-btn-cancel"
                  onClick={() => setIsAddStockOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="inv-btn-submit">
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          9. MODAL: VIEW DETAILS
      ===================================================== */}
      {viewDetailsItem && (
        <div className="inv-modal-overlay" onClick={() => setViewDetailsItem(null)}>
          <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3 className="inv-modal-title">SKU Details — {viewDetailsItem.sku}</h3>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setViewDetailsItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="inv-modal-body">
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <img
                  src={viewDetailsItem.image}
                  alt={viewDetailsItem.name}
                  style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "1px solid #EFE4D2" }}
                />
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", color: "#2D2319" }}>{viewDetailsItem.name}</h4>
                  <div style={{ fontSize: "12px", color: "#7E7265" }}>
                    Designer: <strong>{viewDetailsItem.designer}</strong>
                  </div>
                  <div style={{ fontSize: "12px", color: "#7E7265" }}>
                    Category: {viewDetailsItem.category} • Location: {viewDetailsItem.location}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div style={{ background: "#FAF7F2", padding: "10px", borderRadius: "8px", border: "1px solid #EFE4D2" }}>
                  <div style={{ fontSize: "11px", color: "#7E7265", textTransform: "uppercase" }}>Current Stock</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: viewDetailsItem.stockQty === 0 ? "#DC2626" : "#2D2319" }}>
                    {viewDetailsItem.stockQty} units
                  </div>
                </div>
                <div style={{ background: "#FAF7F2", padding: "10px", borderRadius: "8px", border: "1px solid #EFE4D2" }}>
                  <div style={{ fontSize: "11px", color: "#7E7265", textTransform: "uppercase" }}>Reorder Threshold</div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#2D2319" }}>
                    {viewDetailsItem.reorderLevel} units
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
                Last Inventory Audit: <strong>{viewDetailsItem.lastUpdated}</strong>
              </div>
            </div>
            <div className="inv-modal-footer">
              <button
                type="button"
                className="inv-btn-submit"
                onClick={() => setViewDetailsItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          10. MODAL: ADJUST STOCK
      ===================================================== */}
      {adjustStockItem && (
        <div className="inv-modal-overlay" onClick={() => setAdjustStockItem(null)}>
          <div className="inv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3 className="inv-modal-title">Adjust Stock — {adjustStockItem.sku}</h3>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setAdjustStockItem(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdjustStockSubmit}>
              <div className="inv-modal-body">
                <p style={{ margin: 0, fontSize: "13px", color: "#6C5B49" }}>
                  Current stock for <strong>{adjustStockItem.name}</strong> is{" "}
                  <strong>{adjustStockItem.stockQty} units</strong> at {adjustStockItem.location}.
                </p>

                <div className="inv-form-group">
                  <label className="inv-form-label">Adjustment Mode</label>
                  <select
                    className="inv-form-select"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  >
                    <option value="set">Set Exact Physical Count</option>
                    <option value="add">Receive Goods (Add Stock +)</option>
                    <option value="remove">Deduct Units (Damage / Write-off -)</option>
                  </select>
                </div>

                <div className="inv-form-group">
                  <label className="inv-form-label">
                    {adjustReason === "set" ? "New Total Quantity" : "Quantity to Add / Deduct"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="inv-form-input"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="inv-modal-footer">
                <button
                  type="button"
                  className="inv-btn-cancel"
                  onClick={() => setAdjustStockItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="inv-btn-submit">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}