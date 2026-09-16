import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Delivery.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";
import { getProducts, updateProduct } from "../services/api";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19 12H5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 7L5 12L10 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   HELPERS & LOGISTICS ENGINE LOGIC
   Direct match to https://zenvefashioncm.lovable.app/delivery
========================================================= */

function formatLocation(loc) {
  if (!loc) return "Mumbai FC";
  const s = String(loc).trim();
  const lower = s.toLowerCase();
  if (lower.includes("mumbai")) return "Mumbai FC";
  if (lower.includes("bangalore")) return "Bangalore FC";
  if (lower.includes("delhi")) return "Delhi FC";
  if (lower.includes("designer")) return "Designer studio";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeDeliveryPromise(pincode, sku, available) {
  const p = (pincode || "").trim();
  if (!/^\d{6}$/.test(p)) {
    return {
      serviceable: false,
      fast: false,
      eta: "Enter a valid 6-digit pincode",
    };
  }
  if (!sku || available < 1) {
    return {
      serviceable: true,
      fast: false,
      eta: "Out of stock — not sellable",
    };
  }

  const loc = formatLocation(sku.location || sku.fulfilment_location);
  const isLocalHub =
    (p.startsWith("400") && loc === "Mumbai FC") ||
    (p.startsWith("560") && loc === "Bangalore FC");
  const isFast = Boolean(sku.fastDelivery ?? sku.fast_delivery);

  if (isFast && isLocalHub) {
    return {
      serviceable: true,
      fast: true,
      eta: "60 minutes",
    };
  }

  return {
    serviceable: true,
    fast: false,
    eta: "≤ 3 working days",
  };
}

/* =========================================================
   DELIVERY ENGINE COMPONENT (08)
========================================================= */

export default function DeliveryEngine() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pincode, setPincode] = useState("400001");
  const [updatingId, setUpdatingId] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE PRODUCTS FROM DJANGO BACKEND
  ------------------------------------------------------- */
  const loadDeliveryProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products for delivery engine:", err);
      setError("Failed to connect to backend server. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveryProducts();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED LIVE SKUS
     Only live / approved products are quoted
  ------------------------------------------------------- */
  const liveSkus = useMemo(() => {
    return products
      .filter((p) => {
        // Support all live/active statuses
        return (
          p.is_live === true ||
          p.live === true ||
          p.status === "LIVE" ||
          p.status === "APPROVED" ||
          p.status === "ACTIVE"
        );
      })
      .map((p) => {
        const available =
          p.available_quantity !== undefined && p.available_quantity !== null
            ? Number(p.available_quantity)
            : p.inventory_quantity !== undefined && p.inventory_quantity !== null
            ? Number(p.inventory_quantity)
            : 0;

        return {
          id: p.id,
          sku: p.sku || `SKU-${p.id}`,
          name: p.product_name || p.name || "Untitled Product",
          location: formatLocation(p.fulfilment_location || p.location),
          rawLocation: p.fulfilment_location || p.location,
          available,
          fastDelivery: Boolean(p.fast_delivery ?? p.fastDelivery),
        };
      });
  }, [products]);

  /* -------------------------------------------------------
     TOGGLE FAST DELIVERY FLAG VIA BACKEND PATCH
  ------------------------------------------------------- */
  const handleToggleFast = async (item) => {
    const nextVal = !item.fastDelivery;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, fast_delivery: nextVal, fastDelivery: nextVal }
          : p
      )
    );

    try {
      setUpdatingId(item.id);
      await updateProduct(item.id, { fast_delivery: nextVal });
      setAlert({
        type: "success",
        text: `Fast delivery ${nextVal ? "enabled" : "disabled"} for ${item.name}.`,
      });
    } catch (err) {
      console.error("Failed to update fast flag:", err);
      // Revert optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? { ...p, fast_delivery: !nextVal, fastDelivery: !nextVal }
            : p
        )
      );
      setAlert({
        type: "error",
        text: `Failed to update delivery flag: ${err.message}`,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  /* -------------------------------------------------------
     PINCODE & KPI STATS
  ------------------------------------------------------- */
  const trimmedPincode = pincode.trim();
  const isValidPincode = /^\d{6}$/.test(trimmedPincode);
  const isFastCity = /^(400|560)/.test(trimmedPincode);

  const fastEligibleSkus = useMemo(() => {
    return liveSkus.filter((sku) => {
      const promise = computeDeliveryPromise(pincode, sku, sku.available);
      return promise.fast === true;
    });
  }, [liveSkus, pincode]);

  const riskSkus = useMemo(() => {
    return liveSkus.filter((sku) => sku.fastDelivery && sku.available === 0);
  }, [liveSkus]);

  return (
    <div className="lovable-delivery-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="lovable-delivery-header">
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
              <span className="lovable-layer-num">08</span>
              <span>Delivery Engine</span>
            </h1>

            <p className="lovable-portal-desc">
              Logistics layer · Pincode, ETA, 60-min eligibility, 3-day target
            </p>
          </div>
        </div>

        <div className="lovable-header-right">
          <SearchBar />
        </div>
      </header>

      {/* =====================================================
          MAIN CONTENT AREA
      ===================================================== */}
      <main className="lovable-delivery-main">
        {/* ALERT NOTIFICATION BANNER */}
        {alert && (
          <div className={`lovable-delivery-alert ${alert.type}`}>
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

        {/* ERROR BANNER */}
        {error && (
          <div className="lovable-delivery-alert error">
            <span>{error}</span>
            <button
              type="button"
              className="lovable-alert-close"
              onClick={loadDeliveryProducts}
              aria-label="Retry loading products"
            >
              Retry
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 3 KPI METRIC CARDS
        =================================================== */}
        <section className="lovable-delivery-kpi-grid">
          {/* ZONE */}
          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Zone</span>
            <strong className="lovable-kpi-value">
              {isValidPincode ? (isFastCity ? "Fast city" : "Rest of India") : "—"}
            </strong>
            <span className="lovable-kpi-hint">
              {isFastCity ? "Mumbai / Bangalore" : "≤ 3 working days"}
            </span>
          </div>

          {/* FAST-ELIGIBLE SKUS */}
          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Fast-eligible SKUs</span>
            <strong className="lovable-kpi-value">
              {fastEligibleSkus.length}
            </strong>
            <span className="lovable-kpi-hint">
              For this pincode, right now
            </span>
          </div>

          {/* FAST FLAG AT RISK */}
          <div className="lovable-kpi-card">
            <span className="lovable-kpi-label">Fast flag at risk</span>
            <strong className="lovable-kpi-value">
              {riskSkus.length}
            </strong>
            <span className="lovable-kpi-hint">
              Flagged but no stock
            </span>
          </div>
        </section>

        {/* ===================================================
            SERVICEABILITY CHECK PANEL
        =================================================== */}
        <section className="lovable-panel-card">
          <div className="lovable-panel-header">
            <div className="lovable-panel-title-block">
              <h2 className="lovable-panel-title">Serviceability check</h2>
              <p className="lovable-panel-desc">
                Rule chain: pincode → serviceable → nearest eligible location → SKU available → fast flag → live ETA.
              </p>
            </div>

            {/* PINCODE INPUT ACTION */}
            <div className="lovable-pincode-control">
              <label htmlFor="customer-pincode" className="lovable-pincode-label">
                Customer pincode
              </label>
              <input
                id="customer-pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="lovable-pincode-input"
                placeholder="400001"
                value={pincode}
                onChange={(e) =>
                  setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </div>
          </div>

          {/* SKUS TABLE */}
          {loading ? (
            <div className="lovable-empty-state">
              Loading live SKUs from logistics engine...
            </div>
          ) : liveSkus.length === 0 ? (
            <div className="lovable-empty-state">
              No live SKUs to quote yet.
            </div>
          ) : (
            <div className="lovable-table-wrap">
              <table className="lovable-delivery-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Stocking location</th>
                    <th>Available</th>
                    <th>Fast flag</th>
                    <th>Promise</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSkus.map((item) => {
                    const promise = computeDeliveryPromise(
                      pincode,
                      item,
                      item.available
                    );
                    const tone = promise.fast
                      ? "good"
                      : promise.serviceable
                      ? "info"
                      : "bad";

                    return (
                      <tr key={item.id || item.sku}>
                        <td>
                          <div className="sku-cell">
                            <p className="sku-cell-name">{item.name}</p>
                            <p className="sku-cell-id">{item.sku}</p>
                          </div>
                        </td>
                        <td>{item.location}</td>
                        <td>{item.available}</td>
                        <td>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.fastDelivery}
                            className={`lovable-switch-btn ${
                              item.fastDelivery ? "checked" : ""
                            }`}
                            disabled={updatingId === item.id}
                            onClick={() => handleToggleFast(item)}
                            aria-label={`Toggle fast delivery for ${item.name}`}
                          >
                            <span className="lovable-switch-thumb" />
                          </button>
                        </td>
                        <td>
                          <span className={`lovable-tone-badge ${tone}`}>
                            {promise.eta}
                          </span>
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
            PROMISE POLICY PANEL
        =================================================== */}
        <section className="lovable-panel-card">
          <div className="lovable-panel-title-block">
            <h2 className="lovable-panel-title">Promise policy</h2>
            <p className="lovable-panel-desc">
              What the business is allowed to show a customer.
            </p>
          </div>

          <ul className="lovable-policy-grid">
            <li className="lovable-policy-item">
              <span className="lovable-policy-bullet" aria-hidden="true">•</span>
              <span>
                60 minutes applies only to fast-flagged stock inside Mumbai (400xxx) and Bangalore (560xxx).
              </span>
            </li>
            <li className="lovable-policy-item">
              <span className="lovable-policy-bullet" aria-hidden="true">•</span>
              <span>
                Every other serviceable pincode shows a ≤ 3 working-day target.
              </span>
            </li>
            <li className="lovable-policy-item">
              <span className="lovable-policy-bullet" aria-hidden="true">•</span>
              <span>
                Zero available units removes the fast promise automatically.
              </span>
            </li>
            <li className="lovable-policy-item">
              <span className="lovable-policy-bullet" aria-hidden="true">•</span>
              <span>
                Designer-studio stock never carries the 60-minute promise.
              </span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}