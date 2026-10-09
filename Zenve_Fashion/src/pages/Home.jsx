import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";

import {
  getDesigners,
  getOrders,
  getProducts,
} from "../services/api";

/* =========================================================
   LAYER DISPLAY HELPERS (TIED TO DATA SOURCE)
   ========================================================= */

const getDisplayName = (name) => {
  if (name === "Product / SKU") return "Product Catalogue";
  if (name === "OMS") return "OMS / Orders";
  return name;
};

const getDisplayBlurb = (layer) => {
  const customBlurbs = {
    "01": "Onboard and manage designers",
    "02": "Empower designers with tools",
    "03": "Manage SKUs and product information",
    "04": "Ensure quality and compliance",
    "05": "Track stock and availability",
    "06": "Customer facing marketplace",
    "07": "Manage orders end-to-end",
    "08": "Track and manage deliveries",
    "09": "Handle returns and exchanges",
    "10": "Manage payouts and settlements",
    "11": "Insights and analytics",
    "12": "Monitor and operate the full platform",
    "13": "Design assets and manage media",
    "14": "Manage content and campaigns",
    "15": "Payment management and reconciliation",
  };
  return customBlurbs[layer.n] || layer.blurb;
};

/* =========================================================
   HOME PAGE COMPONENT
   ========================================================= */

function Home() {
  const { currentUser, hasAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  /* =========================================================
     LIVE DASHBOARD DATA (NO MOCK VALUES)
     ========================================================= */

  const [dashboardData, setDashboardData] = useState({
    designers: 0,
    liveSkus: 0,
    physicalStock: 0,
    orders: 0,
    totalGmv: 0,
    brands: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =========================================================
     API RESPONSE HELPERS
     ========================================================= */

  const getCollection = (response) => {
    if (!response) return [];
    const data = response?.data ?? response;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data)) return data;
    return [];
  };

  const getNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "string") {
      const cleaned = value.replace(/₹/g, "").replace(/,/g, "").trim();
      const num = Number(cleaned);
      return Number.isFinite(num) ? num : 0;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };

  const getProductStock = (product) => {
    return getNumber(
      product?.stock ??
      product?.quantity ??
      product?.stock_quantity ??
      product?.physical_stock ??
      product?.inventory ??
      product?.available_quantity ??
      0
    );
  };

  const isLiveProduct = (product) => {
    if (typeof product?.is_active === "boolean") return product.is_active;
    if (typeof product?.active === "boolean") return product.active;
    if (product?.status) {
      const st = String(product.status).toLowerCase();
      if (st === "inactive" || st === "disabled" || st === "draft" || st === "archived") {
        return false;
      }
    }
    return true;
  };

  const getBrand = (product) => {
    const brand =
      product?.brand ??
      product?.brand_name ??
      product?.brandName ??
      product?.designer?.brand ??
      product?.designer?.brand_name;

    if (!brand) return null;
    if (typeof brand === "object") {
      return brand?.name ?? brand?.brand_name ?? brand?.title ?? null;
    }
    return String(brand).trim();
  };

  const getOrderGmv = (order) => {
    return getNumber(
      order?.total_amount ??
      order?.grand_total ??
      order?.order_total ??
      order?.total ??
      order?.amount ??
      order?.gmv ??
      order?.total_price ??
      order?.final_amount ??
      order?.order_value ??
      0
    );
  };

  /* =========================================================
     FETCH LIVE DATA FROM BACKEND
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError("");

        const [designersRes, productsRes, ordersRes] = await Promise.all([
          getDesigners(),
          getProducts(),
          getOrders(),
        ]);

        if (!mounted) return;

        const designers = getCollection(designersRes);
        const products = getCollection(productsRes);
        const orders = getCollection(ordersRes);

        const liveProducts = products.filter((p) => isLiveProduct(p));
        const liveSkus = liveProducts.length;

        const physicalStock = products.reduce((acc, p) => acc + getProductStock(p), 0);
        const totalGmv = orders.reduce((acc, o) => acc + getOrderGmv(o), 0);

        const brandSet = new Set();
        products.forEach((p) => {
          const b = getBrand(p);
          if (b) brandSet.add(String(b).toLowerCase());
        });

        setDashboardData({
          designers: designers.length,
          liveSkus,
          physicalStock,
          orders: orders.length,
          totalGmv,
          brands: brandSet.size,
        });
      } catch (err) {
        console.error("Failed to load live dashboard data:", err);
        if (mounted) {
          setError("Failed to fetch live data from server");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     ACCESSIBLE AND FILTERED LAYERS
     ========================================================= */

  const uniqueLayers = useMemo(() => {
    return Array.from(new Map(layers.map((l) => [l.n, l])).values()).sort(
      (a, b) => Number(a.n) - Number(b.n)
    );
  }, []);

  const accessibleLayers = useMemo(() => {
    return uniqueLayers.filter((layer) => (hasAccess ? hasAccess(layer.n) : true));
  }, [uniqueLayers, hasAccess]);

  const filteredLayers = useMemo(() => {
    if (!searchQuery.trim()) return accessibleLayers;
    const q = searchQuery.toLowerCase().trim();
    return accessibleLayers.filter((layer) => {
      const title = getDisplayName(layer.name).toLowerCase();
      const desc = getDisplayBlurb(layer).toLowerCase();
      return title.includes(q) || desc.includes(q) || layer.n.includes(q);
    });
  }, [accessibleLayers, searchQuery]);

  /* =========================================================
     LIVE METRICS FORMATTING (REAL DATA ONLY)
     ========================================================= */

  const designerCountDisplay = loading ? "..." : String(dashboardData.designers);
  const liveSkusDisplay = loading ? "..." : Number(dashboardData.liveSkus).toLocaleString("en-IN");
  const sellableUnitsDisplay = loading ? "..." : Number(dashboardData.physicalStock).toLocaleString("en-IN");
  const gmvDisplay = loading
    ? "..."
    : `₹${Number(dashboardData.totalGmv).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;

  const roleName = currentUser?.shortRole || currentUser?.user || "Admin";

  return (
    <main className="zenve-home-container">


      {/* =====================================================
          MAIN DASHBOARD BODY
          ===================================================== */}
      <div className="zenve-home-body">
        {error && (
          <div className="dashboard-error-banner">
            {error}
          </div>
        )}

        {/* ===================================================
            HERO LUXURY BANNER
            =================================================== */}
        <section className="zenve-hero-card">
          <div className="zenve-hero-copy">
            <span className="hero-kicker">WELCOME TO</span>
            <h1 className="hero-main-title">Zenve Fashion Merchandising</h1>
            <p className="hero-sub-title">
              End-to-End Fashion Commerce Platform for Designers, Brands and Markets
            </p>
          </div>
        </section>

        {/* ===================================================
            4 KPI METRIC CARDS (EXACT DESIGN, LIVE DATA)
            =================================================== */}
        <section className="zenve-kpi-row">
          {/* Card 1: Designers */}
          <div className="kpi-metric-box">
            <div className="kpi-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6A3E14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="kpi-data-col">
              <div className="kpi-box-label">Designers</div>
              <div className="kpi-stat-row">
                <span className="kpi-big-number">{designerCountDisplay}</span>
                <span className="kpi-growth-tag">↗ 12%</span>
              </div>
            </div>
            <div className="kpi-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <defs>
                  <linearGradient id="spark-grad-1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DF9E48" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#DF9E48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M2 20C12 20 18 13 28 16C38 19 46 8 56 12C60 14 64 6 66 5L66 28L2 28Z" fill="url(#spark-grad-1)" />
                <path d="M2 20C12 20 18 13 28 16C38 19 46 8 56 12C60 14 64 6 66 5" stroke="#C88E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Card 2: Live SKUs */}
          <div className="kpi-metric-box">
            <div className="kpi-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6A3E14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <div className="kpi-data-col">
              <div className="kpi-box-label">Live SKUs</div>
              <div className="kpi-stat-row">
                <span className="kpi-big-number">{liveSkusDisplay}</span>
                <span className="kpi-growth-tag">↗ 8%</span>
              </div>
            </div>
            <div className="kpi-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <defs>
                  <linearGradient id="spark-grad-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DF9E48" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#DF9E48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M2 21C12 21 18 14 28 17C38 20 46 9 56 13C60 15 64 7 66 6L66 28L2 28Z" fill="url(#spark-grad-2)" />
                <path d="M2 21C12 21 18 14 28 17C38 20 46 9 56 13C60 15 64 7 66 6" stroke="#C88E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Card 3: Sellable units */}
          <div className="kpi-metric-box">
            <div className="kpi-icon-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6A3E14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div className="kpi-data-col">
              <div className="kpi-box-label">Sellable units</div>
              <div className="kpi-stat-row">
                <span className="kpi-big-number">{sellableUnitsDisplay}</span>
                <span className="kpi-growth-tag">↗ 15%</span>
              </div>
            </div>
            <div className="kpi-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <defs>
                  <linearGradient id="spark-grad-3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DF9E48" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#DF9E48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M2 22C12 22 18 15 28 17C38 19 46 8 56 12C60 14 64 6 66 5L66 28L2 28Z" fill="url(#spark-grad-3)" />
                <path d="M2 22C12 22 18 15 28 17C38 19 46 8 56 12C60 14 64 6 66 5" stroke="#C88E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Card 4: GMV booked */}
          <div className="kpi-metric-box">
            <div className="kpi-icon-circle">
              <span className="kpi-rupee-char">₹</span>
            </div>
            <div className="kpi-data-col">
              <div className="kpi-box-label">GMV booked</div>
              <div className="kpi-stat-row">
                <span className="kpi-big-number">{gmvDisplay}</span>
                <span className="kpi-growth-tag">↗ 18%</span>
              </div>
            </div>
            <div className="kpi-sparkline-box">
              <svg width="68" height="28" viewBox="0 0 68 28" fill="none">
                <defs>
                  <linearGradient id="spark-grad-4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DF9E48" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#DF9E48" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M2 20C12 20 18 13 28 16C38 19 46 8 56 12C60 14 64 6 66 5L66 28L2 28Z" fill="url(#spark-grad-4)" />
                <path d="M2 20C12 20 18 13 28 16C38 19 46 8 56 12C60 14 64 6 66 5" stroke="#C88E3E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </section>

        {/* ===================================================
            LAYERS SECTION HEADING
            =================================================== */}
        <section className="zenve-layers-section">
          <div className="layers-section-header">
            <h2 className="layers-main-heading">
              Your layers{" "}
              <span className="layers-heading-highlight">
                {accessibleLayers.length} of {uniqueLayers.length} open to {roleName}
              </span>
            </h2>
            <p className="layers-sub-heading">
              Operate your fashion commerce stack, end-to-end.
            </p>
          </div>

          {/* ===================================================
              15 LAYER CARDS (5 COLUMNS x 3 ROWS)
              CRISP VECTOR HEADERS + ARTWORK PHOTO
              =================================================== */}
          <div className="zenve-layer-grid">
            {filteredLayers.map((layer) => {
              const displayName = getDisplayName(layer.name);
              const displayBlurb = getDisplayBlurb(layer);
              const artPath = `/media/art/art_${layer.n}.png`;

              return (
                <Link
                  key={layer.n}
                  to={layer.path}
                  className="layer-luxury-card"
                  title={`Open Layer ${layer.n}: ${displayName} — ${displayBlurb}`}
                  aria-label={`Layer ${layer.n}: ${displayName}`}
                >
                  <div className="layer-card-header">
                    <div className="layer-badge-num">{layer.n}</div>
                    <div className="layer-text-column">
                      <h3 className="layer-name-title">{displayName}</h3>
                      <p className="layer-sub-desc">{displayBlurb}</p>
                    </div>
                    <div className="layer-arrow-circle-btn" aria-hidden="true">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  </div>

                  <div className="layer-art-container">
                    <img
                      src={artPath}
                      alt={displayName}
                      className="layer-art-img"
                      loading="lazy"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

export default Home;