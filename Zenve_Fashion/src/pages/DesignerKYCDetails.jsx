import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import { getAccessToken } from "../services/authApi";
import logo from "../assets/logo/zenve-logo-fashion.png";
import "../styles/DesignerKYC.css";

export default function DesignerKYCDetails({ authenticated = false }) {
  const [token, setToken] = useState(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try { sessionStorage.setItem("zenve_kyc_token", hash); } catch (_) {}
      return hash;
    }
    try { return sessionStorage.getItem("zenve_kyc_token") || ""; } catch (_) { return ""; }
  });

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [form, setForm] = useState({ name: "", pan: "", dob: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const panValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan);
  const nameValid = form.name.trim().length >= 2;
  const dobValid = Boolean(form.dob);
  const canSubmit = !busy && panValid && nameValid && dobValid && form.consent;

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/designers/kyc/${authenticated ? "my-details" : "requested-details"}/`;
      const headers = {
        "Content-Type": "application/json",
        ...(authenticated ? { Authorization: `Bearer ${getAccessToken() || localStorage.getItem("access_token") || ""}` } : {})
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ token: authenticated ? undefined : token, ...form })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Unable to send identity details. Please verify your details.");
      }

      setDone(result.detail || "Details submitted securely to the verification team. KYC approval is pending.");
      try { sessionStorage.removeItem("zenve_kyc_token"); } catch (_) {}
      setForm({ name: "", pan: "", dob: "", consent: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kyc-public-wrapper">
      <div className="kyc-public-card">
        {/* Brand Header */}
        <div className="kyc-public-brand">
          <img src={logo} alt="Zenve Fashion" className="kyc-public-logo" />
          <span className="kyc-public-eyebrow">Identity Compliance & Verification</span>
          <h1 className="kyc-public-title">Designer KYC Verification</h1>
          <p className="kyc-public-subtitle">
            Please provide your government-registered identity details to activate your luxury designer atelier and payout processing.
          </p>
        </div>

        {/* Security Trust Badges */}
        <div className="kyc-trust-bar">
          <div className="kyc-trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>256-Bit SSL Encrypted</span>
          </div>
          <div className="kyc-trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Direct PAN Validation</span>
          </div>
          <div className="kyc-trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Government Verified</span>
          </div>
        </div>

        {done ? (
          <div className="kyc-success-box">
            <div className="kyc-success-circle">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 className="kyc-success-heading">Details Submitted Securely</h2>
            <p className="kyc-success-msg">{done}</p>

            <div style={{ background: "#fcf9f2", border: "1px solid #ebd9b5", borderRadius: "12px", padding: "18px", margin: "20px 0", textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#8d551b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                Next Verification Steps
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#4b3621" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#e2be76", color: "#221408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>1</span>
                  <span>Compliance team reviews details via official APITXT government check.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#e2be76", color: "#221408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>2</span>
                  <span>Upon verification, you receive an automated confirmation SMS and email.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#e2be76", color: "#221408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>3</span>
                  <span>Full catalogue publishing, inventory & settlement layers are unlocked.</span>
                </div>
              </div>
            </div>

            <Link to="/designer-portal" className="kyc-success-link">
              Return to Designer Portal →
            </Link>
          </div>
        ) : !authenticated && !token ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#fffbeb", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: "18px", color: "#221408", margin: "0 0 8px" }}>Verification Link Required</h2>
            <p style={{ fontSize: "13px", color: "#6d5134", lineHeight: "1.6", maxWidth: "420px", margin: "0 auto 20px" }}>
              Please open the unique verification request link sent by your Zenve Fashion verification team via SMS, WhatsApp, or your Designer Portal.
            </p>
            <Link to="/designer-login" className="kyc-btn-secondary" style={{ display: "inline-flex", textDecoration: "none" }}>
              Sign in to Designer Portal →
            </Link>
          </div>
        ) : (
          <form className="kyc-public-form" onSubmit={submit}>
            {error && (
              <div className="kyc-notice-box danger" role="alert">
                <svg className="kyc-notice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Name as on PAN */}
            <div className="kyc-field-group">
              <label className="kyc-field-label" htmlFor="kyc-name">
                <span>Full Name as Printed on PAN Card</span>
                <span className="kyc-field-helper">Required · Exact Match</span>
              </label>
              <input
                id="kyc-name"
                className="kyc-input"
                type="text"
                required
                autoComplete="name"
                maxLength={255}
                placeholder="e.g. AARAV SHARMA"
                value={form.name}
                disabled={busy}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Date of Birth */}
            <div className="kyc-field-group">
              <label className="kyc-field-label" htmlFor="kyc-dob">
                <span>Date of Birth (as per PAN)</span>
                <span className="kyc-field-helper">DD/MM/YYYY</span>
              </label>
              <input
                id="kyc-dob"
                className="kyc-input"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={form.dob}
                disabled={busy}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
              />
            </div>

            {/* PAN Number */}
            <div className="kyc-field-group">
              <label className="kyc-field-label" htmlFor="kyc-pan">
                <span>Permanent Account Number (PAN)</span>
                <span className="kyc-field-helper" style={{ color: form.pan && !panValid ? "#b91c1c" : undefined }}>
                  {form.pan ? (panValid ? "✓ Valid Format" : "10 characters: ABCDE1234F") : "10 Characters"}
                </span>
              </label>
              <input
                id="kyc-pan"
                className="kyc-input pan-input"
                type="text"
                required
                maxLength={10}
                pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                placeholder="ABCDE1234F"
                autoComplete="off"
                value={form.pan}
                disabled={busy}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              />
            </div>

            {/* Consent Card */}
            <div className={`kyc-consent-card ${form.consent ? "checked" : ""}`}>
              <input
                id="kyc-consent"
                className="kyc-consent-checkbox"
                type="checkbox"
                required
                checked={form.consent}
                disabled={busy}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              />
              <label htmlFor="kyc-consent" className="kyc-consent-text" style={{ cursor: "pointer" }}>
                <strong>Consent to Identity Verification:</strong> I hereby declare that the details provided are accurate and authorize Zenve Fashion Merchandising and its verification provider to verify my PAN with official government databases for merchant onboarding compliance.
              </label>
            </div>

            <button type="submit" className="kyc-public-btn-submit" disabled={!canSubmit}>
              {busy ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span>Submitting Securely...</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span>Submit Details Securely</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
