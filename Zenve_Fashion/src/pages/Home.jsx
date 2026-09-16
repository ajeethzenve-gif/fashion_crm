import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";
import {
  getDesigners,
  getProducts,
  getOrders,
  getCommandCentreOverview,
} from "../services/api";

/* =========================================================
   HOME PAGE
========================================================= */

function Home() {
  const { currentUser, hasAccess } = useAuth();
  const [designers, setDesigners] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadHomeData() {
      try {
        setLoading(true);
        const [desRes, prodRes, ordRes, ovRes] = await Promise.all([
          getDesigners().catch(() => []),
          getProducts().catch(() => []),
          getOrders().catch(() => []),
          getCommandCentreOverview().catch(() => null),
        ]);
        if (!mounted) return;
        setDesigners(Array.isArray(desRes) ? desRes : desRes?.results || []);
        setProducts(Array.isArray(prodRes) ? prodRes : prodRes?.results || []);
        setOrders(Array.isArray(ordRes) ? ordRes : ordRes?.results || []);
        if (ovRes) setOverview(ovRes);
      } catch (err) {
        console.error("Failed to load home page live metrics:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadHomeData();
    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Remove duplicate layers based on layer number.
   */
  const uniqueLayers = Array.from(
    new Map(
      layers.map((layer) => [layer.n, layer])
    ).values()
  ).sort(
    (a, b) => Number(a.n) - Number(b.n)
  );

  // Only show authorized layers for the logged-in designation
  const accessibleLayers = uniqueLayers.filter((layer) => hasAccess(layer.n));

  // Dynamic KPI Computations
  const designersCount = designers.length;

  const liveSkusCount = useMemo(() => {
    return products.filter(
      (p) =>
        p.status === "LIVE" ||
        p.status === "APPROVED" ||
        p.live === true ||
        p.is_live === true
    ).length;
  }, [products]);

  const brandsCount = useMemo(() => {
    const brands = new Set();
    products.forEach((p) => {
      const b = p.designer_name || p.brand_name || p.brand;
      if (b) brands.add(b);
    });
    return brands.size || designers.length;
  }, [products, designers]);

  const physicalStock = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty =
        p.inventory_quantity !== undefined && p.inventory_quantity !== null
          ? Number(p.inventory_quantity)
          : Number(p.available_quantity || p.available || 0);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  }, [products]);

  const ordersCount = orders.length;

  const exceptionsCount = useMemo(() => {
    if (overview?.exceptions && Array.isArray(overview.exceptions)) {
      return overview.exceptions.length;
    }
    // Fallback live check
    const qaPending = products.filter(
      (p) => (p.status || p.qaStatus) === "PENDING_QA"
    ).length;
    const lowStock = products.filter(
      (p) => (p.status === "LIVE" || p.live) && Number(p.available_quantity || 0) <= 2
    ).length;
    return qaPending + lowStock;
  }, [overview, products]);

  return (
    <main className="home-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="header-content">

        <header className="home-header">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="header-left">

            {/* LOGO */}

            <Link to="/" className="zenve-logo">
              <img
                src={logo}
                alt="Zenve Fashion"
              />
            </Link>

            {/* TITLE */}

            <h1 className="home-title">
              Zenve Fashion Merchandising
            </h1>

          </div>


          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="header-right">

            {/* SEARCH + USER */}

            <SearchBar />

          </div>

        </header>


        {/* ===================================================
            KPI SECTION (AUTHENTIC LIVE METRICS)
        =================================================== */}

        <section className="kpi-section">

          {/* DESIGNERS */}

          <div className="kpi-card">

            <div className="kpi-label">
              DESIGNERS
            </div>

            <div className="kpi-value">
              {loading ? "..." : designersCount}
            </div>

            <div className="kpi-subtitle">
              Lead to active
            </div>

          </div>


          {/* LIVE SKUS */}

          <div className="kpi-card">

            <div className="kpi-label">
              LIVE SKUS
            </div>

            <div className="kpi-value">
              {loading ? "..." : liveSkusCount}
            </div>

            <div className="kpi-subtitle">
              {brandsCount > 0 ? `Across ${brandsCount} ${brandsCount === 1 ? "brand" : "brands"}` : "In catalogue"}
            </div>

          </div>


          {/* PHYSICAL STOCK */}

          <div className="kpi-card">

            <div className="kpi-label">
              PHYSICAL STOCK
            </div>

            <div className="kpi-value">
              {loading ? "..." : physicalStock}
            </div>

            <div className="kpi-subtitle">
              In FCs
            </div>

          </div>


          {/* ORDERS */}

          <div className="kpi-card">

            <div className="kpi-label">
              ORDERS
            </div>

            <div className="kpi-value">
              {loading ? "..." : ordersCount}
            </div>

            <div className="kpi-subtitle">
              Total placed
            </div>

          </div>

        </section>

      </div>


      {/* =====================================================
          LAYERS SECTION
      ===================================================== */}

      <section className="layers-section">

        {/* SECTION HEADER */}

        <div className="layers-header">

          <div className="layers-title-wrapper">

            <h2>
              Your layers
            </h2>

            <span className="layers-count">
              {accessibleLayers.length} layers · {currentUser?.shortRole || "Admin"} clearance
            </span>

          </div>

          <div className="exception-badge">
            {loading ? "..." : `${exceptionsCount} open exceptions`}
          </div>

        </div>


        {/* ===================================================
            LAYER GRID (EXACT REPLICATED VIEW: 12 OPERATIONAL LAYERS)
        =================================================== */}

        <div className="layers-grid">

          {uniqueLayers.map((layer) => (
            <Link
              key={layer.n}
              to={layer.path}
              className="layer-card"
            >

              {/* TOP ROW */}

              <div className="layer-top">

                <span className="layer-group">
                  {layer.group}
                </span>

                <span className="layer-number">
                  {layer.n}
                </span>

              </div>


              {/* TITLE */}

              <h3 className="layer-name">
                {layer.name}
              </h3>


              {/* DESCRIPTION */}

              <p className="layer-blurb">
                {layer.blurb}
              </p>

            </Link>
          ))}

        </div>

      </section>

    </main>
  );
}

export default Home;