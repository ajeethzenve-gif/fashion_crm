import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/Delivery.css";
import bannerImg from "../assest/accounting-banner.jpg";
import {
  getShipments,
  getShipmentStats,
  createShipment,
  updateShipment,
  deleteShipment,
  getOrders,
} from "../services/api";
import { showSuccessToast, showErrorToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   SVG SPARKLINES
========================================================= */

function Sparkline({ color = "#F59E0B" }) {
  return (
    <svg
      className="dlv-kpi-sparkline"
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
   COURIER BADGE COMPONENT
========================================================= */

function CourierBadge({ courier }) {
  const norm = String(courier || "").toLowerCase().replace(/\s+/g, "");
  let badgeClass = "delhivery";
  let label = "DELHIVERY";

  if (norm.includes("ekart")) {
    badgeClass = "ekart";
    label = "ekart";
  } else if (norm.includes("blue") || norm.includes("dart")) {
    badgeClass = "bluedart";
    label = "BLUE";
  } else if (norm.includes("dtdc")) {
    badgeClass = "dtdc";
    label = "DTDC";
  } else if (norm.includes("xpress") || norm.includes("bees")) {
    badgeClass = "xpressbees";
    label = "XPRESSBEES";
  }

  return (
    <div className="dlv-courier-cell">
      <span className={`dlv-courier-badge ${badgeClass}`}>{label}</span>
      <span className="dlv-courier-name">{courier}</span>
    </div>
  );
}

/* =========================================================
   DELIVERY ENGINE COMPONENT (08) - REAL DATABASE CONNECTED
========================================================= */

export default function DeliveryEngine() {
  const { user } = useAuth();
  const [shipmentsList, setShipmentsList] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Shipments");

  // Filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [courierFilter, setCourierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRangeFilter, setDateRangeFilter] = useState("All");

  // Right panel quick track input & interactive zoom
  const [panelTrackInput, setPanelTrackInput] = useState("");
  const [mapZoom, setMapZoom] = useState(1);

  // Sync panel track input whenever selected shipment updates
  useEffect(() => {
    if (selectedShipment) {
      setPanelTrackInput(selectedShipment.trackingNo || selectedShipment.tracking_number || "");
    }
  }, [selectedShipment]);

  // Compute live telemetry coordinates for truck on vector map
  const truckCoords = useMemo(() => {
    const s = String(selectedShipment?.status || "").toLowerCase();
    if (s.includes("deliver")) {
      return { x: 216, y: 96, label: "Delivered", pct: 100, color: "#16A34A" };
    }
    if (s.includes("out") || s.includes("delivery")) {
      return { x: 185, y: 102, label: "Out for Delivery", pct: 85, color: "#2563EB" };
    }
    if (s.includes("transit")) {
      return { x: 140, y: 98, label: "In Transit", pct: 50, color: "#D97706" };
    }
    if (s.includes("pick") || s.includes("pending")) {
      return { x: 85, y: 76, label: "Order Picked Up", pct: 20, color: "#D97706" };
    }
    if (s.includes("exception") || s.includes("rto")) {
      return { x: 140, y: 98, label: "Exception Alert", pct: 50, color: "#DC2626" };
    }
    return { x: 140, y: 98, label: "Active Route", pct: 50, color: "#D97706" };
  }, [selectedShipment]);

  // Create Shipment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrderId, setNewOrderId] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newCourier, setNewCourier] = useState("Delhivery");
  const [newDestination, setNewDestination] = useState("");
  const [newExpectedDelivery, setNewExpectedDelivery] = useState("12 Oct 2026");
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /* -------------------------------------------------------
     FETCH REAL SHIPMENTS & STATS FROM DJANGO BACKEND
  ------------------------------------------------------- */
  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      let data = [];
      let statsData = null;

      try {
        const [shipmentsRes, statsRes] = await Promise.all([
          getShipments(),
          getShipmentStats().catch(() => null),
        ]);
        if (Array.isArray(shipmentsRes)) data = shipmentsRes;
        if (statsRes) statsData = statsRes;
      } catch (shipmentErr) {
        console.warn("getShipments fallback to getOrders:", shipmentErr);
      }

      // If shipments endpoint returned empty, load real database orders as fallback
      if (data.length === 0) {
        try {
          const ordersRes = await getOrders();
          const orders = Array.isArray(ordersRes) ? ordersRes : [];
          if (orders.length > 0) {
            const couriers = ["Delhivery", "Ekart", "Blue Dart", "DTDC", "XpressBees"];
            data = orders.map((ord, idx) => {
              const custName = ord.shipping_full_name || ord.customer_name || "Guest Customer";
              const city = ord.shipping_city || "Bengaluru";
              const courier = couriers[idx % couriers.length];
              const isDelivered = ["Delivered", "DELIVERED"].includes(ord.order_status);
              const status = isDelivered ? "Delivered" : "In Transit";
              return {
                id: ord.id,
                order: ord.id,
                order_number: ord.order_number || `ORD${1000 + ord.id}`,
                orderId: ord.order_number || `ORD${1000 + ord.id}`,
                tracking_number: `BLR${123456789 + ord.id * 104729 % 876543210}`,
                trackingNo: `BLR${123456789 + ord.id * 104729 % 876543210}`,
                customer_name: custName,
                customer: custName,
                customer_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=F5E6D3&color=5C3A21&bold=true&rounded=true&size=80`,
                courier: courier,
                status: status,
                expected_delivery: ord.estimated_delivery || "10 Oct 2026",
                expectedDelivery: ord.estimated_delivery || "10 Oct 2026",
                destination_city: city,
                destination_address: ord.delivery_address || `${city}, India`,
                origin_hub: "Bangalore Hub",
                destination_hub: `${city} Delivery Centre`,
                timeline: [
                  { status: "Order Picked Up", location: "Bangalore Hub", time: ord.created_at ? new Date(ord.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Today", completed: true },
                  { status: "In Transit", location: `${city} Transit Hub`, time: "In Transit", completed: true },
                  { status: "Out for Delivery", location: `${city} Delivery Centre`, time: "Scheduled", completed: isDelivered },
                  { status: "Delivered", location: ord.delivery_address || `${city}, India`, time: isDelivered ? "Delivered" : "Expected Soon", completed: isDelivered },
                ],
              };
            });
          }
        } catch (ordersErr) {
          console.error("Orders fallback failed:", ordersErr);
        }
      }

      setShipmentsList(data);
      if (statsData) setStats(statsData);
      if (data.length > 0) {
        setSelectedShipment((prev) => {
          if (prev && data.some((s) => s.id === prev.id)) {
            return data.find((s) => s.id === prev.id);
          }
          return data[0];
        });
      }
    } catch (err) {
      console.error("Failed to load shipments from database:", err);
      showErrorToast("Could not connect to live database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryData();
  }, []);

  /* -------------------------------------------------------
     LIVE KPI CALCULATIONS FROM DATABASE
  ------------------------------------------------------- */
  const kpiData = useMemo(() => {
    const total = stats?.total_shipments ?? shipmentsList.length;
    const inTransit =
      stats?.in_transit ??
      shipmentsList.filter((s) => s.status?.toLowerCase() === "in transit").length;
    const delivered =
      stats?.delivered ??
      shipmentsList.filter((s) => s.status?.toLowerCase() === "delivered").length;
    const pending =
      stats?.pending ??
      shipmentsList.filter((s) => s.status?.toLowerCase() === "pending").length;
    const exceptions =
      stats?.exceptions ??
      shipmentsList.filter((s) => s.status?.toLowerCase() === "exception").length;

    return { total, inTransit, delivered, pending, exceptions };
  }, [stats, shipmentsList]);

  /* -------------------------------------------------------
     FILTER SHIPMENTS DIRECTLY FROM DATABASE RECORDS
  ------------------------------------------------------- */
  const filteredShipments = useMemo(() => {
    return shipmentsList.filter((item) => {
      // 1. Tab Filter
      const normStatus = String(item.status || "").toLowerCase();
      if (activeTab === "In Transit" && normStatus !== "in transit") return false;
      if (activeTab === "Delivered" && normStatus !== "delivered") return false;
      if (activeTab === "Pending" && normStatus !== "pending") return false;
      if (activeTab === "Exceptions" && normStatus !== "exception") return false;
      if (activeTab === "RTO" && normStatus !== "rto") return false;

      // 2. Search Query
      const q = (globalSearch || tableSearch).trim().toLowerCase();
      if (q) {
        const tNo = String(item.trackingNo || item.tracking_number || "").toLowerCase();
        const oId = String(item.orderId || item.order_number || "").toLowerCase();
        const cust = String(item.customer || item.customer_name || "").toLowerCase();
        const cour = String(item.courier || "").toLowerCase();
        const city = String(item.destination_city || "").toLowerCase();
        if (
          !tNo.includes(q) &&
          !oId.includes(q) &&
          !cust.includes(q) &&
          !cour.includes(q) &&
          !city.includes(q)
        ) {
          return false;
        }
      }

      // 3. Dropdown Filters
      if (courierFilter !== "All" && item.courier !== courierFilter) return false;
      if (statusFilter !== "All" && normStatus !== statusFilter.toLowerCase()) return false;

      return true;
    });
  }, [shipmentsList, activeTab, globalSearch, tableSearch, courierFilter, statusFilter]);

  /* -------------------------------------------------------
     PAGINATION ON DATABASE RECORDS
  ------------------------------------------------------- */
  const totalCount = filteredShipments.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedShipments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, currentPage]);

  /* -------------------------------------------------------
     SELECTION HANDLERS
  ------------------------------------------------------- */
  const isAllSelected =
    paginatedShipments.length > 0 &&
    paginatedShipments.every((s) => selectedIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set(selectedIds);
      paginatedShipments.forEach((s) => next.add(s.id));
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
    setActiveTab("All Shipments");
    setCourierFilter("All");
    setStatusFilter("All");
    setDateRangeFilter("All");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  /* -------------------------------------------------------
     TRACK BY NUMBER ACTION
  ------------------------------------------------------- */
  const handlePanelTrack = async () => {
    const raw = panelTrackInput.trim();
    if (!raw) {
      showErrorToast("Please enter a tracking number or order ID");
      return;
    }
    const q = raw.toLowerCase();

    // 1. Search locally in memory
    let found = shipmentsList.find(
      (s) =>
        (s.trackingNo || s.tracking_number || "").toLowerCase().includes(q) ||
        (s.orderId || s.order_number || "").toLowerCase().includes(q) ||
        (s.customer || s.customer_name || "").toLowerCase().includes(q)
    );

    // 2. If not found in current memory list, query live backend database directly
    if (!found) {
      try {
        const results = await getShipments({ search: raw });
        if (Array.isArray(results) && results.length > 0) {
          found = results[0];
          setShipmentsList((prev) => [found, ...prev.filter((p) => p.id !== found.id)]);
        }
      } catch (err) {
        console.error("Backend tracking query error:", err);
      }
    }

    if (found) {
      setSelectedShipment(found);
      setPanelTrackInput(found.trackingNo || found.tracking_number || raw);
      showSuccessToast(`Active tracking for ${found.trackingNo || found.tracking_number}`);
    } else {
      showErrorToast(`Tracking number "${raw}" not found in database`);
    }
  };

  /* -------------------------------------------------------
     CREATE NEW SHIPMENT IN DATABASE
  ------------------------------------------------------- */
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!newOrderId.trim()) {
      showErrorToast("Order ID is required");
      return;
    }

    try {
      setSubmitting(true);
      const trackingNumber = `BLR${Math.floor(100000000 + Math.random() * 900000000)}`;
      const payload = {
        tracking_number: trackingNumber,
        order_number: newOrderId.trim(),
        customer_name: newCustomer.trim() || "Guest Customer",
        customer_avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newCustomer || "C")}&background=F5E6D3&color=5C3A21&bold=true&rounded=true&size=80`,
        courier: newCourier,
        status: "In Transit",
        destination_city: newDestination.trim() || "Bengaluru",
        destination_address: newDestination.trim() ? `${newDestination.trim()}, India` : "India",
        expected_delivery: newExpectedDelivery,
        origin_hub: "Bangalore Hub",
        destination_hub: newDestination.trim() ? `${newDestination.trim()} Delivery Centre` : "Regional Delivery Centre",
      };

      const created = await createShipment(payload);
      showSuccessToast(`Shipment ${created.tracking_number || trackingNumber} created in database!`);
      setIsModalOpen(false);
      setNewOrderId("");
      setNewCustomer("");
      setNewDestination("");
      await loadDeliveryData();
      if (created) setSelectedShipment(created);
    } catch (err) {
      console.error("Failed to create shipment:", err);
      showErrorToast(err.message || "Failed to create shipment in database");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     UPDATE SHIPMENT STATUS (e.g. MARK DELIVERED)
  ------------------------------------------------------- */
  const handleMarkDelivered = async (item) => {
    try {
      await updateShipment(item.id, { status: "Delivered" });
      showSuccessToast(`Shipment ${item.trackingNo || item.tracking_number} updated to Delivered`);
      await loadDeliveryData();
    } catch (err) {
      console.error("Failed to update status:", err);
      showErrorToast("Failed to update shipment status");
    }
  };

  /* -------------------------------------------------------
     DELETE SHIPMENT FROM DATABASE
  ------------------------------------------------------- */
  const handleDeleteShipment = async (item) => {
    const trackingLabel = item.trackingNo || item.tracking_number || `#${item.id}`;
    if (!window.confirm(`Delete shipment ${trackingLabel} from database?`)) {
      return;
    }
    try {
      await deleteShipment(item.id);
      showSuccessToast(`Shipment ${trackingLabel} deleted from database`);
      await loadDeliveryData();
    } catch (err) {
      console.error("Failed to delete shipment:", err);
      showErrorToast("Failed to delete shipment from database");
    }
  };

  return (
    <div className="dlv-page-wrapper">
      {/* =====================================================
          MAIN CONTENT CONTAINER
      ===================================================== */}
      <main className="dlv-container">
        {/* HERO BANNER */}
        <section className="dlv-hero-banner">
          <img
            src={bannerImg}
            alt="Zenve Fashion Haute Couture Atelier"
            className="dlv-banner-bg-img"
          />
          <div className="dlv-banner-content">
            <h1 className="dlv-hero-title">Delivery Engine</h1>
            <p className="dlv-hero-subtitle">
              Track shipments, manage deliveries and ensure on-time fulfilment
            </p>
          </div>
        </section>

        {/* 3. 5 KPI METRIC CARDS - REAL DATABASE METRICS */}
        <section className="dlv-kpi-grid">
          {/* Card 1: Total Shipments */}
          <div className="dlv-kpi-card">
            <div className="dlv-kpi-info-group">
              <div className="dlv-kpi-icon-wrap shipments">
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
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div className="dlv-kpi-text-block">
                <span className="dlv-kpi-title">Total Shipments</span>
                <div className="dlv-kpi-value-row">
                  <span className="dlv-kpi-number">{kpiData.total}</span>
                  <span className="dlv-kpi-trend green">↗ 18%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#F59E0B" />
          </div>

          {/* Card 2: In Transit */}
          <div className="dlv-kpi-card">
            <div className="dlv-kpi-info-group">
              <div className="dlv-kpi-icon-wrap transit">
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
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div className="dlv-kpi-text-block">
                <span className="dlv-kpi-title">In Transit</span>
                <div className="dlv-kpi-value-row">
                  <span className="dlv-kpi-number">{kpiData.inTransit}</span>
                  <span className="dlv-kpi-trend green">↗ 12%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#F97316" />
          </div>

          {/* Card 3: Delivered */}
          <div className="dlv-kpi-card">
            <div className="dlv-kpi-info-group">
              <div className="dlv-kpi-icon-wrap delivered">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div className="dlv-kpi-text-block">
                <span className="dlv-kpi-title">Delivered</span>
                <div className="dlv-kpi-value-row">
                  <span className="dlv-kpi-number">{kpiData.delivered}</span>
                  <span className="dlv-kpi-trend green">↗ 22%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#22C55E" />
          </div>

          {/* Card 4: Pending */}
          <div className="dlv-kpi-card">
            <div className="dlv-kpi-info-group">
              <div className="dlv-kpi-icon-wrap pending">
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
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="dlv-kpi-text-block">
                <span className="dlv-kpi-title">Pending</span>
                <div className="dlv-kpi-value-row">
                  <span className="dlv-kpi-number">{kpiData.pending}</span>
                  <span className="dlv-kpi-trend red">↘ 6%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#EF4444" />
          </div>

          {/* Card 5: Delivery Exceptions */}
          <div className="dlv-kpi-card">
            <div className="dlv-kpi-info-group">
              <div className="dlv-kpi-icon-wrap exceptions">
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
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div className="dlv-kpi-text-block">
                <span className="dlv-kpi-title">Delivery Exceptions</span>
                <div className="dlv-kpi-value-row">
                  <span className="dlv-kpi-number">{kpiData.exceptions}</span>
                  <span className="dlv-kpi-trend red">↘ 10%</span>
                </div>
              </div>
            </div>
            <Sparkline color="#EAB308" />
          </div>
        </section>

        {/* 4. TABS ROW & CREATE SHIPMENT ACTION */}
        <section className="dlv-tabs-row">
          <div className="dlv-tabs-pills">
            {["All Shipments", "In Transit", "Delivered", "Pending", "Exceptions", "RTO"].map((tab) => (
              <button
                key={tab}
                className={`dlv-tab-btn ${activeTab === tab ? "active" : ""}`}
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
            className="dlv-create-btn"
            onClick={() => setIsModalOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Shipment</span>
          </button>
        </section>

        {/* 5. FILTER & SEARCH TOOLBAR */}
        <section className="dlv-filter-toolbar">
          <div className="dlv-table-search-wrap">
            <svg
              className="dlv-table-search-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="dlv-table-search-input"
              placeholder="Search by order ID, tracking number, customer, or courier..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="dlv-filters-group">
            <div className="dlv-filter-item">
              <span className="dlv-filter-label">Courier</span>
              <select
                className="dlv-filter-select"
                value={courierFilter}
                onChange={(e) => {
                  setCourierFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All</option>
                <option value="Delhivery">Delhivery</option>
                <option value="Ekart">Ekart</option>
                <option value="Blue Dart">Blue Dart</option>
                <option value="DTDC">DTDC</option>
                <option value="XpressBees">XpressBees</option>
              </select>
            </div>

            <div className="dlv-filter-item">
              <span className="dlv-filter-label">Status</span>
              <select
                className="dlv-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="All">All</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
                <option value="Exception">Exception</option>
                <option value="RTO">RTO</option>
              </select>
            </div>

            <div className="dlv-filter-item">
              <span className="dlv-filter-label">Date Range</span>
              <select
                className="dlv-filter-select"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="This Month">This Month</option>
              </select>
            </div>

            <button className="dlv-reset-btn" onClick={handleResetFilters}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        </section>

        {/* 6. SPLIT WORKSPACE: TABLE & TRACKING WIDGET */}
        <div className="dlv-split-grid">
          {/* LEFT: SHIPMENTS TABLE */}
          <div className="dlv-table-card">
            <div className="dlv-table-scroll">
              <table className="dlv-table">
                <thead>
                  <tr>
                    <th style={{ width: "52px" }}>Sl.No</th>
                    <th>Tracking No.</th>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Courier</th>
                    <th>Status</th>
                    <th>Expected Delivery</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                        Loading shipments from database...
                      </td>
                    </tr>
                  ) : paginatedShipments.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#6B7280" }}>
                        No shipments found matching filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedShipments.map((item, idx) => {
                      const rowNum = String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0");
                      const isSelected = selectedShipment?.id === item.id;
                      const statusClass = (item.status || "in-transit").toLowerCase().replace(/\s+/g, "-");

                      const trackingNumber = item.trackingNo || item.tracking_number || `BLR${item.id}`;
                      const orderNumber = item.orderId || item.order_number || `ORD${item.order || item.id}`;
                      const customerName = item.customer || item.customer_name || "Customer";
                      const customerAvatar =
                        item.avatar ||
                        item.customer_avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=F5E6D3&color=5C3A21&bold=true&rounded=true&size=80`;

                      return (
                        <tr
                          key={item.id}
                          className={isSelected ? "active-row" : ""}
                          onClick={() => setSelectedShipment(item)}
                        >
                          {/* Row Index */}
                          <td>
                            <span className="dlv-index-num">{rowNum}</span>
                          </td>

                          {/* Tracking Number */}
                          <td>
                            <span className="dlv-tracking-link">{trackingNumber}</span>
                          </td>

                          {/* Order ID */}
                          <td>
                            <Link
                              to={`/orders?search=${orderNumber}`}
                              className="dlv-order-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {orderNumber}
                            </Link>
                          </td>

                          {/* Customer */}
                          <td>
                            <div className="dlv-customer-cell">
                              <img
                                src={customerAvatar}
                                alt={customerName}
                                className="dlv-customer-avatar"
                              />
                              <span className="dlv-customer-name">{customerName}</span>
                            </div>
                          </td>

                          {/* Courier */}
                          <td>
                            <CourierBadge courier={item.courier || "Delhivery"} />
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`dlv-status-pill ${statusClass}`}>
                              {item.status === "Delivered" && "✔ "}
                              {item.status === "Exception" && "✖ "}
                              {item.status !== "Delivered" && item.status !== "Exception" && "● "}
                              {item.status || "In Transit"}
                            </span>
                          </td>

                          {/* Expected Delivery */}
                          <td>{item.expectedDelivery || item.expected_delivery || "10 Oct 2026"}</td>

                          {/* Actions */}
                          <td style={{ textAlign: "right" }}>
                            <div className="dlv-actions-cell" style={{ justifyContent: "flex-end" }}>
                              {/* View Eye */}
                              <button
                                className="dlv-action-btn"
                                title="View Tracking Details"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedShipment(item);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>

                              {/* Location Pin */}
                              <button
                                className="dlv-action-btn"
                                title="Track Live Route"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedShipment(item);
                                  showSuccessToast(`Viewing live route for ${trackingNumber}`);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                  <circle cx="12" cy="10" r="3" />
                                </svg>
                              </button>

                              {/* Quick Mark Delivered */}
                              {item.status !== "Delivered" && (
                                <button
                                  className="dlv-action-btn"
                                  title="Mark as Delivered"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkDelivered(item);
                                  }}
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </button>
                              )}

                              {/* Delete Shipment */}
                              <button
                                className="dlv-action-btn dlv-delete-action"
                                title="Delete Shipment"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteShipment(item);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

            {/* Pagination */}
            <div className="dlv-pagination-bar">
              <span className="dlv-pagination-info">
                Showing {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} shipments
              </span>
              <div className="dlv-pagination-controls">
                <button
                  className="dlv-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    className={`dlv-page-btn ${currentPage === page ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="dlv-page-dots">...</span>
                    <button
                      className={`dlv-page-btn ${currentPage === totalPages ? "active" : ""}`}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  className="dlv-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>

          {/* DOWN: SHIPMENT TRACKING WIDGET */}
          <aside className="dlv-tracking-panel">
            <div className="dlv-tracking-top-bar">
              <div className="dlv-tracking-header">
                <div className="dlv-tracking-box-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <h3 className="dlv-tracking-title">Shipment Tracking</h3>
              </div>

              {/* Quick Track Search Input */}
              <div className="dlv-panel-search-row">
                <div className="dlv-panel-input-wrap">
                  <svg
                    className="dlv-panel-input-icon"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="dlv-panel-input"
                    placeholder="Enter tracking number"
                    value={panelTrackInput}
                    onChange={(e) => setPanelTrackInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePanelTrack()}
                  />
                </div>
                <button className="dlv-panel-track-btn" onClick={handlePanelTrack}>
                  Track
                </button>
              </div>
            </div>

            <div className="dlv-tracking-body-grid">
              {/* Left Column: Live Map + Summary */}
              <div className="dlv-tracking-left-col">
                {/* Live Tracking Map */}
                <div className="dlv-map-section">
              <div className="dlv-map-header-row">
                <h4 className="dlv-section-heading">Live Tracking</h4>
                <div className="dlv-map-telemetry-pill">
                  <span className="dlv-telemetry-dot" />
                  <span>{truckCoords.label} • {truckCoords.pct}%</span>
                </div>
              </div>
              <div className="dlv-map-card">
                {/* Zoom Controls */}
                <div className="dlv-map-controls">
                  <button
                    type="button"
                    className="dlv-map-ctrl-btn"
                    title="Zoom in"
                    onClick={() => setMapZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(2)))}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="dlv-map-ctrl-btn"
                    title="Zoom out"
                    onClick={() => setMapZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(2)))}
                  >
                    −
                  </button>
                </div>

                {/* Scaled Vector Map Preview */}
                <div
                  className="dlv-map-scale-wrap"
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: `scale(${mapZoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <svg className="dlv-map-svg" viewBox="0 0 320 160" preserveAspectRatio="none">
                    {/* Water Background */}
                    <rect width="320" height="160" fill="#E4F0F6" />

                    {/* Stylized Coastal Terrain / Land Mass */}
                    <path
                      d="M-20 0 L180 0 C210 20 220 50 200 90 C180 130 140 150 110 160 L-20 160 Z"
                      fill="#F7ECD9"
                    />
                    <path
                      d="M170 0 C200 20 230 40 240 70 C250 110 280 130 340 140 L340 0 Z"
                      fill="#FDF6EB"
                    />
                    <path
                      d="M120 160 C150 140 180 130 210 140 C240 150 260 160 340 160 L340 140 C280 130 250 110 240 70 C230 40 200 20 170 0 L140 0 C160 30 180 60 160 90 C140 120 110 140 80 160 Z"
                      fill="#EFE4CF"
                    />

                    {/* Connecting Route Line (Dashed) */}
                    <path
                      d="M 60 70 Q 140 110, 220 100"
                      fill="none"
                      stroke="#8B5A2B"
                      strokeWidth="2.5"
                      strokeDasharray="5,4"
                      strokeLinecap="round"
                    />

                    {/* Waypoint Hub Dots */}
                    <circle cx="110" cy="92" r="3" fill="#D97706" />
                    <circle cx="165" cy="104" r="3" fill="#D97706" />

                    {/* Origin Marker (Green Pin) */}
                    <g transform="translate(60, 68)">
                      <circle cx="0" cy="-14" r="7" fill="#16A34A" />
                      <circle cx="0" cy="-14" r="2.5" fill="#FFFFFF" />
                      <polygon points="0,0 -5,-12 5,-12" fill="#16A34A" />
                      <text x="0" y="8" fontSize="7.5" fontWeight="700" fill="#15803D" textAnchor="middle">
                        {selectedShipment?.origin_hub || "Bangalore Hub"}
                      </text>
                    </g>

                    {/* Moving Delivery Truck on Route */}
                    <g transform={`translate(${truckCoords.x}, ${truckCoords.y})`}>
                      <rect x="-10" y="-8" width="14" height="9" rx="1.5" fill="#78350F" />
                      <rect x="4" y="-5" width="6" height="6" rx="1" fill="#92400E" />
                      <circle cx="-5" cy="2" r="2.2" fill="#1F2937" />
                      <circle cx="7" cy="2" r="2.2" fill="#1F2937" />
                    </g>

                    {/* Destination Marker (Red / Green Pin) */}
                    <g transform="translate(220, 98)">
                      <circle cx="0" cy="-14" r="7" fill={truckCoords.pct === 100 ? "#16A34A" : "#DC2626"} />
                      <circle cx="0" cy="-14" r="2.5" fill="#FFFFFF" />
                      <polygon points="0,0 -5,-12 5,-12" fill={truckCoords.pct === 100 ? "#16A34A" : "#DC2626"} />
                      <text x="0" y="8" fontSize="7.5" fontWeight="700" fill="#991B1B" textAnchor="middle">
                        {selectedShipment?.destination_city || "Destination"}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Package Details Summary Card */}
            {selectedShipment && (
              <div className="dlv-pkg-summary-card">
                <div className="dlv-pkg-summary-header">
                  <div>
                    <span className="dlv-pkg-summary-lbl">PACKAGE TRACKING</span>
                    <div className="dlv-pkg-summary-num-row">
                      <strong className="dlv-pkg-summary-num">
                        {selectedShipment.trackingNo || selectedShipment.tracking_number}
                      </strong>
                      <button
                        type="button"
                        className="dlv-pkg-copy-btn"
                        title="Copy Tracking Number"
                        onClick={() => {
                          const num = selectedShipment.trackingNo || selectedShipment.tracking_number;
                          navigator.clipboard.writeText(num);
                          showSuccessToast(`Copied ${num} to clipboard`);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className={`dlv-status-pill ${(selectedShipment.status || "in-transit").toLowerCase().replace(/\s+/g, "-")}`}>
                    {selectedShipment.status || "In Transit"}
                  </span>
                </div>

                <div className="dlv-pkg-summary-grid">
                  <div className="dlv-pkg-grid-cell">
                    <span className="dlv-pkg-cell-k">Order ID</span>
                    <span className="dlv-pkg-cell-v">#{selectedShipment.orderId || selectedShipment.order_number}</span>
                  </div>
                  <div className="dlv-pkg-grid-cell">
                    <span className="dlv-pkg-cell-k">Courier</span>
                    <span className="dlv-pkg-cell-v">{selectedShipment.courier || "Delhivery"}</span>
                  </div>
                  <div className="dlv-pkg-grid-cell">
                    <span className="dlv-pkg-cell-k">Recipient</span>
                    <span className="dlv-pkg-cell-v">{selectedShipment.customer || selectedShipment.customer_name}</span>
                  </div>
                  <div className="dlv-pkg-grid-cell">
                    <span className="dlv-pkg-cell-k">Est. Delivery</span>
                    <span className="dlv-pkg-cell-v">{selectedShipment.expectedDelivery || selectedShipment.expected_delivery || "3-5 Business Days"}</span>
                  </div>
                  <div className="dlv-pkg-grid-cell full-width">
                    <span className="dlv-pkg-cell-k">Destination Address</span>
                    <span className="dlv-pkg-cell-v" title={selectedShipment.destination_address || selectedShipment.destinationAddress}>
                      {selectedShipment.destination_address || selectedShipment.destinationAddress || `${selectedShipment.destination_city || "Bengaluru"}, India`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Tracking Timeline */}
          <div className="dlv-tracking-right-col">
                <div className="dlv-timeline-section">
                  <h4 className="dlv-section-heading">Tracking Timeline</h4>
              <div className="dlv-timeline-list">
                {selectedShipment?.timeline && Array.isArray(selectedShipment.timeline) && selectedShipment.timeline.length > 0 ? (
                  selectedShipment.timeline.map((step, idx) => (
                    <div key={idx} className="dlv-timeline-item">
                      <div className={`dlv-timeline-dot ${step.completed ? "completed" : ""}`}>
                        {step.completed && "✔"}
                      </div>
                      <div className="dlv-timeline-header">
                        <span className="dlv-timeline-status">{step.status}</span>
                        <span className="dlv-timeline-time">{step.time}</span>
                      </div>
                      <span className="dlv-timeline-location">{step.location}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="dlv-timeline-item">
                      <div className="dlv-timeline-dot completed">✔</div>
                      <div className="dlv-timeline-header">
                        <span className="dlv-timeline-status">Order Picked Up</span>
                        <span className="dlv-timeline-time">
                          {selectedShipment?.created_at
                            ? new Date(selectedShipment.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "06 Oct 2026, 10:30 AM"}
                        </span>
                      </div>
                      <span className="dlv-timeline-location">
                        {selectedShipment?.origin_hub || selectedShipment?.originHub || "Bangalore Hub"}
                      </span>
                    </div>
                    <div className="dlv-timeline-item">
                      <div
                        className={`dlv-timeline-dot ${
                          selectedShipment?.status === "In Transit" || selectedShipment?.status === "Delivered"
                            ? "completed"
                            : ""
                        }`}
                      >
                        {(selectedShipment?.status === "In Transit" || selectedShipment?.status === "Delivered") && "✔"}
                      </div>
                      <div className="dlv-timeline-header">
                        <span className="dlv-timeline-status">In Transit</span>
                        <span className="dlv-timeline-time">Active Route</span>
                      </div>
                      <span className="dlv-timeline-location">
                        {selectedShipment?.destination_city
                          ? `${selectedShipment.destination_city} Transit Hub`
                          : "Regional Transit Facility"}
                      </span>
                    </div>
                    <div className="dlv-timeline-item">
                      <div
                        className={`dlv-timeline-dot ${selectedShipment?.status === "Delivered" ? "completed" : ""}`}
                      >
                        {selectedShipment?.status === "Delivered" && "✔"}
                      </div>
                      <div className="dlv-timeline-header">
                        <span className="dlv-timeline-status">Out for Delivery</span>
                        <span className="dlv-timeline-time">Pending Final Mile</span>
                      </div>
                      <span className="dlv-timeline-location">
                        {selectedShipment?.destination_hub || selectedShipment?.destinationHub || "Local Delivery Center"}
                      </span>
                    </div>
                    <div className="dlv-timeline-item">
                      <div
                        className={`dlv-timeline-dot ${selectedShipment?.status === "Delivered" ? "completed" : ""}`}
                      >
                        {selectedShipment?.status === "Delivered" && "✔"}
                      </div>
                      <div className="dlv-timeline-header">
                        <span className="dlv-timeline-status">Delivered</span>
                        <span className="dlv-timeline-time">
                          {selectedShipment?.status === "Delivered"
                            ? "Completed"
                            : selectedShipment?.expectedDelivery || selectedShipment?.expected_delivery || "Expected Soon"}
                        </span>
                      </div>
                      <span className="dlv-timeline-location">
                        {selectedShipment?.destination_address || selectedShipment?.destinationAddress || "Customer Address"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
      </main>

      {/* =====================================================
          7. CREATE SHIPMENT MODAL
      ===================================================== */}
      {isModalOpen && (
        <div className="dlv-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="dlv-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dlv-modal-header">
              <h3 className="dlv-modal-title">Create New Shipment (Database)</h3>
              <button
                className="dlv-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateShipment}>
              <div className="dlv-modal-body">
                <div className="dlv-form-group">
                  <label className="dlv-form-label">Order ID *</label>
                  <input
                    type="text"
                    className="dlv-form-input"
                    placeholder="e.g. ORD1011 or ZNV-2026-1016"
                    value={newOrderId}
                    onChange={(e) => setNewOrderId(e.target.value)}
                    required
                  />
                </div>

                <div className="dlv-form-group">
                  <label className="dlv-form-label">Customer Name</label>
                  <input
                    type="text"
                    className="dlv-form-input"
                    placeholder="e.g. Minato"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                  />
                </div>

                <div className="dlv-form-group">
                  <label className="dlv-form-label">Courier Partner</label>
                  <select
                    className="dlv-form-select"
                    value={newCourier}
                    onChange={(e) => setNewCourier(e.target.value)}
                  >
                    <option value="Delhivery">Delhivery</option>
                    <option value="Ekart">Ekart</option>
                    <option value="Blue Dart">Blue Dart</option>
                    <option value="DTDC">DTDC</option>
                    <option value="XpressBees">XpressBees</option>
                  </select>
                </div>

                <div className="dlv-form-group">
                  <label className="dlv-form-label">Destination City / Hub</label>
                  <input
                    type="text"
                    className="dlv-form-input"
                    placeholder="e.g. Bangalore, Chennai, Mumbai"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                  />
                </div>

                <div className="dlv-form-group">
                  <label className="dlv-form-label">Expected Delivery Date</label>
                  <input
                    type="text"
                    className="dlv-form-input"
                    placeholder="e.g. 12 Oct 2026"
                    value={newExpectedDelivery}
                    onChange={(e) => setNewExpectedDelivery(e.target.value)}
                  />
                </div>
              </div>

              <div className="dlv-modal-footer">
                <button
                  type="button"
                  className="dlv-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dlv-btn-submit" disabled={submitting}>
                  {submitting ? "Dispatching..." : "Dispatch Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}