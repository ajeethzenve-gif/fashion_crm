import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/DesignerPortal.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";
import {
  getDesigners,
  getDesignerPortalDashboard,
  markDesignerNotificationsRead,
  createProduct,
} from "../services/api";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   SWITCH COMPONENT
========================================================= */

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`lovable-switch ${checked ? "checked" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="lovable-switch-thumb" />
    </button>
  );
}

/* =========================================================
   HELPER FORMATTER
========================================================= */

const formatInr = (val) => {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const cleanCode = (str, len = 3) => {
  return (
    (str || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, len) || "XXX"
  );
};

/* =========================================================
   MAIN COMPONENT: DESIGNER PORTAL (02)
========================================================= */

export default function DesignerPortal() {
  // Master designer selection
  const [designers, setDesigners] = useState([]);
  const [selectedDesignerId, setSelectedDesignerId] = useState("");
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  // Portal dashboard live data from Django
  const [portalData, setPortalData] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  // Toast / feedback message
  const [alertMessage, setAlertMessage] = useState(null);

  // SKU Upload form state
  const [form, setForm] = useState({
    name: "",
    category: "",
    colour: "",
    size: "M",
    mrp: "",
    price: "",
    fabric: "",
    petSafety: "No loose beads. Breathable fabric. Supervised wear recommended.",
    location: "Mumbai FC",
    fastDelivery: true,
    returnable: true,
  });
  const [submittingSku, setSubmittingSku] = useState(false);

  /* =======================================================
     LOAD DESIGNERS LIST
  ======================================================= */
  const fetchDesigners = async () => {
    try {
      setLoadingDesigners(true);
      const data = await getDesigners();
      const list = Array.isArray(data) ? data : data.results || [];
      setDesigners(list);

      if (list.length > 0) {
        setSelectedDesignerId((prev) => {
          const exists = list.some((d) => String(d.id) === String(prev));
          return exists ? prev : String(list[0].id);
        });
      }
    } catch (err) {
      console.error("Failed to load designers:", err);
      setPortalError("Unable to fetch designers list from backend.");
    } finally {
      setLoadingDesigners(false);
    }
  };

  useEffect(() => {
    fetchDesigners();
  }, []);

  /* =======================================================
     LOAD PORTAL DASHBOARD FOR ACTIVE DESIGNER
  ======================================================= */
  const loadDashboard = async (designerId) => {
    if (!designerId) {
      setPortalData(null);
      return;
    }

    try {
      setLoadingPortal(true);
      setPortalError("");
      const data = await getDesignerPortalDashboard(designerId);
      setPortalData(data);
    } catch (err) {
      console.error("Failed to fetch portal dashboard:", err);
      setPortalError("Could not retrieve portal dashboard metrics.");
    } finally {
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (selectedDesignerId) {
      loadDashboard(selectedDesignerId);
    }
  }, [selectedDesignerId]);

  /* =======================================================
     DERIVED STATE
  ======================================================= */
  const activeDesigner = portalData?.designer || null;
  const kpis = portalData?.kpis || {};
  const pendingActions = portalData?.pendingActions || [];
  const notifications = portalData?.notifications || [];
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const skus = portalData?.skus || [];
  const orders = portalData?.orders || [];
  const settlements = portalData?.settlements || [];

  /* =======================================================
     SKU ID PREVIEW
  ======================================================= */
  const skuPreview = useMemo(() => {
    if (!activeDesigner || !form.name.trim()) return "—";
    const brandCode = cleanCode(activeDesigner.brand, 3);
    const catCode = cleanCode(form.category, 3);
    const nameCode = cleanCode(form.name, 6);
    const colCode = cleanCode(form.colour, 5);
    const sizeCode = cleanCode(form.size, 4);
    return `ZNV-${brandCode}-${catCode}-${nameCode}-${colCode}-${sizeCode}`;
  }, [activeDesigner, form]);

  /* =======================================================
     SUBMIT SKU TO QA
  ======================================================= */
  const handleSkuSubmit = async (e) => {
    e.preventDefault();

    if (!activeDesigner) {
      setAlertMessage({ type: "error", text: "Please select a designer first." });
      return;
    }

    const allowedStages = ["SIGNED", "LIVE", "ACTIVE", "CONTRACT"];
    if (!allowedStages.includes(activeDesigner.stage)) {
      setAlertMessage({
        type: "error",
        text: "Designer must reach CONTRACT stage in the CRM before uploading SKUs",
      });
      return;
    }

    if (!form.name.trim() || !form.category.trim() || !form.colour.trim()) {
      setAlertMessage({
        type: "error",
        text: "Name, category and colour are required",
      });
      return;
    }

    const numMrp = Number(form.mrp);
    const numPrice = Number(form.price);

    if (numPrice <= 0 || numPrice > numMrp) {
      setAlertMessage({
        type: "error",
        text: "Selling price must be positive and not above MRP",
      });
      return;
    }

    const payload = {
      product_name: form.name.trim(),
      sku: skuPreview,
      designer: activeDesigner.id,
      category: form.category.trim(),
      colour: form.colour.trim(),
      size: form.size,
      mrp: numMrp,
      selling_price: numPrice,
      material: form.fabric.trim(),
      pet_safety: form.petSafety.trim(),
      fulfilment_location: form.location,
      fast_delivery: form.fastDelivery,
      return_policy: form.returnable ? "RETURNABLE" : "FINAL_SALE",
      status: "PENDING_QA",
      inventory_quantity: 10,
    };

    try {
      setSubmittingSku(true);
      await createProduct(payload);
      setAlertMessage({
        type: "success",
        text: `${skuPreview} submitted — now in Catalogue QA`,
      });
      setForm((prev) => ({
        ...prev,
        name: "",
        colour: "",
        mrp: "",
        price: "",
        fabric: "",
      }));
      await loadDashboard(selectedDesignerId);
    } catch (err) {
      console.error("Failed to upload SKU:", err);
      setAlertMessage({
        type: "error",
        text: err.message || "Failed to submit SKU to QA",
      });
    } finally {
      setSubmittingSku(false);
    }
  };

  /* =======================================================
     MARK ALL NOTIFICATIONS AS READ
  ======================================================= */
  const handleMarkNotificationsRead = async () => {
    if (!selectedDesignerId) return;
    try {
      await markDesignerNotificationsRead(selectedDesignerId);
      setPortalData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: (prev.notifications || []).map((n) => ({
            ...n,
            read: true,
          })),
        };
      });
      setAlertMessage({
        type: "success",
        text: "Notifications marked as read",
      });
    } catch (err) {
      console.error("Mark notifications read error:", err);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="lovable-portal-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="lovable-portal-header">
        <div className="lovable-header-left">
          <Link to="/" className="lovable-portal-logo">
            <img src={logo} alt="Zenve Fashion" />
          </Link>

          <div className="lovable-header-title-block">
            <Link to="/" className="lovable-back-link">
              <BackIcon />
              <span>ALL 12 LAYERS</span>
            </Link>

            <h1 className="lovable-portal-title">
              <span className="lovable-layer-num">02</span>
              Designer Portal
            </h1>

            <p className="lovable-portal-subtitle">
              Supply layer · Profile, SKU upload, inventory, orders, settlement view
            </p>
          </div>
        </div>

        <div className="lovable-header-right">
          <SearchBar />

          {/* SIGNED IN AS SELECTOR */}
          <div className="lovable-signed-in-box">
            <span className="lovable-label-caps">SIGNED IN AS</span>
            <div className="lovable-select-wrap">
              <select
                value={selectedDesignerId}
                onChange={(e) => setSelectedDesignerId(e.target.value)}
                disabled={loadingDesigners || designers.length === 0}
                className="lovable-designer-select"
              >
                {designers.length === 0 ? (
                  <option value="">
                    {loadingDesigners ? "Loading designers..." : "No designers found"}
                  </option>
                ) : (
                  designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand_name || d.designer_name}
                    </option>
                  ))
                )}
              </select>
              <span className="lovable-select-chevron">
                <ArrowDownIcon />
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      {alertMessage && (
        <div className={`lovable-alert lovable-alert-${alertMessage.type}`}>
          <span>{alertMessage.text}</span>
          <button
            type="button"
            className="lovable-alert-close"
            onClick={() => setAlertMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR NOTICE */}
      {portalError && (
        <div className="lovable-alert lovable-alert-error">
          <span>{portalError}</span>
          <button
            type="button"
            className="lovable-alert-close"
            onClick={() => loadDashboard(selectedDesignerId)}
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN BODY */}
      {!activeDesigner && !loadingPortal && !loadingDesigners ? (
        <div className="lovable-empty-state-card">
          <h3>Create a designer in the Designer CRM first.</h3>
          <p>You need a registered designer brand to access the portal dashboard.</p>
          <Link to="/designer-crm" className="lovable-btn-primary">
            Open 01 Designer CRM →
          </Link>
        </div>
      ) : (
        <main className="lovable-portal-main">
          {/* ===================================================
              SECTION 1: MY DASHBOARD (10 KPI CARDS + PENDING ACTIONS)
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">My dashboard</h2>
                <p className="lovable-card-description">
                  This month at a glance, straight from the live order and settlement ledgers.
                </p>
              </div>
            </div>

            {/* 10 KPI METRIC CARDS */}
            <div className="lovable-kpi-grid">
              {/* 1. Sales this month */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Sales this month</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : formatInr(kpis.monthlyGmv)}
                </div>
                <div className="lovable-tile-hint">Delivered GMV</div>
              </div>

              {/* 2. Orders */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Orders</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : kpis.orders ?? 0}
                </div>
                <div className="lovable-tile-hint">
                  {loadingPortal ? "..." : `${kpis.units ?? 0} units sold`}
                </div>
              </div>

              {/* 3. Commission */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Commission</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : formatInr(kpis.commission)}
                </div>
                <div className="lovable-tile-hint">
                  Take rate {activeDesigner?.takeRate ?? 0}%
                </div>
              </div>

              {/* 4. Net payable */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Net payable</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : formatInr(kpis.netPayable)}
                </div>
                <div className="lovable-tile-hint">
                  {formatInr(kpis.paid)} already paid
                </div>
              </div>

              {/* 5. Conversion */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Conversion</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : `${kpis.conversion ?? 0.1}%`}
                </div>
                <div className="lovable-tile-hint">Units per 100 views</div>
              </div>

              {/* 6. Best seller */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Best seller</div>
                <div className="lovable-tile-value lovable-truncate" title={kpis.bestSeller?.name || "—"}>
                  {loadingPortal ? "—" : kpis.bestSeller?.name || "—"}
                </div>
                <div className="lovable-tile-hint">
                  {kpis.bestSeller ? `${kpis.bestSeller.units} units` : "No sales yet"}
                </div>
              </div>

              {/* 7. Returns */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Returns</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : kpis.returns ?? 0}
                </div>
                <div className="lovable-tile-hint">
                  {kpis.returnRate ?? 0}% of units
                </div>
              </div>

              {/* 8. Live SKUs */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Live SKUs</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : kpis.liveSkus ?? 0}
                </div>
                <div className="lovable-tile-hint">
                  {kpis.totalSkus ?? 0} total
                </div>
              </div>

              {/* 9. Inventory alerts */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Inventory alerts</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : kpis.inventoryAlerts ?? 0}
                </div>
                <div className="lovable-tile-hint">At or below reorder point</div>
              </div>

              {/* 10. Health score */}
              <div className="lovable-kpi-tile">
                <div className="lovable-tile-label">Health score</div>
                <div className="lovable-tile-value">
                  {loadingPortal ? "—" : `${kpis.health ?? 75}/100`}
                </div>
                <div className="lovable-tile-hint">Zenve partner score</div>
              </div>
            </div>

            {/* PENDING ACTIONS */}
            <div className="lovable-pending-actions-wrap">
              <span className="lovable-label-caps">Pending actions</span>
              {pendingActions.length === 0 ? (
                <p className="lovable-pending-empty">Nothing needs your attention.</p>
              ) : (
                <ul className="lovable-pending-list">
                  {pendingActions.map((action, idx) => (
                    <li key={idx}>• {action}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ===================================================
              SECTION 2: NOTIFICATIONS
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">Notifications</h2>
                <p className="lovable-card-description">
                  QA outcomes, orders, low stock, returns, payouts and campaigns.
                </p>
              </div>

              {unreadNotifications > 0 && (
                <button
                  type="button"
                  className="lovable-btn-outline-sm"
                  onClick={handleMarkNotificationsRead}
                >
                  Mark {unreadNotifications} as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="lovable-item-empty">No notifications yet.</div>
            ) : (
              <div className="lovable-notifications-list">
                {notifications.map((n) => (
                  <div key={n.id} className="lovable-notification-row">
                    <div className="lovable-notif-left">
                      {!n.read && <span className="lovable-unread-dot" />}
                      <span className="lovable-notif-msg">{n.message}</span>
                    </div>

                    <div className="lovable-notif-right">
                      <span className="lovable-tone-badge info">
                        {n.kind.replaceAll("_", " ")}
                      </span>
                      <span className="lovable-notif-date">
                        {new Date(n.at).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ===================================================
              SECTION 3: MY PROFILE (9-FIELD GRID)
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">My profile</h2>
                <p className="lovable-card-description">
                  Maintained by the acquisition team in the CRM.
                </p>
              </div>
            </div>

            <dl className="lovable-profile-dl">
              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Brand</dt>
                <dd>{activeDesigner?.brand || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Owner</dt>
                <dd>{activeDesigner?.name || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Contact</dt>
                <dd>{activeDesigner?.contact || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">City</dt>
                <dd>{activeDesigner?.city || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Stage</dt>
                <dd>{activeDesigner?.stage || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">KYC</dt>
                <dd>{activeDesigner?.kyc ? "Verified" : "Pending"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">GST</dt>
                <dd>{activeDesigner?.gst || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Contract ends</dt>
                <dd>{activeDesigner?.contractEnds || "—"}</dd>
              </div>

              <div className="lovable-profile-item">
                <dt className="lovable-label-caps">Take rate</dt>
                <dd>{activeDesigner?.takeRate}%</dd>
              </div>
            </dl>
          </section>

          {/* ===================================================
              SECTION 4: UPLOAD A SKU
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">Upload a SKU</h2>
                <p className="lovable-card-description">
                  SKU ID is auto-generated and the row goes straight to QA.
                </p>
              </div>
            </div>

            <form onSubmit={handleSkuSubmit} className="lovable-sku-form">
              <div className="lovable-form-grid">
                {/* 1. Product name */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Product name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ivory Silk Dog Kurta"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                {/* 2. Category */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Pet Occasion Wear"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  />
                </div>

                {/* 3. Colour */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Colour</label>
                  <input
                    type="text"
                    placeholder="e.g. Ivory Gold"
                    value={form.colour}
                    onChange={(e) => setForm({ ...form, colour: e.target.value })}
                    required
                  />
                </div>

                {/* 4. Size */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Size</label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  >
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="FREE">Free Size</option>
                  </select>
                </div>

                {/* 5. MRP */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">MRP</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 4500"
                    value={form.mrp}
                    onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                    required
                  />
                </div>

                {/* 6. Selling price */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Selling price</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3499"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>

                {/* 7. Fabric / material */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Fabric / material</label>
                  <input
                    type="text"
                    placeholder="e.g. Pure Raw Silk"
                    value={form.fabric}
                    onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  />
                </div>

                {/* 8. Pet safety information (span 2) */}
                <div className="lovable-form-group span-2">
                  <label className="lovable-label-caps">Pet safety information</label>
                  <input
                    type="text"
                    value={form.petSafety}
                    onChange={(e) => setForm({ ...form, petSafety: e.target.value })}
                  />
                </div>

                {/* 9. Stocking location */}
                <div className="lovable-form-group">
                  <label className="lovable-label-caps">Stocking location</label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  >
                    <option value="Mumbai FC">Mumbai FC</option>
                    <option value="Bangalore FC">Bangalore FC</option>
                    <option value="Designer Studio">Designer Studio</option>
                  </select>
                </div>

                {/* 10. Fast delivery toggle */}
                <div className="lovable-form-toggle-row">
                  <span className="lovable-label-caps">Fast delivery eligible</span>
                  <Switch
                    checked={form.fastDelivery}
                    onChange={(val) => setForm({ ...form, fastDelivery: val })}
                  />
                </div>

                {/* 11. Returnable toggle */}
                <div className="lovable-form-toggle-row">
                  <span className="lovable-label-caps">Returnable</span>
                  <Switch
                    checked={form.returnable}
                    onChange={(val) => setForm({ ...form, returnable: val })}
                  />
                </div>
              </div>

              {/* SKU ID PREVIEW */}
              <div className="lovable-sku-preview-row">
                <span className="lovable-preview-text">SKU ID preview:</span>
                <span className="lovable-sku-mono">{skuPreview}</span>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="lovable-form-actions">
                <button
                  type="submit"
                  className="lovable-btn-primary"
                  disabled={submittingSku || !activeDesigner}
                >
                  {submittingSku ? "Submitting..." : "Submit to QA"}
                </button>
              </div>
            </form>
          </section>

          {/* ===================================================
              SECTION 5: MY SKUS & STOCK (LIVE BACKEND DATA)
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">My SKUs &amp; stock</h2>
                <p className="lovable-card-description">
                  Live availability the storefront can sell, with cover in days.
                </p>
              </div>
            </div>

            {skus.length === 0 ? (
              <div className="lovable-item-empty">No SKUs uploaded yet.</div>
            ) : (
              <div className="lovable-table-responsive">
                <table className="lovable-table">
                  <thead>
                    <tr>
                      <th className="lovable-label-caps">SKU</th>
                      <th className="lovable-label-caps">Price</th>
                      <th className="lovable-label-caps">QA</th>
                      <th className="lovable-label-caps">Available</th>
                      <th className="lovable-label-caps">Reserved</th>
                      <th className="lovable-label-caps">Sold</th>
                      <th className="lovable-label-caps">Days of cover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus.map((skuItem) => {
                      const qaStatus = skuItem.status || "PENDING_QA";
                      const qaClass = qaStatus.toLowerCase();
                      return (
                        <tr key={skuItem.id}>
                          <td>
                            <div className="lovable-sku-name">{skuItem.product_name}</div>
                            <div className="lovable-sku-id-mono">{skuItem.sku}</div>
                          </td>
                          <td>{formatInr(skuItem.selling_price)}</td>
                          <td>
                            <span className={`lovable-qa-badge tone-${qaClass}`}>
                              {qaStatus}
                            </span>
                          </td>
                          <td>{skuItem.inventory_quantity ?? 0}</td>
                          <td>{skuItem.reserved_quantity ?? 0}</td>
                          <td>{skuItem.units_sold ?? 0}</td>
                          <td>
                            {skuItem.days_of_stock ? `${skuItem.days_of_stock} d` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ===================================================
              SECTION 6: MY ORDERS & SETTLEMENTS
          =================================================== */}
          <section className="lovable-portal-card">
            <div className="lovable-card-header">
              <div>
                <h2 className="lovable-card-title">My orders &amp; settlements</h2>
              </div>
            </div>

            {/* ORDERS */}
            <div className="lovable-orders-block">
              {orders.length === 0 ? (
                <div className="lovable-item-empty">
                  No orders yet — sell something from the Storefront layer.
                </div>
              ) : (
                <div className="lovable-orders-list">
                  {orders.map((ord) => (
                    <div key={ord.id} className="lovable-order-row">
                      <span className="lovable-order-id">{ord.id}</span>
                      <span className="lovable-order-customer">{ord.customer}</span>
                      <span className="lovable-order-amt">{formatInr(ord.amount)}</span>
                      <span className={`lovable-order-badge tone-${ord.status.toLowerCase()}`}>
                        {ord.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SETTLEMENTS */}
            {settlements.length > 0 && (
              <div className="lovable-settlements-block">
                <div className="lovable-settlements-list">
                  {settlements.map((stl) => (
                    <div key={stl.id} className="lovable-settlement-row">
                      <span className="lovable-stl-id">{stl.id}</span>
                      <span className="lovable-stl-breakdown">
                        GMV {formatInr(stl.gmv)} − commission {formatInr(stl.commission)}
                      </span>
                      <span className="lovable-stl-net">{formatInr(stl.net)}</span>
                      <span className={`lovable-order-badge tone-${stl.status.toLowerCase()}`}>
                        {stl.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}