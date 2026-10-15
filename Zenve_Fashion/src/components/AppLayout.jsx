import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { DataLoadingBody } from "./DataLoading.jsx";
import { Outlet } from "react-router-dom";
import logo from "../assets/logo/zenve-logo-fashion.png";
import { useAuth } from "../context/AuthContext";

export default function AppLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useAuth();

  const userHandle = currentUser?.user
    ? `${currentUser.user.toLowerCase().split(/[\s._-]+/)[0]}.zenve`
    : "zenve";

  return (
    <div className="zenve-app-layout">
      {/* Mobile Top Header Bar (ONLY displayed on mobile screen <= 1024px; display: none on desktop) */}
      <header className="zenve-mobile-topbar">
        <div className="zenve-mobile-brand">
          <img src={logo} alt="Zenve Logo" />
          <div className="zenve-mobile-brand-text">
            <span className="zenve-mobile-brand-title">ZENVE</span>
            <span className="zenve-mobile-brand-sub">Fashion Merchandising</span>
          </div>
        </div>

        <div className="zenve-mobile-topbar-actions">
          {currentUser && (
            <span className="zenve-mobile-user-badge">
              {userHandle}
            </span>
          )}
          <button
            type="button"
            className="zenve-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            title="Open Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* Sidebar on desktop / Slide-out Menu Drawer on mobile */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="zenve-main-content">
        <div className="zenve-page-scroll">
          <DataLoadingBody>{children || <Outlet />}</DataLoadingBody>
        </div>
      </div>
    </div>
  );
}
