import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/CommandCentre.css";
import {
  getCommandCentreOverview,
  getOrders,
  getProducts,
  getDesigners,
  getReturns,
  getSettlements,
} from "../services/api";
import { showSuccessToast, showInfoToast, showWarningToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

/* =========================================================
   SVG ICONS
========================================================= */

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function RupeeIcon() {
  return (
    <span style={{ fontSize: "20px", fontWeight: "700", color: "#B87333", fontFamily: "sans-serif" }}>₹</span>
  );
}

function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B87333" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function MiniSparkline({ color = "#E08F35" }) {
  return (
    <svg width="56" height="20" viewBox="0 0 56 20" fill="none">
      <path
        d="M2 16 C 10 16, 14 11, 22 13 C 30 15, 36 6, 44 8 C 48 9, 52 4, 54 3"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   EXACT REFERENCE DATA MODEL
========================================================= */

const INITIAL_KPIS = [
  { id: "orders", label: "Total Orders", value: "4,286", growth: "12%", icon: CartIcon },
  { id: "sales", label: "Total Sales", value: "₹18,45,320", growth: "18%", icon: RupeeIcon },
  { id: "products", label: "Active Products", value: "12,450", growth: "15%", icon: BoxIcon },
  { id: "designers", label: "Active Designers", value: "168", growth: "8%", icon: UsersIcon },
  { id: "shipments", label: "Live Shipments", value: "842", growth: "14%", icon: TruckIcon },
];

const MAP_HUBS = [
  { id: "delhi", name: "Delhi", orders: 12, x: 135, y: 70, type: "blue", labelSide: "right" },
  { id: "mumbai", name: "Mumbai", orders: 28, x: 72, y: 175, type: "truck", labelSide: "right" },
  { id: "kolkata", name: "Kolkata", orders: 15, x: 235, y: 130, type: "orange", labelSide: "right" },
  { id: "bangalore", name: "Bangalore", orders: 32, x: 110, y: 260, type: "green", labelSide: "right" },
  { id: "chennai", name: "Chennai", orders: 21, x: 155, y: 275, type: "blue", labelSide: "right" },
];

const ORDER_FULFILLMENT_STEPS = [
  { id: "pending", label: "Pending", count: 320, color: "#EA580C", icon: "🕒" },
  { id: "processing", label: "Processing", count: 612, color: "#854D0E", icon: "⚙️" },
  { id: "shipped", label: "Shipped", count: 2684, color: "#B45309", icon: "🚚" },
  { id: "delivered", label: "Delivered", count: 2145, color: "#16A34A", icon: "✓" },
  { id: "cancelled", label: "Cancelled", count: 121, color: "#DC2626", icon: "✕" },
];

const TOP_DESIGNERS = [
  { rank: 1, name: "Ananya Rao", revenue: "₹2,48,500", percent: 100, initials: "AR", avatarBg: "#92400E" },
  { rank: 2, name: "Meera Iyer", revenue: "₹1,86,750", percent: 75, initials: "MI", avatarBg: "#B45309" },
  { rank: 3, name: "Sneha Kapoor", revenue: "₹1,52,300", percent: 61, initials: "SK", avatarBg: "#D97706" },
  { rank: 4, name: "Rahul Mehta", revenue: "₹1,38,600", percent: 56, initials: "RM", avatarBg: "#78350F" },
  { rank: 5, name: "Kavya Reddy", revenue: "₹1,28,450", percent: 52, initials: "KR", avatarBg: "#B87333" },
];

const RECENT_ACTIVITIES = [
  { id: 1, time: "10:25 AM", text: "Order ORD1001 placed by Priya Sharma", icon: "🛒", iconBg: "#DCFCE7", iconColor: "#16A34A" },
  { id: 2, time: "10:15 AM", text: "Shipment BLR123456789 dispatched", icon: "🚚", iconBg: "#FEF3C7", iconColor: "#D97706" },
  { id: 3, time: "09:50 AM", text: "Return RTN1001 approved", icon: "🔄", iconBg: "#FFEDD5", iconColor: "#EA580C" },
  { id: 4, time: "09:30 AM", text: "New designer Kavya Reddy registered", icon: "👤", iconBg: "#E0E7FF", iconColor: "#4F46E5" },
  { id: 5, time: "09:15 AM", text: "Product ZF001 stock low (5 left)", icon: "⚠️", iconBg: "#FEE2E2", iconColor: "#DC2626" },
  { id: 6, time: "08:45 AM", text: "Settlement STT1001 completed (₹2,23,650)", icon: "🏛", iconBg: "#DCFCE7", iconColor: "#15803D" },
];

const SYSTEM_SERVICES = [
  { name: "Website", status: "Operational" },
  { name: "Mobile App", status: "Operational" },
  { name: "Marketplace", status: "Operational" },
  { name: "Payment Gateway", status: "Operational" },
  { name: "SMS Service", status: "Operational" },
  { name: "Email Service", status: "Operational" },
];

const ALERTS_LIST = [
  { id: 1, text: "5 products are out of stock", type: "error", icon: "⚠️", color: "#DC2626" },
  { id: 2, text: "12 products are low in stock", type: "warning", icon: "⚠️", color: "#D97706" },
  { id: 3, text: "3 return requests pending approval", type: "info", icon: "ℹ️", color: "#2563EB" },
  { id: 4, text: "1 settlement pending payment", type: "info", icon: "ℹ️", color: "#2563EB" },
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function CommandCentre() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedHub, setSelectedHub] = useState(null);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'order' | 'product' | 'inventory' | 'settlement' | 'allDesigners' | 'allActivities' | 'allAlerts'

  // Form states for modals
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");

  // Live date string matching reference
  const [liveDate] = useState("09 Oct 2026, 10:30 AM");

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return RECENT_ACTIVITIES;
    const q = searchQuery.toLowerCase().trim();
    return RECENT_ACTIVITIES.filter((a) => a.text.toLowerCase().includes(q));
  }, [searchQuery]);

  // Quick Action Submissions
  const handleCreateOrderSubmit = (e) => {
    e.preventDefault();
    showSuccessToast(`Order created successfully for ${newOrderCustomer || "Customer"}!`, "Order Placed");
    setNewOrderCustomer("");
    setNewOrderAmount("");
    setActiveModal(null);
  };

  const handleAddProductSubmit = (e) => {
    e.preventDefault();
    showSuccessToast(`Product "${newProductName}" (${newProductSku}) added to catalogue!`, "Product Added");
    setNewProductName("");
    setNewProductSku("");
    setActiveModal(null);
  };

  return (
    <div className="ZENVE-cc-root">
      {/* =====================================================
          1. TOP INTEGRATED SEARCH & NOTIFICATION HEADER
      ===================================================== */}
      <header className="ZENVE-cc-top-bar" role="banner">
        <div className="ZENVE-cc-search-box">
          <SearchIcon />
          <input
            type="text"
            className="ZENVE-cc-search-input"
            placeholder="Search by order ID, designer, customer, product, or anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="ZENVE-cc-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        <div className="ZENVE-cc-top-actions">
          {/* Notification Bell Button with Red Dot */}
          <button
            type="button"
            className="ZENVE-cc-bell-btn"
            title="Notifications (4 pending operational alerts)"
            onClick={() => setActiveModal("allAlerts")}
          >
            <BellIcon />
            <span className="notif-alert-dot" />
          </button>

          {/* Admin User Chip */}
          <div className="ZENVE-cc-user-chip" onClick={() => showInfoToast("Signed in as Administrator", "User Profile")}>
            <div className="ZENVE-cc-user-avatar">
              <span>{user?.name?.[0] || "A"}</span>
            </div>
            <span className="ZENVE-cc-user-name">{user?.name || "Admin"}</span>
            <span className="ZENVE-cc-user-caret">⌵</span>
          </div>
        </div>
      </header>

      {/* =====================================================
          2. STUDIO HERO BANNER (Golden Silk Haute Couture)
      ===================================================== */}
      <section className="ZENVE-cc-hero-banner">
        <div className="ZENVE-cc-hero-overlay" />
        <div className="ZENVE-cc-hero-content">
          <div className="ZENVE-cc-hero-breadcrumbs">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep">&gt;</span>
            <span className="breadcrumb-active">Command Centre</span>
          </div>
          <h1 className="ZENVE-cc-hero-title">Command Centre</h1>
          <p className="ZENVE-cc-hero-subtitle">
            Monitor and manage your fashion business in real-time
          </p>
        </div>

        {/* Live Date & Time Badge */}
        <div className="ZENVE-cc-hero-date-badge">
          <span>📅</span>
          <span>{liveDate}</span>
        </div>
      </section>

      {/* =====================================================
          3. KEY EXECUTIVE KPI METRIC CARDS (5 TILES)
      ===================================================== */}
      <section className="ZENVE-cc-kpi-row" aria-label="Executive Performance Metrics">
        {INITIAL_KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="ZENVE-cc-kpi-card">
              <div className="kpi-icon-pill">
                <Icon />
              </div>
              <div className="kpi-details">
                <span className="kpi-label">{kpi.label}</span>
                <div className="kpi-value-row">
                  <strong className="kpi-number">{kpi.value}</strong>
                  <span className="kpi-delta-tag positive">↗ {kpi.growth}</span>
                </div>
              </div>
              <div className="kpi-sparkline-wrap">
                <MiniSparkline color="#E08F35" />
              </div>
            </div>
          );
        })}
      </section>

      {/* =====================================================
          4. MAIN MIDDLE GRID: 3-COLUMN OPERATIONAL HUB
      ===================================================== */}
      <div className="ZENVE-cc-middle-grid">
        {/* ---------------------------------------------------
            COLUMN 1 (LEFT): LIVE ORDER TRACKING MAP
        --------------------------------------------------- */}
        <article className="ZENVE-cc-card map-tracking-card">
          <div className="card-top-title">
            <h3>Live Order Tracking</h3>
          </div>

          <div className="map-view-container">
            {/* SVG Interactive India Geographic Map */}
            <div className="svg-map-wrapper" style={{ transform: `scale(${zoomLevel})` }}>
              <svg width="100%" height="280" viewBox="0 0 340 320" fill="none" className="india-map-svg">
                {/* Stylized Geographic Contour of Indian Peninsula */}
                <path
                  d="M 120 25 Q 160 30, 180 50 Q 220 70, 240 100 Q 260 140, 240 170 Q 210 200, 175 250 Q 140 290, 130 310 Q 120 290, 85 240 Q 60 190, 65 140 Q 75 90, 100 50 Z"
                  fill="#E2F1E8"
                  stroke="#C1DFC9"
                  strokeWidth="1.5"
                />

                {/* Regional Contour Shading */}
                <path
                  d="M 80 150 Q 120 180, 150 200 Q 180 230, 140 295 Q 110 240, 75 180 Z"
                  fill="#D4EAD9"
                  opacity="0.7"
                />

                {/* Animated Transit Routes (Curved Dashed Paths) */}
                <path
                  d="M 72 175 Q 100 130, 135 70"
                  stroke="#B45309"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  className="transit-dash-path"
                />
                <path
                  d="M 72 175 Q 90 220, 110 260"
                  stroke="#16A34A"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="transit-dash-path"
                />
                <path
                  d="M 135 70 Q 185 100, 235 130"
                  stroke="#D97706"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  className="transit-dash-path"
                />
                <path
                  d="M 235 130 Q 190 200, 155 275"
                  stroke="#2563EB"
                  strokeWidth="1.6"
                  strokeDasharray="4 4"
                  className="transit-dash-path"
                />
                <path
                  d="M 110 260 Q 132 268, 155 275"
                  stroke="#16A34A"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  className="transit-dash-path"
                />

                {/* Hub Transit Dots / Trucks Moving Along Routes */}
                <circle cx="102" cy="120" r="3.5" fill="#B45309" className="pulsing-route-dot" />
                <circle cx="185" cy="100" r="3.5" fill="#D97706" className="pulsing-route-dot" />
                <circle cx="91" cy="218" r="3.5" fill="#16A34A" className="pulsing-route-dot" />

                {/* Map Hub Location Pins */}
                {MAP_HUBS.map((hub) => (
                  <g
                    key={hub.id}
                    className="map-hub-pin-group"
                    onClick={() => {
                      setSelectedHub(hub);
                      showInfoToast(`Hub ${hub.name}: ${hub.orders} active transit orders.`, hub.name);
                    }}
                  >
                    {/* Pin Outer Ring */}
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="9"
                      fill={hub.type === "green" ? "#16A34A" : hub.type === "truck" ? "#78350F" : hub.type === "orange" ? "#D97706" : "#2563EB"}
                      opacity="0.25"
                      className="pin-pulse"
                    />

                    {/* Pin Center Circle */}
                    <circle
                      cx={hub.x}
                      cy={hub.y}
                      r="6.5"
                      fill={hub.type === "green" ? "#16A34A" : hub.type === "truck" ? "#78350F" : hub.type === "orange" ? "#D97706" : "#2563EB"}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />

                    {/* Small inner icon / dot */}
                    <circle cx={hub.x} cy={hub.y} r="2.2" fill="#FFFFFF" />

                    {/* City & Orders Label Card */}
                    <g transform={`translate(${hub.x + 9}, ${hub.y - 12})`}>
                      <rect
                        x="0"
                        y="0"
                        width="68"
                        height="26"
                        rx="4"
                        fill="#FFFFFF"
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"
                      />
                      <text x="6" y="11" fontSize="9" fontWeight="700" fill="#1F2937">
                        {hub.name}
                      </text>
                      <text x="6" y="21" fontSize="8" fontWeight="500" fill="#6B7280">
                        {hub.orders} Orders
                      </text>
                    </g>
                  </g>
                ))}
              </svg>
            </div>

            {/* Map Zoom Controls */}
            <div className="map-zoom-controls">
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
                title="Zoom Out"
              >
                -
              </button>
            </div>

            {/* Floating Top-Right Fulfillment Status Overlay */}
            <div className="map-status-overlay">
              <div className="status-item-row">
                <span className="status-dot green" />
                <span className="status-name">Delivered</span>
                <strong className="status-val">1,752</strong>
              </div>
              <div className="status-item-row">
                <span className="status-dot blue" />
                <span className="status-name">In Transit</span>
                <strong className="status-val">842</strong>
              </div>
              <div className="status-item-row">
                <span className="status-dot amber" />
                <span className="status-name">Processing</span>
                <strong className="status-val">612</strong>
              </div>
              <div className="status-item-row">
                <span className="status-dot orange" />
                <span className="status-name">Pending</span>
                <strong className="status-val">320</strong>
              </div>
              <div className="status-item-row">
                <span className="status-dot red" />
                <span className="status-name">Cancelled</span>
                <strong className="status-val">121</strong>
              </div>
            </div>
          </div>
        </article>

        {/* ---------------------------------------------------
            COLUMN 2 (CENTER): INVENTORY STATUS & DESIGNERS
        --------------------------------------------------- */}
        <div className="ZENVE-cc-column-stacked">
          {/* Inventory Status (Donut Chart) */}
          <article className="ZENVE-cc-card inventory-donut-card">
            <div className="card-top-title">
              <h3>Inventory Status</h3>
            </div>

            <div className="donut-body-split">
              {/* SVG Segmented Donut Chart */}
              <div className="donut-chart-wrap">
                <svg width="130" height="130" viewBox="0 0 120 120" className="donut-svg">
                  {/* Circle segments */}
                  {/* In Stock: 63% (Circumference = ~283) -> stroke-dasharray="178 283" */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="#16A34A"
                    strokeWidth="15"
                    strokeDasharray="178.3 282.7"
                    strokeDashoffset="0"
                  />
                  {/* Low Stock: 20% -> 56.5 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="#EAB308"
                    strokeWidth="15"
                    strokeDasharray="56.5 282.7"
                    strokeDashoffset="-178.3"
                  />
                  {/* Out of Stock: 9% -> 25.4 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="#EF4444"
                    strokeWidth="15"
                    strokeDasharray="25.4 282.7"
                    strokeDashoffset="-234.8"
                  />
                  {/* Discontinued: 8% -> 22.6 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="#9CA3AF"
                    strokeWidth="15"
                    strokeDasharray="22.6 282.7"
                    strokeDashoffset="-260.2"
                  />
                </svg>

                {/* Centered Donut Metric */}
                <div className="donut-center-metric">
                  <strong className="center-val">12,450</strong>
                  <span className="center-sub">Total Products</span>
                </div>
              </div>

              {/* Legend & Breakdown Table */}
              <div className="donut-legend-col">
                <div className="donut-legend-item">
                  <span className="donut-dot green" />
                  <span className="item-label">In Stock</span>
                  <span className="item-count">7,850</span>
                  <span className="item-pct">63%</span>
                </div>
                <div className="donut-legend-item">
                  <span className="donut-dot yellow" />
                  <span className="item-label">Low Stock</span>
                  <span className="item-count">2,480</span>
                  <span className="item-pct">20%</span>
                </div>
                <div className="donut-legend-item">
                  <span className="donut-dot red" />
                  <span className="item-label">Out of Stock</span>
                  <span className="item-count">1,120</span>
                  <span className="item-pct">9%</span>
                </div>
                <div className="donut-legend-item">
                  <span className="donut-dot grey" />
                  <span className="item-label">Discontinued</span>
                  <span className="item-count">1,000</span>
                  <span className="item-pct">8%</span>
                </div>
              </div>
            </div>
          </article>

          {/* Top Performing Designers */}
          <article className="ZENVE-cc-card top-designers-card">
            <div className="card-top-title">
              <h3>Top Performing Designers</h3>
              <button
                type="button"
                className="link-view-all"
                onClick={() => setActiveModal("allDesigners")}
              >
                View All
              </button>
            </div>

            <div className="designers-rank-list">
              {TOP_DESIGNERS.map((des) => (
                <div key={des.rank} className="designer-rank-row">
                  <span className="rank-badge">{des.rank}</span>
                  <div className="designer-avatar" style={{ backgroundColor: des.avatarBg }}>
                    {des.initials}
                  </div>
                  <span className="designer-name">{des.name}</span>

                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${des.percent}%` }} />
                  </div>

                  <strong className="designer-revenue">{des.revenue}</strong>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* ---------------------------------------------------
            COLUMN 3 (RIGHT): ORDER FULFILLMENT & ACTIVITIES
        --------------------------------------------------- */}
        <div className="ZENVE-cc-column-stacked">
          {/* Order Fulfillment Pipeline (5-Stage Stepper) */}
          <article className="ZENVE-cc-card fulfillment-card">
            <div className="card-top-title">
              <h3>Order Fulfillment</h3>
            </div>

            <div className="fulfillment-stepper-row">
              {ORDER_FULFILLMENT_STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className="stepper-node">
                    <div className={`node-icon-circle ${step.id}`}>
                      {step.id === "pending" && <span style={{ color: "#EA580C" }}>🕒</span>}
                      {step.id === "processing" && <span style={{ color: "#854D0E" }}>⚙️</span>}
                      {step.id === "shipped" && <span style={{ color: "#B45309" }}>🚚</span>}
                      {step.id === "delivered" && <span style={{ color: "#16A34A", fontWeight: "bold" }}>✓</span>}
                      {step.id === "cancelled" && <span style={{ color: "#DC2626", fontWeight: "bold" }}>✕</span>}
                    </div>
                    <span className="node-label">{step.label}</span>
                    <strong className="node-count">{step.count}</strong>
                  </div>

                  {/* Horizontal Connector Arrow Line */}
                  {idx < ORDER_FULFILLMENT_STEPS.length - 1 && (
                    <div className="stepper-line" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </article>

          {/* Recent Activities Feed */}
          <article className="ZENVE-cc-card activities-card">
            <div className="card-top-title">
              <h3>Recent Activities</h3>
              <button
                type="button"
                className="link-view-all"
                onClick={() => setActiveModal("allActivities")}
              >
                View All
              </button>
            </div>

            <div className="activities-feed-list">
              {filteredActivities.map((act) => (
                <div key={act.id} className="activity-item-row">
                  <div className="activity-icon-bubble" style={{ backgroundColor: act.iconBg, color: act.iconColor }}>
                    <span>{act.icon}</span>
                  </div>
                  <span className="activity-time">{act.time}</span>
                  <span className="activity-desc">{act.text}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      {/* =====================================================
          5. BOTTOM OPERATIONAL BAR (3 SECTIONS)
      ===================================================== */}
      <div className="ZENVE-cc-bottom-grid">
        {/* System Status Monitors */}
        <article className="ZENVE-cc-card system-status-card">
          <div className="card-top-title">
            <h3>System Status</h3>
          </div>

          <div className="system-monitors-row">
            {SYSTEM_SERVICES.map((srv) => (
              <div key={srv.name} className="service-monitor-node">
                <span className="service-dot operational" />
                <span className="service-name">{srv.name}</span>
                <span className="service-state">Operational</span>
              </div>
            ))}
          </div>
        </article>

        {/* Quick Actions (4 Action Buttons) */}
        <article className="ZENVE-cc-card quick-actions-card">
          <div className="card-top-title">
            <h3>Quick Actions</h3>
          </div>

          <div className="quick-actions-toolbar">
            <button
              type="button"
              className="quick-action-btn"
              onClick={() => setActiveModal("order")}
            >
              <span className="action-icon">🛒</span>
              <span>Create Order</span>
            </button>

            <button
              type="button"
              className="quick-action-btn"
              onClick={() => setActiveModal("product")}
            >
              <span className="action-icon">📦</span>
              <span>Add Product</span>
            </button>

            <button
              type="button"
              className="quick-action-btn"
              onClick={() => navigate("/inventory")}
            >
              <span className="action-icon">📦</span>
              <span>Manage Inventory</span>
            </button>

            <button
              type="button"
              className="quick-action-btn"
              onClick={() => navigate("/settlement")}
            >
              <span className="action-icon">📑</span>
              <span>Generate Settlement</span>
            </button>
          </div>
        </article>

        {/* Alerts & Notifications */}
        <article className="ZENVE-cc-card alerts-card">
          <div className="card-top-title">
            <h3>Alerts &amp; Notifications</h3>
            <button
              type="button"
              className="link-view-all"
              onClick={() => setActiveModal("allAlerts")}
            >
              View All
            </button>
          </div>

          <div className="alerts-preview-grid">
            {ALERTS_LIST.map((alert) => (
              <div key={alert.id} className={`alert-pill-item ${alert.type}`}>
                <span className="alert-symbol">{alert.icon}</span>
                <span className="alert-message">{alert.text}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* =====================================================
          6. INTERACTIVE MODALS
      ===================================================== */}

      {/* Modal: Create Order */}
      {activeModal === "order" && (
        <div className="ZENVE-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="ZENVE-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Create New Order</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleCreateOrderSubmit}>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  className="form-input"
                  value={newOrderCustomer}
                  onChange={(e) => setNewOrderCustomer(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Order Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  className="form-input"
                  value={newOrderAmount}
                  onChange={(e) => setNewOrderAmount(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer-row">
                <button type="button" className="ZENVE-btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="ZENVE-btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {activeModal === "product" && (
        <div className="ZENVE-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="ZENVE-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Add Product to Catalogue</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleAddProductSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Raw Silk Sherwani"
                  className="form-input"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>SKU Code</label>
                <input
                  type="text"
                  placeholder="e.g. SHW-9021"
                  className="form-input"
                  value={newProductSku}
                  onChange={(e) => setNewProductSku(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer-row">
                <button type="button" className="ZENVE-btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="ZENVE-btn-primary">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: All Alerts */}
      {activeModal === "allAlerts" && (
        <div className="ZENVE-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="ZENVE-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>System Alerts &amp; Notifications</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="alerts-full-list">
              {ALERTS_LIST.map((alert) => (
                <div key={alert.id} className={`alert-full-row ${alert.type}`}>
                  <span>{alert.icon}</span>
                  <strong>{alert.text}</strong>
                </div>
              ))}
            </div>
            <div className="modal-footer-row">
              <button type="button" className="ZENVE-btn-primary" onClick={() => setActiveModal(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: All Activities */}
      {activeModal === "allActivities" && (
        <div className="ZENVE-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="ZENVE-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Live Activity Log</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="activities-full-list">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="activity-full-row">
                  <span className="act-time">{act.time}</span>
                  <span className="act-icon">{act.icon}</span>
                  <span className="act-text">{act.text}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer-row">
              <button type="button" className="ZENVE-btn-primary" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: All Designers */}
      {activeModal === "allDesigners" && (
        <div className="ZENVE-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="ZENVE-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <h3>Designer Performance Leaderboard</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="designers-full-list">
              {TOP_DESIGNERS.map((des) => (
                <div key={des.rank} className="designer-full-row">
                  <span className="des-rank">#{des.rank}</span>
                  <strong className="des-name">{des.name}</strong>
                  <span className="des-rev">{des.revenue} GMV</span>
                </div>
              ))}
            </div>
            <div className="modal-footer-row">
              <button type="button" className="ZENVE-btn-primary" onClick={() => setActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}