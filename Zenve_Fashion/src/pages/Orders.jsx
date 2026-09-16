import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Orders.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";
import { getOrders, transitionOrder, cancelOrder } from "../services/api";

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

/* =========================================================
   CONSTANTS & LIFECYCLE
========================================================= */

/* =========================================================
   CONSTANTS & LIFECYCLE
========================================================= */

const ORDER_LIFECYCLE = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

function getStatusTone(status) {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "DELIVERED", "PASSED", "PAID", "RECONCILED", "ACTIVE", "LIVE"].includes(s)) {
    return "good";
  }
  if (["REJECTED", "CANCELLED", "FAILED", "REVERSED"].includes(s)) {
    return "bad";
  }
  if (["PENDING_QA", "CORRECTION", "PENDING", "REQUESTED", "RECEIVED", "PROCESSING", "CONFIRMED", "PLACED", "PACKED"].includes(s)) {
    return "warn";
  }
  return "info";
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   OMS / ORDERS COMPONENT (07)
========================================================= */

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Toast notification banner
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE ORDERS FROM BACKEND
  ------------------------------------------------------- */
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrders();
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED ORDERS
  ------------------------------------------------------- */
  const normalizedOrders = useMemo(() => {
    return orders.map((o) => {
      const id = o.order_number || (o.id ? `ZO-${o.id}` : "ZO-0000");
      const status = o.order_status || o.status || "Pending";
      const amount = Number(o.total ?? o.total_amount ?? o.amount ?? 0);
      const subtotal = Number(o.subtotal ?? amount);
      const discount = Number(o.discount ?? 0);
      const shipping = Number(o.shipping ?? 0);
      const customer = o.shipping_full_name || o.customer_name || o.customer || "Guest Customer";
      const phone = o.shipping_phone || o.customer_phone || "";
      const email = o.shipping_email || o.customer_email || "";
      const address = o.delivery_address || [
        o.shipping_address_line1,
        o.shipping_address_line2,
        o.shipping_city,
        o.shipping_state,
        o.shipping_postal_code,
      ].filter(Boolean).join(", ");
      const pincode = o.shipping_postal_code || o.delivery_pincode || o.pincode || "400001";
      const paymentMethod = o.payment_method || "COD";
      const paymentStatus = o.payment_status || "Pending";
      const placedAt = o.created_at || o.placedAt || new Date().toISOString();
      const fast = Boolean(o.is_fast_delivery ?? o.fast ?? (o.estimated_delivery && o.estimated_delivery.includes("60")));
      const eta = o.estimated_delivery || o.eta || (fast ? "Express (60 mins)" : "3-5 Business Days");

      // Lines
      const rawLines = o.lines || o.items || [];
      const lines = rawLines.map((l) => ({
        id: l.id,
        skuId: l.sku || l.skuId || `SKU-${l.id}`,
        name: l.product_name || l.name || "Product",
        qty: Number(l.quantity ?? l.qty ?? 1),
        price: Number(l.price ?? l.unit_price ?? 0),
        total: Number(l.total ?? (Number(l.price ?? l.unit_price ?? 0) * Number(l.quantity ?? l.qty ?? 1))),
        size: l.size || "",
        color: l.color || l.colour || "",
        brand: l.brand || l.brand_name || "",
        image: l.image || l.product_image || "",
      }));

      // Timeline
      let timeline = o.timeline;
      if (!timeline || !timeline.length) {
        const currIdx = ORDER_LIFECYCLE.indexOf(status);
        if (["Cancelled", "CANCELLED"].includes(status)) {
          timeline = [
            { status: "Pending", at: placedAt },
            { status: "Cancelled", at: o.updated_at || placedAt },
          ];
        } else if (currIdx >= 0) {
          timeline = ORDER_LIFECYCLE.slice(0, currIdx + 1).map((s, idx) => ({
            status: s,
            at: idx === 0 ? placedAt : o.updated_at || placedAt,
          }));
        } else {
          timeline = [{ status, at: placedAt }];
        }
      }

      return {
        ...o,
        rawId: o.id,
        id,
        status,
        amount,
        subtotal,
        discount,
        shipping,
        customer,
        phone,
        email,
        address,
        pincode,
        paymentMethod,
        paymentStatus,
        placedAt,
        fast,
        eta,
        lines,
        timeline,
      };
    });
  }, [orders]);

  /* -------------------------------------------------------
     TOP 4 KPI TOTALS
  ------------------------------------------------------- */
  const openCount = useMemo(() => {
    return normalizedOrders.filter(
      (o) => !["DELIVERED", "Delivered", "CANCELLED", "Cancelled", "RETURNED", "Returned"].includes(o.status)
    ).length;
  }, [normalizedOrders]);

  const deliveredCount = useMemo(() => {
    return normalizedOrders.filter((o) => ["DELIVERED", "Delivered"].includes(o.status)).length;
  }, [normalizedOrders]);

  const totalGmv = useMemo(() => {
    return normalizedOrders
      .filter((o) => !["CANCELLED", "Cancelled"].includes(o.status))
      .reduce((acc, o) => acc + o.amount, 0);
  }, [normalizedOrders]);

  /* -------------------------------------------------------
     FILTERED ORDERS
  ------------------------------------------------------- */
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOrders;
    const q = searchQuery.toLowerCase();
    return normalizedOrders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        o.pincode.toLowerCase().includes(q) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q)) ||
        o.lines.some(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.skuId.toLowerCase().includes(q)
        )
    );
  }, [normalizedOrders, searchQuery]);

  /* -------------------------------------------------------
     ACTION HANDLERS (ADVANCE & CANCEL)
  ------------------------------------------------------- */
  const handleAdvance = async (order) => {
    const statusMap = {
      "PLACED": "Pending",
      "CONFIRMED": "Confirmed",
      "PACKED": "Processing",
      "PROCESSING": "Processing",
      "SHIPPED": "Shipped",
      "OUT_FOR_DELIVERY": "Out for Delivery",
      "DELIVERED": "Delivered",
      "CANCELLED": "Cancelled",
    };
    const currentNorm = statusMap[order.status.toUpperCase()] || order.status;
    const currIdx = ORDER_LIFECYCLE.indexOf(currentNorm);
    const nextStep = currIdx >= 0 && currIdx < ORDER_LIFECYCLE.length - 1 ? ORDER_LIFECYCLE[currIdx + 1] : null;

    if (!nextStep) return;

    try {
      setProcessingId(order.rawId);
      await transitionOrder(order.rawId, nextStep);
      setAlert({
        type: "success",
        text: `Order ${order.id} transitioned to ${nextStep}`,
      });
      await loadOrders();
    } catch (err) {
      console.error("Advance order failed:", err);
      setAlert({ type: "error", text: `Failed to advance order: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (order) => {
    if (["CANCELLED", "Cancelled", "DELIVERED", "Delivered", "SHIPPED", "Shipped", "OUT_FOR_DELIVERY", "Out for Delivery"].includes(order.status)) {
      setAlert({ type: "error", text: "Cancellation window closed — order is already in transit or delivered" });
      return;
    }

    try {
      setProcessingId(order.rawId);
      await cancelOrder(order.rawId);
      setAlert({
        type: "success",
        text: `${order.id} cancelled, inventory released`,
      });
      await loadOrders();
    } catch (err) {
      console.error("Cancel order failed:", err);
      setAlert({ type: "error", text: `Failed to cancel order: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="lovable-orders-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="lovable-orders-header">
        <div className="lovable-header-left">
          <Link to="/" className="lovable-portal-logo" aria-label="Go to home">
            <img src={zenveLogo} alt="Zenve Fashion" />
          </Link>

          <div className="lovable-header-title-block">
            <Link to="/" className="lovable-back-link">
              <BackIcon />
              <span>ALL 12 LAYERS</span>
            </Link>

            <h1 className="lovable-portal-title">
              <span className="lovable-layer-num">07</span>
              <span>OMS</span>
            </h1>

            <p className="lovable-portal-desc">
              Orders layer · Order lifecycle, split orders, cancellation
            </p>
          </div>
        </div>

        <div className="lovable-header-right">
          <SearchBar />
        </div>
      </header>

      {/* =====================================================
          MAIN BODY
      ===================================================== */}
      <main className="lovable-orders-main">
        {/* TOAST / ALERT BANNER */}
        {alert && (
          <div className={`lovable-orders-alert ${alert.type}`}>
            <span>{alert.text}</span>
            <button
              type="button"
              className="lovable-alert-close"
              onClick={() => setAlert(null)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 4 SUMMARY KPI CARDS
        =================================================== */}
        <section className="lovable-orders-kpi-grid">
          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Orders</span>
            <strong className="lovable-kpi-value">{normalizedOrders.length}</strong>
          </div>

          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Open</span>
            <strong className="lovable-kpi-value">{openCount}</strong>
            <span className="lovable-kpi-hint">Not delivered or cancelled</span>
          </div>

          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Delivered</span>
            <strong className="lovable-kpi-value">{deliveredCount}</strong>
          </div>

          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">GMV</span>
            <strong className="lovable-kpi-value">{formatInr(totalGmv)}</strong>
            <span className="lovable-kpi-hint">Excludes cancellations</span>
          </div>
        </section>

        {/* ===================================================
            ORDER LIFECYCLE SECTION
        =================================================== */}
        <section className="lovable-panel-card">
          <div className="lovable-panel-header">
            <div className="lovable-panel-title-block">
              <h2 className="lovable-panel-title">Order lifecycle</h2>
              <p className="lovable-panel-desc">
                PLACED → CONFIRMED → PACKED → SHIPPED → OUT FOR DELIVERY → DELIVERED. Cancellation is only allowed before dispatch.
              </p>
            </div>

            <input
              type="text"
              placeholder="Filter orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lovable-order-search-box"
            />
          </div>

          {loading ? (
            <div className="lovable-empty-state">
              <strong>Loading orders ledger...</strong>
              <p>Connecting to live Zenve Fashion database...</p>
            </div>
          ) : error ? (
            <div className="lovable-empty-state">
              <strong style={{ color: "#9f1239" }}>{error}</strong>
              <p>
                <button
                  type="button"
                  className="lovable-btn lovable-btn-outline"
                  style={{ marginTop: "12px" }}
                  onClick={loadOrders}
                >
                  Retry Connection
                </button>
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="lovable-empty-state">
              No orders yet — place one from the Storefront layer.
            </div>
          ) : (
            <div className="lovable-orders-stack">
              {filteredOrders.map((n) => {
                const statusMap = {
                  "PLACED": "Pending",
                  "CONFIRMED": "Confirmed",
                  "PACKED": "Processing",
                  "PROCESSING": "Processing",
                  "SHIPPED": "Shipped",
                  "OUT_FOR_DELIVERY": "Out for Delivery",
                  "DELIVERED": "Delivered",
                  "CANCELLED": "Cancelled",
                };
                const currentNorm = statusMap[n.status.toUpperCase()] || n.status;
                const currIdx = ORDER_LIFECYCLE.indexOf(currentNorm);
                const nextStep = currIdx >= 0 && currIdx < ORDER_LIFECYCLE.length - 1
                  ? ORDER_LIFECYCLE[currIdx + 1]
                  : null;

                const isCancelDisabled = [
                  "CANCELLED",
                  "Cancelled",
                  "DELIVERED",
                  "Delivered",
                  "SHIPPED",
                  "Shipped",
                  "OUT_FOR_DELIVERY",
                  "Out for Delivery",
                ].includes(n.status);

                const isProcessing = processingId === n.rawId;

                return (
                  <div key={n.rawId || n.id} className="lovable-order-card">
                    {/* HEADER ROW */}
                    <div className="lovable-order-top-row">
                      <div className="lovable-order-id-group">
                        <h3 className="lovable-order-id-title">{n.id}</h3>
                        <span className="lovable-order-date">
                          {new Date(n.placedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="lovable-order-badges-group">
                        <span className={`lovable-tone-badge ${getStatusTone(n.status)}`}>
                          {n.status.replace(/_/g, " ")}
                        </span>
                        <span className={`lovable-tone-badge ${n.paymentStatus === "Paid" ? "good" : "warn"}`}>
                          Payment: {n.paymentStatus} ({n.paymentMethod})
                        </span>
                        <span className={`lovable-tone-badge ${n.fast ? "good" : "neutral"}`}>
                          {n.eta}
                        </span>
                      </div>
                    </div>

                    {/* CUSTOMER & SHIPPING DETAILS SECTION */}
                    <div className="lovable-order-customer-box">
                      <div className="lovable-customer-grid">
                        <div className="lovable-customer-col">
                          <span className="lovable-detail-label">Customer Details</span>
                          <strong className="lovable-customer-name">{n.customer}</strong>
                          {n.phone && <span className="lovable-customer-contact">📞 {n.phone}</span>}
                          {n.email && <span className="lovable-customer-contact">✉️ {n.email}</span>}
                        </div>

                        <div className="lovable-customer-col">
                          <span className="lovable-detail-label">Shipping Destination</span>
                          <span className="lovable-customer-address">{n.address || "Standard Address"}</span>
                          <span className="lovable-customer-pincode">PIN Code: <strong>{n.pincode}</strong></span>
                        </div>

                        <div className="lovable-customer-col lovable-payment-col">
                          <span className="lovable-detail-label">Order Financials</span>
                          <div className="lovable-financial-rows">
                            <span className="lovable-subtotal-line">Subtotal: {formatInr(n.subtotal)}</span>
                            {n.discount > 0 && <span className="lovable-discount-line">Discount: -{formatInr(n.discount)}</span>}
                            {n.shipping > 0 ? (
                              <span className="lovable-shipping-line">Shipping: {formatInr(n.shipping)}</span>
                            ) : (
                              <span className="lovable-shipping-free">Shipping: Free</span>
                            )}
                            <strong className="lovable-grand-total">Total: {formatInr(n.amount)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ORDER ITEMS LIST */}
                    <div className="lovable-order-items-wrapper">
                      <span className="lovable-detail-label">Order Items ({n.lines.length})</span>
                      <ul className="lovable-order-lines-list">
                        {n.lines.map((t, idx) => (
                          <li key={idx} className="lovable-order-line-item">
                            <div className="lovable-line-item-left">
                              {t.image ? (
                                <img src={t.image} alt={t.name} className="lovable-line-item-thumb" />
                              ) : (
                                <div className="lovable-line-item-thumb-placeholder">👗</div>
                              )}
                              <div className="lovable-line-item-info">
                                <span className="lovable-line-name">{t.name}</span>
                                <div className="lovable-line-item-meta">
                                  <span className="lovable-line-sku">{t.skuId}</span>
                                  {t.brand && <span className="lovable-line-brand">{t.brand}</span>}
                                  {t.size && <span className="lovable-line-tag">Size: {t.size}</span>}
                                  {t.color && <span className="lovable-line-tag">Color: {t.color}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="lovable-line-item-right">
                              <span className="lovable-line-qty-price">
                                {t.qty} × {formatInr(t.price)}
                              </span>
                              <strong className="lovable-line-price">
                                {formatInr(t.total || t.price * t.qty)}
                              </strong>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* TIMELINE BADGES */}
                    <div className="lovable-timeline-row">
                      {n.timeline.map((step, idx) => (
                        <span
                          key={idx}
                          className={`lovable-tone-badge ${getStatusTone(step.status)}`}
                        >
                          {step.status.replace(/_/g, " ")} ·{" "}
                          {new Date(step.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ))}
                    </div>

                    {/* ACTIONS ROW */}
                    <div className="lovable-order-actions-row">
                      <button
                        type="button"
                        className="lovable-btn lovable-btn-primary"
                        disabled={!nextStep || isProcessing}
                        onClick={() => handleAdvance(n)}
                      >
                        {isProcessing
                          ? "Updating..."
                          : nextStep
                          ? `Mark ${nextStep.replace(/_/g, " ")}`
                          : "Completed"}
                      </button>

                      <button
                        type="button"
                        className="lovable-btn lovable-btn-outline"
                        disabled={isCancelDisabled || isProcessing}
                        onClick={() => handleCancel(n)}
                      >
                        Cancel order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}