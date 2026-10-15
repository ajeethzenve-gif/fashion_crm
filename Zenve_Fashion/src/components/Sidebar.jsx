import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { layers } from "../data/layers";
import "./styles/Sidebar.css";
import logo from "../assest/logo/zenve-logo-fashion.png";

const iconMap = {
  Home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  "Designer CRM": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  "Designer Portal": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  "Product / SKU": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
  ),
  "Catalogue QA": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <path d="M9 12l2 2 4-4"></path>
    </svg>
  ),
  "Inventory Engine": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
  ),
  "Storefront": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  "OMS": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"></circle>
      <circle cx="20" cy="21" r="1"></circle>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
  ),
  "Delivery Engine": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>
  ),
  "Returns Engine": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  "Settlement": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  "BI Dashboards": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>
  ),
  "Command Centre": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  "Media Studio": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>
  ),
  "Social Media": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  ),
  "Accounting": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
};

const getDisplayName = (layerName) => {
  if (layerName === "Product / SKU") return "Product Catalogue";
  if (layerName === "OMS") return "Orders";
  return layerName;
};

function UserIcon() {
  return (
    <svg
      className="user-icon"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 20C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DesignerProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function DesignerImageIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, hasAccess } = useAuth();

  const [designerProfileActive, setDesignerProfileActive] = React.useState(false);
  const [designerReviewsActive, setDesignerReviewsActive] = React.useState(false);

  // Sync active view states with DesignerPortal
  useEffect(() => {
    const handleStateChange = (e) => {
      if (e?.detail) {
        setDesignerProfileActive(Boolean(e.detail.profile));
        setDesignerReviewsActive(Boolean(e.detail.reviews));
      }
    };
    window.addEventListener("zenve:designer-view-state", handleStateChange);
    return () => {
      window.removeEventListener("zenve:designer-view-state", handleStateChange);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== "/designer-portal") {
      setDesignerProfileActive(false);
      setDesignerReviewsActive(false);
    }
  }, [location.pathname]);

  const handleDesignerProfileClick = () => {
    if (location.pathname === "/designer-portal") {
      window.dispatchEvent(new CustomEvent("zenve:toggle-profile"));
    } else {
      navigate("/designer-portal?view=profile");
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleDesignerReviewsClick = () => {
    if (location.pathname === "/designer-portal") {
      window.dispatchEvent(new CustomEvent("zenve:toggle-reviews"));
    } else {
      navigate("/designer-portal?view=reviews");
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close mobile drawer on route change
  useEffect(() => {
    if (mobileOpen) {
      onCloseMobile();
    }
  }, [location.pathname]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Clean user handle format (e.g. ajeeth.zenve or priya.zenve)
  const userHandle = currentUser?.user
    ? `${currentUser.user.toLowerCase().split(/[\s._-]+/)[0]}.zenve`
    : "guest.zenve";

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="zenve-mobile-overlay"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`zenve-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Mobile-Only Drawer Header (Matches Reference Image) */}
        <div className="mobile-drawer-header">
          <div
            className="mobile-drawer-user"
            onClick={() => {
              if (currentUser?.id === "designer") {
                handleDesignerProfileClick();
              }
            }}
            style={{ cursor: currentUser?.id === "designer" ? "pointer" : "default" }}
            title={currentUser?.id === "designer" ? "Open My Profile & Account" : "My Account"}
            role={currentUser?.id === "designer" ? "button" : undefined}
            tabIndex={currentUser?.id === "designer" ? 0 : undefined}
          >
            <div className="mobile-drawer-avatar">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <div className="mobile-drawer-user-meta">
              <span className="mobile-drawer-username">{userHandle}</span>
              <span className="mobile-drawer-account-label">
                {currentUser?.id === "designer" ? "My Profile & Account →" : "My Account"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={onCloseMobile}
            aria-label="Close menu"
            title="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Desktop Logo (Visible in normal desktop view only) */}
        <div className="sidebar-logo">
          <img src={logo} alt="Zenve Logo" />
          <div className="sidebar-logo-text">
            <span className="logo-zenve">ZENVE</span>
            <span className="logo-sub">Fashion Merchandising</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="sidebar-nav">
          {currentUser?.id !== "designer" && (
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={onCloseMobile}
            >
              <div className="nav-icon-wrap">{iconMap["Home"]}</div>
              <span>Home</span>
            </Link>
          )}

          {layers.filter((layer) => hasAccess(layer.n)).map((layer) => {
            const isActive = location.pathname === layer.path || location.pathname.startsWith(`${layer.path}/`);
            const icon = layer.n === "16" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg> : iconMap[layer.name] || iconMap["Home"];
            const displayName = getDisplayName(layer.name);
            return (
              <Link
                key={layer.n}
                to={layer.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={onCloseMobile}
              >
                <div className="nav-icon-wrap">{icon}</div>
                <span>{displayName}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          {currentUser ? (
            <>
              <div className="sidebar-user-info">
                <div className="sidebar-user-avatar">
                  <UserIcon />
                </div>
                <div className="sidebar-user-details">
                  <span className="sidebar-user-name">
                    {currentUser.user || "User"}
                  </span>
                  <span className="sidebar-user-role">
                    {currentUser.shortRole || "Role"}
                  </span>
                </div>
              </div>

              {currentUser?.id === "designer" && (
                <div className="sidebar-designer-menu-actions">
                  <button
                    type="button"
                    className={`sidebar-designer-action-btn ${designerProfileActive ? "active" : ""}`}
                    onClick={handleDesignerProfileClick}
                    title="My Profile & Account Details"
                    aria-label="My Profile & Account Details"
                  >
                    <DesignerProfileIcon />
                    {designerProfileActive && (
                      <span className="sidebar-designer-active-dot" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={`sidebar-designer-action-btn ${designerReviewsActive ? "active" : ""}`}
                    onClick={handleDesignerReviewsClick}
                    title="Designer Reviews"
                    aria-label="Designer Reviews"
                  >
                    <DesignerImageIcon />
                    {designerReviewsActive && (
                      <span className="sidebar-designer-active-dot" />
                    )}
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  handleLogout();
                  onCloseMobile();
                }}
                className="sidebar-signout-btn"
                title="Sign out"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={onCloseMobile}
              className="sidebar-signout-btn"
              title="Sign in"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="sidebar-golden-waves"></div>
      </aside>
    </>
  );
}

