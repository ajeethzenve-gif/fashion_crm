import React from "react";
import { Link } from "react-router-dom";
import { layers } from "../data/layers";
import { useAuth } from "../context/AuthContext";
import "../styles/Home.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";

/* =========================================================
   HOME PAGE
========================================================= */

function Home() {
  const { currentUser, hasAccess } = useAuth();

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
            KPI SECTION
        =================================================== */}

        <section className="kpi-section">

          {/* DESIGNERS */}

          <div className="kpi-card">

            <div className="kpi-label">
              DESIGNERS
            </div>

            <div className="kpi-value">
              3
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
              2
            </div>

            <div className="kpi-subtitle">
              Across 2 brands
            </div>

          </div>


          {/* PHYSICAL STOCK */}

          <div className="kpi-card">

            <div className="kpi-label">
              PHYSICAL STOCK
            </div>

            <div className="kpi-value">
              44
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
              0
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
              {uniqueLayers.length} layers · {currentUser?.shortRole || "Admin"} clearance
            </span>

          </div>

          <div className="exception-badge">
            5 open exceptions
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