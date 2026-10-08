import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Header.css";

/* =========================================================
   SEARCH ICON
========================================================= */

function SearchIcon() {
  return (
    <svg
      className="search-icon-svg"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M20 20L16.65 16.65"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


/* =========================================================
   USER ICON
========================================================= */

function UserIcon() {
  return (
    <svg
      className="user-icon-svg"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 20C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


/* =========================================================
   IMAGE ICON (For Designer Reviews)
========================================================= */

function ImageIcon() {
  return (
    <svg
      className="image-icon-svg"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ marginLeft: '16px', cursor: 'pointer' }}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>
  );
}

/* =========================================================
   HEADER COMPONENT
========================================================= */

function Header() {
  const { currentUser } = useAuth();
  return (
    <header className="dashboard-header">

      {/* =====================================================
          HEADER TOP
      ===================================================== */}

      <div className="header-top">

        {/* ===================================================
            LEFT SIDE
        =================================================== */}

        <div className="brand-section">

          {/* Logo */}

          <div className="brand-logo">
            <img
              src="/logo.png"
              alt="Zenve Fashion"
            />
          </div>


          {/* Title */}

          <h1 className="brand-title">
            Zenve Fashion Merchandising
          </h1>

        </div>


        {/* ===================================================
            RIGHT SIDE
        =================================================== */}

        <div className="header-actions">

          {/* =================================================
              SEARCH
          ================================================= */}

          <div className="search-box">

            <SearchIcon />

            <span className="search-placeholder">
              Search everything
            </span>

            <span className="keyboard-shortcut">
              ⌘K
            </span>

          </div>

          {currentUser?.id === "designer" && (
            <Link to="/designer-reviews" title="Designer Reviews" style={{ display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
              <ImageIcon />
            </Link>
          )}

          <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
            <UserIcon />
          </div>

        </div>

      </div>

    </header>
  );
}

export default Header;