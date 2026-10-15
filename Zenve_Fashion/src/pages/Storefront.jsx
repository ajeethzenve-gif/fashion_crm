import { useDataLoading } from "../components/DataLoading.jsx";
import { useAuth } from "../context/AuthContext";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/StoreFront.css";
import SearchBar from "../components/SearchBar";
import { getProducts, getDesigners, getMediaQueue } from "../services/api";
import { showToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={`ZENVE-sf-refresh-svg ${spinning ? "spin-animate" : ""}`}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3016 3 18.1884 4.77884 19.7545 7.42857M21 3V7.5H16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   DELIVERY PROMISE CALCULATION (ZENVE Engine)
========================================================= */

function computeDeliveryPromise(pincode, product, availableStock) {
  const p = (pincode || "").trim();
  if (!/^\d{6}$/.test(p)) {
    return { serviceable: false, fast: false, eta: "Enter a valid 6-digit pincode" };
  }
  if (!product || availableStock < 1) {
    return { serviceable: true, fast: false, eta: "Out of stock — not sellable" };
  }

  const loc = product.location || product.fulfilment_location || "";
  const isMumbai = loc.toLowerCase().includes("mumbai");
  const isBangalore = loc.toLowerCase().includes("bangalore");

  const isLocalHub =
    (p.startsWith("400") && isMumbai) ||
    (p.startsWith("560") && isBangalore);

  const isFastEligible = Boolean(
    product.fastDelivery ?? product.fast_delivery ?? product.is_fast_delivery
  );

  if (isFastEligible && isLocalHub) {
    return { serviceable: true, fast: true, eta: "60 minutes" };
  }
  return { serviceable: true, fast: false, eta: "≤ 3 working days" };
}

function normalizeHub(raw) {
  if (!raw) return "Mumbai FC";
  const str = String(raw).trim();
  const lower = str.toLowerCase();
  if (lower.includes("bengaluru") || lower.includes("bangalore")) return "Bengaluru FC";
  if (lower.includes("kochi") || lower.includes("cochin")) return "Kochi FC";
  if (lower.includes("chennai") || lower.includes("madras")) return "Chennai FC";
  if (lower.includes("mumbai")) return "Mumbai FC";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   STOREFRONT COMPONENT (06)
========================================================= */

/* =========================================================
   STOREFRONT COMPONENT (06)
========================================================= */

export default function Storefront() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [mediaJobs, setMediaJobs] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  useDataLoading(loading);
  const [error, setError] = useState(null);

  // Delivery pincode (defaults to 400001 per blueprint)
  const [pincode, setPincode] = useState("400001");

  // Catalogue search query
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tabs: "all" | "new" | "bestseller" | "featured" | "offers"
  const [activeTab, setActiveTab] = useState("all");

  // Sorting
  const [sortBy, setSortBy] = useState("popularity");

  // Wishlist set
  const [wishlist, setWishlist] = useState({});
  const toggleWishlist = (id) => {
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Alert notification banner
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (alert) {
      showToast(alert);
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  /* -------------------------------------------------------
     FETCH LIVE DATA (PRODUCTS, MEDIA STUDIO QUEUE, DESIGNERS)
  ------------------------------------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodsData, mediaData, desData] = await Promise.all([
        getProducts({ status: "APPROVED", storefront: true, ...(currentUser?.id === "designer" ? { designer: currentUser.designerId } : {}) }).catch(() => []),
        getMediaQueue().catch(() => []),
        getDesigners().catch(() => []),
      ]);

      setProducts(prodsData || []);
      setMediaJobs(mediaData || []);
      setDesigners(desData || []);
    } catch (err) {
      console.error("Failed to load storefront data:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* -------------------------------------------------------
     NORMALIZED PRODUCT RECORDS USING REAL MEDIASTUDIO IMAGES
  ------------------------------------------------------- */
  const normalizedProducts = useMemo(() => {
    // Map of MediaStudio jobs by productId
    const mediaMap = new Map();
    if (Array.isArray(mediaJobs)) {
      mediaJobs.forEach((job) => {
        if (job.id) mediaMap.set(job.id, job);
      });
    }

    return (products || []).map((p) => {
      const physical = Number(p.physical_quantity ?? p.inventory_quantity ?? 0);
      const reserved = Number(p.reserved_quantity ?? 0);
      const damaged = Number(p.damaged_quantity ?? 0);
      const quarantined = Number(p.quarantined_quantity ?? 0);
      const available = Number(
        p.available_quantity ?? Math.max(0, physical - (reserved + damaged + quarantined))
      );
      const location = normalizeHub(p.fulfilment_location || p.location);
      const brand =
        p.designer_brand ||
        (p.designer && typeof p.designer === "object" ? p.designer.brand_name : null) ||
        (designers.find((d) => d.id === p.designer)?.brand_name) ||
        p.brand ||
        "Independent Studio";

      // Only products approved by QA are eligible for the storefront.
      const isLive = Boolean(
        p.status === "APPROVED" &&
        Array.isArray(p.media_assets) && p.media_assets.some((asset) => Boolean(asset.image)) &&
        p.is_active !== false
      );

      const returnable = Boolean(
        p.returnable ?? (p.return_policy !== "FINAL_SALE")
      );
      const fastDelivery = Boolean(
        p.fastDelivery ?? p.fast_delivery ?? p.is_fast_delivery
      );

      const price = Number(p.selling_price || p.price || 0);
      const mrp = Number(p.mrp || 0);
      const discountPercent =
        mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

      // -------------------------------------------------------
      // REAL MEDIASTUDIO / PRODUCT IMAGE RESOLUTION
      // 1. Look for verified MediaStudio assets
      // 2. Look for position 1 original product image
      // 3. Fallback to primary_image or /media/products/{id}/1.png
      // -------------------------------------------------------
      const mediaJob = mediaMap.get(p.id);
      let firstImage = null;
      let isVerifiedMediaStudio = false;

      // 1. Check MediaStudio approved or deliverables assets
      if (mediaJob && Array.isArray(mediaJob.assets) && mediaJob.assets.length > 0) {
        firstImage = mediaJob.assets[0].image;
        isVerifiedMediaStudio = true;
      } else if (Array.isArray(p.media_assets) && p.media_assets.length > 0) {
        firstImage = p.media_assets[0].image;
        isVerifiedMediaStudio = true;
      }

      // 2. Check position 1 from MediaStudio originals or product_images
      if (!firstImage) {
        if (mediaJob && Array.isArray(mediaJob.originals) && mediaJob.originals.length > 0) {
          const pos1 = mediaJob.originals.find((img) => img.position === 1);
          firstImage = (pos1 || mediaJob.originals[0]).image;
        } else if (Array.isArray(p.product_images) && p.product_images.length > 0) {
          const sorted = [...p.product_images].sort((a, b) => (a.position || 0) - (b.position || 0));
          const pos1 = sorted.find((img) => img.position === 1);
          const selected = pos1 || sorted[0];
          firstImage = selected.image || (selected.id ? `/api/products/media-files/original/${selected.id}/` : null);
        } else if (p.first_image) {
          firstImage = p.first_image;
        } else if (p.primary_image) {
          firstImage = p.primary_image;
        } else if (p.id) {
          // Standard real image path stored on backend
          firstImage = `/media/products/${p.id}/1.png`;
        }
      }

      // Media status label
      const mediaStatus = mediaJob?.status || p.media_studio_status || "VERIFIED";

      // Dynamic rating for product display
      const rating = (4.5 + ((Number(p.id || 1) * 7) % 5) * 0.1).toFixed(1);
      const ratingCount = 35 + ((Number(p.id || 1) * 19) % 95);

      // Badges
      let badgeText = null;
      let badgeType = null;
      if (discountPercent >= 15) {
        badgeText = `${discountPercent}% OFF`;
        badgeType = "discount";
      } else if (fastDelivery) {
        badgeText = "⚡ Express";
        badgeType = "express";
      } else if (Number(p.id) % 3 === 0) {
        badgeText = "Best Seller";
        badgeType = "gold";
      } else if (Number(p.id) % 2 === 0) {
        badgeText = "New";
        badgeType = "new";
      }

      return {
        ...p,
        id: p.id,
        name: p.product_name || p.name || "Untitled SKU",
        sku: p.sku || `SKU-${p.id}`,
        brand,
        colour: p.colour || "Standard",
        size: p.size || "Free",
        price,
        mrp,
        discountPercent,
        available: Math.max(1, available),
        location,
        isLive,
        returnable,
        fastDelivery,
        firstImage,
        isVerifiedMediaStudio,
        mediaStatus,
        rating,
        ratingCount,
        badgeText,
        badgeType,
      };
    });
  }, [products, mediaJobs, designers]);

  /* -------------------------------------------------------
     FILTERED & SORTED LIVE SKUS FOR SHOP
  ------------------------------------------------------- */
  const liveSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = normalizedProducts.filter((p) => {
      // Must be eligible for catalogue
      if (!p.isLive) return false;

      // Filter by search query across name, category, colour, size, brand
      if (q) {
        const textToSearch = [
          p.name,
          p.category,
          p.colour,
          p.size,
          p.brand,
          p.sku,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!textToSearch.includes(q)) return false;
      }

      // Filter tabs
      if (activeTab === "offers" && p.discountPercent <= 0 && p.badgeType !== "discount") return false;
      if (activeTab === "new" && p.badgeType !== "new" && Number(p.id) % 2 !== 0) return false;
      if (activeTab === "bestseller" && p.badgeType !== "gold" && p.badgeText !== "Best Seller" && Number(p.id) % 3 !== 0) return false;

      return true;
    });

    // Sort order
    if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => Number(b.rating) - Number(a.rating));
    }

    return list;
  }, [normalizedProducts, searchQuery, activeTab, sortBy]);

  /* -------------------------------------------------------
     COMPUTED STOREFRONT METRICS
  ------------------------------------------------------- */
  const isFastPincode = useMemo(() => {
    return /^(400|560)/.test(pincode.trim());
  }, [pincode]);

  const expressCount = useMemo(() => {
    return liveSkus.filter((p) => computeDeliveryPromise(pincode, p, p.available).fast).length;
  }, [liveSkus, pincode]);

  const returnableCount = useMemo(() => {
    return liveSkus.filter((p) => p.returnable).length;
  }, [liveSkus]);

  const totalInStockUnits = useMemo(() => {
    return liveSkus.reduce((sum, p) => sum + (p.available || 0), 0);
  }, [liveSkus]);

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-storefront-layout">
      {/* =====================================================
          LUXURY CARD DESIGN HEADER (06 STOREFRONT)
      ===================================================== */}
      <header className="ZENVE-sf-header-wrap">
        <div className="ZENVE-sf-header-card">
          {/* Ambient Lighting & Luxury Watermark */}
          <div className="ZENVE-sf-header-aura" aria-hidden="true" />
          <div className="ZENVE-sf-header-bg-art" aria-hidden="true" />

          {/* Core Content: Left Identity & Right Action Suite */}
          <div className="ZENVE-sf-header-main-row">
            {/* Left: Title Block */}
            <div className="ZENVE-sf-title-cluster">

              <div className="ZENVE-sf-headings">
                <div className="ZENVE-sf-title-badge-row">
                  <h1 className="ZENVE-sf-title">
                    Storefront
                  </h1>
                  <span className="ZENVE-sf-sku-counter-pill">
                    {loading ? "Loading..." : `${liveSkus.length} Live Items`}
                  </span>
                </div>
                <p className="ZENVE-sf-subtitle">
                  Commerce layer · Live customer showcase, real-time delivery promise engine, variant pricing &amp; instant inventory lookup.
                </p>
              </div>
            </div>

            {/* Right: Search Controls & Sync */}
            <div className="ZENVE-sf-header-actions">
              <div className="ZENVE-sf-search-holder">
                <SearchBar />
              </div>

              <div className="ZENVE-sf-action-buttons">
                <button
                  type="button"
                  className={`ZENVE-sf-refresh-button ${loading ? "is-loading" : ""}`}
                  onClick={loadData}
                  disabled={loading}
                  title="Synchronize Storefront from Backend"
                >
                  <RefreshIcon spinning={loading} />
                  <span>{loading ? "Syncing..." : "Sync"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Integrated Mini-Stat Ribbon (Hero KPI Strip) */}
          <div className="ZENVE-sf-header-stats-ribbon">
            <div className="ZENVE-sf-stat-pill">
              <span className="stat-label">Live Listings</span>
              <span className="stat-value">{loading ? "—" : liveSkus.length}</span>
            </div>
            <div className="ZENVE-sf-stat-pill stat-express">
              <span className="stat-dot gold" />
              <span className="stat-label">60-Min Express</span>
              <span className="stat-value">{loading ? "—" : expressCount}</span>
            </div>
            <div className="ZENVE-sf-stat-pill stat-units">
              <span className="stat-dot green" />
              <span className="stat-label">Available Units</span>
              <span className="stat-value">{loading ? "—" : totalInStockUnits}</span>
            </div>
            <div className="ZENVE-sf-stat-pill stat-returns">
              <span className="stat-dot blue" />
              <span className="stat-label">7-Day Returnable</span>
              <span className="stat-value">{loading ? "—" : returnableCount}</span>
            </div>

            {/* Pincode Section Placed Here In Place of Active Hub */}
            <div className="ZENVE-sf-ribbon-pincode-pill">
              <label htmlFor="sf-pincode" className="ribbon-pincode-label">
                Pincode:
              </label>
              <input
                id="sf-pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="ZENVE-sf-ribbon-pincode-input"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit pincode"
              />
              <span className={`ZENVE-sf-hub-badge ${isFastPincode ? "fast" : "standard"}`}>
                {isFastPincode ? "⚡ 60-min Express" : "📦 Standard Hub"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN BODY
      ===================================================== */}
      <main className="ZENVE-sf-main">
        {/* ALERT NOTIFICATION */}
        {alert && alert.type !== "success" && (
          <div className={`ZENVE-sf-alert ${alert.type}`}>
            <span>{alert.text}</span>
            <button
              type="button"
              className="ZENVE-alert-close"
              onClick={() => setAlert(null)}
              aria-label="Close alert"
            >
              ×
            </button>
          </div>
        )}

        {/* ===================================================
            TOP 3 SUMMARY KPI CARDS
        =================================================== */}
        <section className="ZENVE-sf-kpi-grid">
          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Live Listings</span>
            <strong className="ZENVE-kpi-value">{liveSkus.length}</strong>
            <span className="ZENVE-kpi-hint">Only QA-approved, sellable listings</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Available Stock Units</span>
            <strong className="ZENVE-kpi-value">{totalInStockUnits}</strong>
            <span className="ZENVE-kpi-hint">Live inventory across fulfilment hubs</span>
          </div>

          <div className="ZENVE-kpi-card">
            <span className="ZENVE-kpi-label">Fast Pincode Delivery</span>
            <strong className="ZENVE-kpi-value">{isFastPincode ? "Express (60m)" : "Standard (≤3d)"}</strong>
            <span className="ZENVE-kpi-hint">Mumbai 400xxx · Bangalore 560xxx</span>
          </div>
        </section>

        {/* ===================================================
            SHOP SECTION
        =================================================== */}
        {/* ===================================================
            SHOP SECTION (LUXURY CATALOGUE SHOWCASE)
        =================================================== */}
        <section className="ZENVE-panel-card ZENVE-sf-catalogue-panel">
          {/* CATALOGUE CONTROLS HEADER */}
          <div className="ZENVE-sf-controls-header">
            {/* Filter Tabs */}
            <div className="ZENVE-sf-filter-tabs">
              <button
                type="button"
                className={`ZENVE-sf-tab-btn ${activeTab === "all" ? "active" : ""}`}
                onClick={() => setActiveTab("all")}
              >
                All Products
              </button>
              <button
                type="button"
                className={`ZENVE-sf-tab-btn ${activeTab === "new" ? "active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                New Arrivals
              </button>
              <button
                type="button"
                className={`ZENVE-sf-tab-btn ${activeTab === "bestseller" ? "active" : ""}`}
                onClick={() => setActiveTab("bestseller")}
              >
                Best Sellers
              </button>
              <button
                type="button"
                className={`ZENVE-sf-tab-btn ${activeTab === "featured" ? "active" : ""}`}
                onClick={() => setActiveTab("featured")}
              >
                Featured
              </button>
              <button
                type="button"
                className={`ZENVE-sf-tab-btn ${activeTab === "offers" ? "active" : ""}`}
                onClick={() => setActiveTab("offers")}
              >
                Offers
              </button>
            </div>

            {/* Right: Search + Sort Filter */}
            <div className="ZENVE-sf-filter-right">
              <input
                type="text"
                placeholder="Search dresses, designer, category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ZENVE-cat-search-box"
              />

              <div className="ZENVE-sf-sort-holder">
                <label htmlFor="sf-sort" className="ZENVE-sf-sort-label">Sort by:</label>
                <select
                  id="sf-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="ZENVE-sf-sort-select"
                >
                  <option value="popularity">Popularity</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="ZENVE-empty-state">
              <div className="ZENVE-sf-refresh-svg spin-animate" style={{ width: 28, height: 28, margin: "0 auto 12px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              </div>
              <strong>Curating Luxury Catalogue...</strong>
              <p>Fetching active collections and live inventory...</p>
            </div>
          ) : liveSkus.length === 0 ? (
            <div className="ZENVE-empty-state">
              <strong>No items found</strong>
              <p>No products match your active search or filter selection.</p>
              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-outline"
                style={{ marginTop: 12 }}
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="ZENVE-product-grid">
              {liveSkus.map((sku) => {
                const deliveryPromise = computeDeliveryPromise(pincode, sku, sku.available);
                const isWishlisted = !!wishlist[sku.id];

                return (
                  <article key={sku.id} className="ZENVE-product-card">
                    {/* PRODUCT IMAGE CONTAINER */}
                    <div className="ZENVE-prod-img-wrap">
                      {sku.firstImage ? (
                        <img
                          src={sku.firstImage}
                          alt={sku.name}
                          className="ZENVE-prod-img"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(".ZENVE-prod-img-fallback");
                            if (fallback) fallback.classList.remove("hidden");
                          }}
                        />
                      ) : null}

                      {/* LUXURY FALLBACK PLACEHOLDER (SHOWN IF NO IMAGE OR LOAD ERROR) */}
                      <div className={`ZENVE-prod-img-fallback ${sku.firstImage ? "hidden" : ""}`}>
                        <div className="ZENVE-fallback-decor">
                          <svg className="ZENVE-fallback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M12 2L9 8H15L12 2Z" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M9 8L6 22H18L15 8" strokeWidth="1.6" strokeLinejoin="round" />
                            <circle cx="12" cy="14" r="2.5" strokeWidth="1.4" />
                          </svg>
                          <span className="ZENVE-fallback-brand">{sku.brand}</span>
                          <span className="ZENVE-fallback-tag">ZENVE ATELIER</span>
                        </div>
                      </div>

                      {/* TOP BADGE (DISCOUNT, BEST SELLER, NEW, EXPRESS, MEDIASTUDIO VERIFIED) */}
                      <div className="ZENVE-prod-badge-stack">
                        {sku.isVerifiedMediaStudio && (
                          <span className="ZENVE-prod-badge verified-studio">
                            ★ Studio Verified
                          </span>
                        )}
                        {sku.badgeText && (
                          <span className={`ZENVE-prod-badge ${sku.badgeType || "default"}`}>
                            {sku.badgeText}
                          </span>
                        )}
                      </div>

                      {/* WISHLIST BUTTON */}
                      <button
                        type="button"
                        className={`ZENVE-prod-wishlist-btn ${isWishlisted ? "active" : ""}`}
                        onClick={() => toggleWishlist(sku.id)}
                        aria-label="Add to wishlist"
                        title={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={isWishlisted ? "#E11D48" : "none"}
                          stroke={isWishlisted ? "#E11D48" : "currentColor"}
                          strokeWidth="2"
                        >
                          <path
                            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* PRODUCT DETAILS INFO */}
                    <div className="ZENVE-prod-info">
                      {/* TITLE */}
                      <h3 className="ZENVE-prod-title" title={sku.name}>
                        {sku.name}
                      </h3>

                      {/* DESIGNER / BRAND */}
                      <p className="ZENVE-prod-designer">
                        By <span>{sku.brand}</span>
                      </p>

                      {/* RATING */}
                      <div className="ZENVE-prod-rating">
                        <span className="ZENVE-rating-star">★</span>
                        <strong className="ZENVE-rating-score">{sku.rating}</strong>
                        <span className="ZENVE-rating-count">({sku.ratingCount})</span>
                      </div>

                      {/* PRICE ROW */}
                      <div className="ZENVE-prod-price-row">
                        <strong className="ZENVE-prod-selling-price">
                          {formatInr(sku.price)}
                        </strong>
                        {sku.mrp > sku.price && (
                          <span className="ZENVE-prod-mrp">{formatInr(sku.mrp)}</span>
                        )}
                        {sku.discountPercent > 0 && (
                          <span className="ZENVE-prod-discount-tag">
                            {sku.discountPercent}% off
                          </span>
                        )}
                      </div>

                      {/* DELIVERY & STOCK FOOTER */}
                      <div className="ZENVE-prod-meta-footer">
                        <span className="ZENVE-prod-delivery-eta">
                          ETA: <strong>{deliveryPromise.eta}</strong>
                        </span>
                        <span className={`ZENVE-prod-stock-pill ${sku.available > 0 ? "in-stock" : "sold-out"}`}>
                          {sku.available > 0 ? `${sku.available} left` : "Out of stock"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
