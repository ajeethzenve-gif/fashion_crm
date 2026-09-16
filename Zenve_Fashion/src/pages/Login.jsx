import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import { layers } from "../data/layers";
import "../styles/Login.css";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";

/* =========================================================
   ICONS
========================================================= */

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* =========================================================
   LOGIN COMPONENT
========================================================= */

export default function Login() {
  const { currentUser, loginWithRole, loginCustom } = useAuth();
  const navigate = useNavigate();

  const [selectedRoleId, setSelectedRoleId] = useState(currentUser?.id || "admin");
  const currentRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];

  const [email, setEmail] = useState(currentRole.email);
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle switching role
  const handleRoleSelect = (role) => {
    setSelectedRoleId(role.id);
    setEmail(role.email);
    setPassword("ZenvePass@" + role.shortRole.replace(/\s+/g, ""));
  };

  // One-click quick demo fill
  const handleAutoFill = () => {
    setEmail(currentRole.email);
    setPassword("ZenvePass@" + currentRole.shortRole.replace(/\s+/g, ""));
  };

  // Submit login
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      loginCustom(email, password, selectedRoleId);
      setIsSubmitting(false);
      navigate("/");
    }, 400);
  };

  return (
    <div className="login-page">
      {/* ===================================================
          TOP BAR
      =================================================== */}
      <header className="login-topbar">
        <Link to="/" className="login-brand">
          <img src={zenveLogo} alt="Zenve" className="login-brand-logo" />
          <div>
            <span className="login-brand-title">Zenve Fashion</span>
            <span className="login-brand-subtitle">Enterprise CRM Access</span>
          </div>
        </Link>

        <Link to="/" className="login-back-link">
          <span>← Back to Dashboard</span>
        </Link>
      </header>

      {/* ===================================================
          MAIN CONTENT CONTAINER
      =================================================== */}
      <main className="login-container">
        {/* LEFT COLUMN: SHOWCASE & CLEARANCE MATRIX */}
        <section className="login-showcase">
          <div className="showcase-header">
            <h1>Role-Based Operating Layers</h1>
            <p>
              Zenve Fashion Merchandising partitions enterprise supply, catalogue, inventory, and settlements across strict role clearances.
            </p>
          </div>

          {/* ACTIVE ROLE CLEARANCE CARD */}
          <div className="clearance-card">
            <div className="clearance-head">
              <span className="clearance-title">{currentRole.name}</span>
              <span className="clearance-badge">{currentRole.department}</span>
            </div>

            <p className="clearance-desc">{currentRole.description}</p>

            <div className="clearance-matrix-title">
              <span>Operating Layer Permissions</span>
              <span className="clearance-count">
                {currentRole.clearance.length} of 12 Authorized
              </span>
            </div>

            <div className="clearance-grid">
              {layers.map((layer) => {
                const isAuthorized = currentRole.clearance.includes(layer.n);
                return (
                  <div
                    key={layer.n}
                    className={`clearance-item ${isAuthorized ? "active" : "restricted"}`}
                    title={`${layer.n} ${layer.name} (${layer.group})`}
                  >
                    <span className="clearance-status-icon">
                      {isAuthorized ? <CheckIcon /> : <LockIcon />}
                    </span>
                    <span className="clearance-layer-num">{layer.n}</span>
                    <span className="clearance-layer-name">{layer.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ENTERPRISE TRUST STRIP */}
          <div className="enterprise-trust">
            <div className="trust-item">
              <span className="trust-label">Architecture</span>
              <span className="trust-value">12 Layer Mesh</span>
            </div>
            <div className="trust-item">
              <span className="trust-label">Compliance</span>
              <span className="trust-value">KYC & GST Audit</span>
            </div>
            <div className="trust-item">
              <span className="trust-label">Access Control</span>
              <span className="trust-value">Strict RBAC</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: AUTHENTICATION CARD */}
        <section className="login-auth-card">
          <div className="auth-card-header">
            <h2 className="auth-card-title">Sign In to Workspace</h2>
            <p className="auth-card-subtitle">
              Choose your enterprise role to authenticate and enter the designated layer.
            </p>
          </div>

          {/* ROLE SELECTOR CHIPS */}
          <div className="role-selector-section">
            <label className="role-selector-label">Select Active Role Persona</label>
            <div className="role-chips-grid">
              {ROLES.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={`role-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleRoleSelect(role)}
                  >
                    <span className="role-chip-name">{role.shortRole}</span>
                    <span className="role-chip-user">{role.user}</span>
                    <span className="role-chip-clearance">
                      {role.clearance.length === 12 ? "All Layers" : `${role.clearance.length} Layers`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ONE-CLICK AUTOFILL HELPER */}
          <div className="demo-fill-banner">
            <div className="demo-fill-text">
              Persona: <strong>{currentRole.user}</strong> ({currentRole.name})
            </div>
            <button
              type="button"
              className="btn-autofill"
              onClick={handleAutoFill}
            >
              Fill Credentials
            </button>
          </div>

          {/* LOGIN FORM */}
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Enterprise Email Address</label>
              <div className="login-input-wrapper">
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="name@zenve.in"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Access Password</label>
              <div className="login-input-wrapper password-input">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="btn-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember on this workstation</span>
              </label>

              <a
                href="#forgot"
                className="forgot-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Demo credentials for ${currentRole.name}:\nEmail: ${currentRole.email}\nRedirects to: Home Dashboard (/)`);
                }}
              >
                Access help?
              </a>
            </div>

            <button
              type="submit"
              className="btn-submit-login"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? "Authenticating..."
                  : `Sign In to ${currentRole.shortRole} Workspace`}
              </span>
              <span className="btn-arrow-icon">
                <ArrowRightIcon />
              </span>
            </button>
          </form>

          <div className="audit-notice">
            Logged activities are cryptographically signed for regulatory compliance. Unauthorized access to Zenve Operating Layers is strictly monitored.
          </div>
        </section>
      </main>
    </div>
  );
}
