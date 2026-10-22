import React, { useEffect, useRef, useState, useMemo } from "react";
import { API_BASE_URL } from "../services/api";
import { getAccessToken } from "../services/authApi";
import { useDataLoading } from "../components/DataLoading";
import bannerImg from "../assets/login_bg/Golden Atelier of Zenve Fashion.png";
import "../styles/DesignerCrm.css";
import "../styles/RequestsNotifications.css";
import "../styles/DesignerKYC.css";

const normalizedName = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim();

export default function DesignerKYC() {
  const [data, setData] = useState({ designers: [], submissions: [], provider_configured: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All unverified");
  const [selected, setSelected] = useState(null);
  const [record, setRecord] = useState(null);

  // PAN Check Form
  const [pan, setPan] = useState("");
  const [panName, setPanName] = useState("");
  const [panDob, setPanDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");

  // Link sharing state
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const workspace = useRef(null);
  useDataLoading(loading);

  const request = async (path = "", body) => {
    const response = await fetch(`${API_BASE_URL}/designers/kyc/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAccessToken() || localStorage.getItem("access_token") || ""}`,
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail || "Unable to complete verification. Please try again.");
    return result;
  };

  const load = async () => {
    setLoading(true);
    try {
      const latest = await request();
      setData(latest);
      if (selected) {
        const current = latest.submissions.find((item) => item.designer === selected.id);
        if (current) {
          setRecord(current);
          const details = current.api_checks?.designer_details;
          if (details) {
            setPan(details.pan || "");
            setPanName(details.name || "");
            setPanDob(details.date_of_birth || "");
            setConfirmed(false);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDesigner = async (designer) => {
    setSelected(designer);
    setRecord(null);
    setPan("");
    setPanName(designer.owner_name || designer.designer_name || "");
    setPanDob("");
    setConsent(false);
    setConfirmed(false);
    setNotes("");
    setError("");
    setMessage("");
    setCopiedLink(false);
    setGeneratedLink("");
    setBusy(true);

    try {
      const result = await request(`designer/${designer.id}/start/`, {});
      setRecord(result);
      setPan(result.api_checks?.designer_details?.pan || result.pan_number || "");
      setPanName(result.api_checks?.designer_details?.name || designer.owner_name || designer.designer_name || "");
      setPanDob(result.api_checks?.designer_details?.date_of_birth || "");
      setTimeout(() => workspace.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestDetails = async () => {
    if (!record) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await request(`${record.id}/request-details/`, {});
      if (res?.token) {
        const link = `${window.location.origin}/designer-kyc-details#${res.token}`;
        setGeneratedLink(link);
      }
      setMessage("KYC request notification sent to designer's portal. Direct submission link is also generated below.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const check = async () => {
    if (!record) return;
    if (!consent) {
      setError("Please confirm the designer consent authorization before proceeding with the PAN check.");
      return;
    }
    if (!data.provider_configured) {
      setError("APITXT KYC engine is not connected on the backend. The administrator must configure APITXT before live verification can run.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    setConfirmed(false);
    try {
      const result = await request(`${record.id}/check/`, {
        action: "pan",
        consent,
        pan_number: pan.toUpperCase(),
        pan_name: panName.trim(),
        pan_dob: panDob,
      });
      setRecord(result);
      setMessage("Official PAN check passed successfully. Reconcile returned credentials in Step 3 before completing approval.");
    } catch (err) {
      setError(err.message);
      try {
        const latest = await request();
        setData(latest);
        setRecord(latest.submissions.find((item) => item.id === record.id) || record);
      } catch { }
    } finally {
      setBusy(false);
    }
  };

  const finish = async (decision) => {
    if (!record) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(`${record.id}/confirm/`, {
        decision,
        notes,
        details_confirmed: confirmed,
      });
      setSelected(null);
      setRecord(null);
      setMessage(
        decision === "VERIFIED"
          ? "Designer KYC verified successfully. Official PAN validation and identity review complete."
          : "KYC marked as Needs Correction. Notice and review notes recorded."
      );
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Calculations & Queue Filtering
  const unverified = useMemo(
    () => data.designers.filter((designer) => designer.kyc_status !== "VERIFIED"),
    [data.designers]
  );

  const pendingCount = useMemo(
    () => unverified.filter((item) => item.kyc_status === "PENDING").length,
    [unverified]
  );

  const rejectedCount = useMemo(
    () => unverified.filter((item) => item.kyc_status === "REJECTED").length,
    [unverified]
  );

  const verifiedCount = useMemo(
    () => data.designers.length - unverified.length,
    [data.designers, unverified]
  );

  const queue = useMemo(() => {
    let list = data.designers;
    if (filter === "All unverified") {
      list = unverified;
    } else if (filter === "PENDING") {
      list = data.designers.filter((d) => d.kyc_status === "PENDING");
    } else if (filter === "REJECTED") {
      list = data.designers.filter((d) => d.kyc_status === "REJECTED");
    } else if (filter === "VERIFIED") {
      list = data.designers.filter((d) => d.kyc_status === "VERIFIED");
    }

    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((d) =>
      `${d.designer_name} ${d.brand_name} ${d.owner_name} ${d.phone} ${d.email} ${d.city}`
        .toLowerCase()
        .includes(q)
    );
  }, [data.designers, unverified, filter, query]);

  // Comparison Matrix Data
  const submittedDetails = record?.api_checks?.designer_details;
  const panResult = record?.api_checks?.pan;
  const ownerName = selected?.owner_name || selected?.designer_name || "";
  const panChecked = panResult?.verified === true;

  const namesMatch =
    panChecked &&
    normalizedName(submittedDetails?.name || record?.holder_name || ownerName) ===
    normalizedName(panResult.name);

  const returnedBirthDates = [
    panResult?.date_of_birth,
    panResult?.submitted_date_of_birth,
    submittedDetails?.date_of_birth,
  ].filter(Boolean);

  const dobMatch = new Set(returnedBirthDates).size <= 1;
  const numbersMatch = !submittedDetails?.pan || submittedDetails.pan === record?.pan_number;
  const allCriteriaMatch = Boolean(namesMatch && dobMatch && numbersMatch);
  const readyToApprove = Boolean(allCriteriaMatch && confirmed && consent && panChecked);

  const panFormatValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase());
  const canRunPanCheck =
    !busy &&
    consent &&
    panName.trim().length >= 2 &&
    panDob &&
    panFormatValid;

  return (
    <main className="kyc-page-container">
      {/* 1. HERO BANNER */}
      <header className="kyc-hero-banner">
        <div className="kyc-banner-content">
          <span className="kyc-hero-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            LAYER 17 · COMPLIANCE DESK
          </span>
          <h1 className="kyc-hero-title">Designer KYC Verification</h1>
          <p className="kyc-hero-subtitle">
            Enterprise identity reconciliation: Call the designer, verify PAN via APITXT Government Gateway, and audit credentials for approval.
          </p>
        </div>

        <div className="kyc-banner-status-pill">
          <span className={`kyc-status-indicator ${data.provider_configured ? "online" : "offline"}`} />
          <span>{data.provider_configured ? "APITXT Engine Live" : "APITXT Standby"}</span>
        </div>

        <img src={bannerImg} alt="Zenve Fashion Atelier" className="kyc-banner-bg-img" />
      </header>

      {/* 2. KPI SUMMARY METRIC CARDS (CLICKABLE FILTERS) */}
      <section className="kyc-kpi-grid">
        <div
          className={`kyc-kpi-card ${filter === "All unverified" ? "active" : ""}`}
          onClick={() => setFilter("All unverified")}
          title="Click to filter by unverified designers"
        >
          <div className="kyc-kpi-info">
            <span className="kyc-kpi-label">Unverified Queue</span>
            <span className="kyc-kpi-value">{unverified.length}</span>
            <span className="kyc-kpi-subtext">Awaiting clearance</span>
          </div>
          <div className="kyc-kpi-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
        </div>

        <div
          className={`kyc-kpi-card ${filter === "PENDING" ? "active" : ""}`}
          onClick={() => setFilter("PENDING")}
          title="Click to filter by pending verification"
        >
          <div className="kyc-kpi-info">
            <span className="kyc-kpi-label">Pending Review</span>
            <span className="kyc-kpi-value">{pendingCount}</span>
            <span className="kyc-kpi-subtext">Submissions in progress</span>
          </div>
          <div className="kyc-kpi-icon-wrap pending">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
        </div>

        <div
          className={`kyc-kpi-card ${filter === "REJECTED" ? "active" : ""}`}
          onClick={() => setFilter("REJECTED")}
          title="Click to filter by needs correction"
        >
          <div className="kyc-kpi-info">
            <span className="kyc-kpi-label">Needs Correction</span>
            <span className="kyc-kpi-value">{rejectedCount}</span>
            <span className="kyc-kpi-subtext">Discrepancy flagged</span>
          </div>
          <div className="kyc-kpi-icon-wrap rejected">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        </div>

        <div
          className={`kyc-kpi-card ${filter === "VERIFIED" ? "active" : ""}`}
          onClick={() => setFilter("VERIFIED")}
          title="Click to filter by KYC verified designers"
        >
          <div className="kyc-kpi-info">
            <span className="kyc-kpi-label">KYC Verified</span>
            <span className="kyc-kpi-value">{verifiedCount}</span>
            <span className="kyc-kpi-subtext">Cleared & active</span>
          </div>
          <div className="kyc-kpi-icon-wrap verified">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>
      </section>

      {/* 3. VISUAL 3-STAGE WORKFLOW STEPPER */}
      <section className="kyc-stepper-container">
        <div className={`kyc-step-item ${selected ? "completed" : "active"}`}>
          <div className="kyc-step-badge">01</div>
          <div className="kyc-step-content">
            <span className="kyc-step-title">Call & Request Details</span>
            <span className="kyc-step-desc">Contact designer & generate submission token</span>
          </div>
        </div>

        <div className={`kyc-step-item ${panChecked ? "completed" : selected ? "active" : ""}`}>
          <div className="kyc-step-badge">02</div>
          <div className="kyc-step-content">
            <span className="kyc-step-title">APITXT PAN Check</span>
            <span className="kyc-step-desc">Confirm consent & check official PAN record</span>
          </div>
        </div>

        <div className={`kyc-step-item ${panChecked && allCriteriaMatch ? "active" : ""}`}>
          <div className="kyc-step-badge">03</div>
          <div className="kyc-step-content">
            <span className="kyc-step-title">3-Way Match & Approve</span>
            <span className="kyc-step-desc">Reconcile profile, PAN & grant clearance</span>
          </div>
        </div>
      </section>

      {/* Alerts & Messages */}
      {!data.provider_configured && (
        <div className="kyc-notice-box warning" role="alert">
          <svg className="kyc-notice-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>APITXT Integration Standby:</strong> Live PAN API credentials are not yet configured on the backend environment. You can review designer profiles, initiate phone verification, and prepare records. Final API calls will activate once the provider key is configured.
          </div>
        </div>
      )}

      {error && (
        <div className="kyc-notice-box danger" role="alert">
          <svg className="kyc-notice-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="kyc-notice-box success" role="status">
          <svg className="kyc-notice-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{message}</span>
        </div>
      )}

      {/* 4. QUEUE CONTROLS & FILTER BAR */}
      <div className="kyc-controls-card">
        <div className="kyc-search-wrap">
          <svg className="kyc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            className="kyc-search-input"
            type="search"
            aria-label="Search unverified designers"
            placeholder="Search by brand name, designer, owner, mobile, or city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="kyc-filter-group">
          <select
            className="kyc-select-styled"
            aria-label="Filter status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All unverified">Queue: All Unverified</option>
            <option value="PENDING">Status: Pending Review</option>
            <option value="REJECTED">Status: Needs Correction</option>
            <option value="VERIFIED">Status: KYC Verified</option>
            <option value="ALL">All Designers in Registry</option>
          </select>

          <button
            className="kyc-btn-secondary"
            disabled={busy || loading}
            onClick={load}
            title="Refresh queue data"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 5. UNVERIFIED QUEUE TABLE */}
      <section className="kyc-table-panel">
        <div className="kyc-table-header">
          <h2 className="kyc-table-title">
            <span>Designer Verification Registry</span>
            <span className="kyc-table-count-badge">{queue.length} Designers</span>
          </h2>
        </div>

        <div className="kyc-table-scroll">
          <table className="kyc-table">
            <thead>
              <tr>
                <th>Designer / Brand</th>
                <th>Registered Owner</th>
                <th>Contact Details</th>
                <th>Location</th>
                <th>KYC Status</th>
                <th style={{ textAlign: "right" }}>Compliance Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((designer) => {
                const initials = (designer.brand_name || designer.designer_name || "ZF")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isSelected = selected?.id === designer.id;

                return (
                  <tr
                    key={designer.id}
                    className={isSelected ? "selected" : ""}
                  >
                    <td>
                      <div className="kyc-brand-cell">
                        <div className="kyc-brand-avatar">{initials}</div>
                        <div className="kyc-brand-info">
                          <strong>{designer.brand_name || "Brand Unnamed"}</strong>
                          <span>{designer.designer_name}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#8d551b" }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>{designer.owner_name || designer.designer_name}</span>
                      </div>
                    </td>

                    <td>
                      <div className="kyc-contact-cell">
                        {designer.phone ? (
                          <a
                            className="kyc-phone-link"
                            href={`tel:${designer.phone.replace(/[^+0-9]/g, "")}`}
                            title="Click to dial mobile"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span>{designer.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>No phone</span>
                        )}
                        <span className="kyc-email-text">{designer.email}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#6d5134" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{designer.city || "—"}</span>
                      </div>
                    </td>

                    <td>
                      {designer.kyc_status === "VERIFIED" ? (
                        <span className="kyc-badge verified">
                          <span className="kyc-badge-dot" />
                          <span>KYC Verified</span>
                        </span>
                      ) : designer.kyc_status === "REJECTED" ? (
                        <span className="kyc-badge rejected">
                          <span className="kyc-badge-dot" />
                          <span>Needs Correction</span>
                        </span>
                      ) : (
                        <span className="kyc-badge pending">
                          <span className="kyc-badge-dot" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        className="kyc-action-btn"
                        disabled={busy}
                        onClick={() => openDesigner(designer)}
                      >
                        <span>{isSelected ? "Active Desk" : "Call & Verify"}</span>
                        <span>→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!queue.length && (
          <div className="kyc-empty-state">
            <div className="kyc-empty-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3 className="kyc-empty-title">No Designers Found</h3>
            <p className="kyc-empty-desc">
              {query
                ? `No designers match your search query "${query}".`
                : unverified.length
                  ? "No designers match the selected status filter."
                  : "All designers in your registry are currently KYC verified."}
            </p>
          </div>
        )}
      </section>

      {/* 6. ENTERPRISE VERIFICATION WORKSPACE DESK */}
      {selected && (
        <section
          ref={workspace}
          className="kyc-workspace"
          aria-label="Selected designer verification desk"
        >
          {/* Workspace Top Bar */}
          <div className="kyc-workspace-topbar">
            <div className="kyc-workspace-profile">
              <div className="kyc-workspace-avatar">
                {(selected.brand_name || selected.designer_name || "ZF")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="kyc-workspace-title-box">
                <span className="kyc-workspace-eyebrow">COMPLIANCE WORKSPACE</span>
                <h2 className="kyc-workspace-brand">
                  {selected.brand_name} · {selected.designer_name}
                </h2>
                <p className="kyc-workspace-meta">
                  Registered Owner: <strong>{ownerName}</strong> &nbsp;·&nbsp; City:{" "}
                  <strong>{selected.city || "City not provided"}</strong>
                </p>
              </div>
            </div>

            <div className="kyc-workspace-actions">
              {selected.phone && (
                <>
                  <a
                    className="kyc-btn-call"
                    href={`tel:${selected.phone.replace(/[^+0-9]/g, "")}`}
                    title="Start phone call with designer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>Call {selected.phone}</span>
                  </a>

                  <a
                    className="kyc-btn-whatsapp"
                    href={`https://wa.me/${selected.phone.replace(/[^+0-9]/g, "")}?text=${encodeURIComponent(`Hello ${ownerName}, this is Zenve Fashion Compliance Desk regarding your KYC verification.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open WhatsApp chat with designer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                </>
              )}

              <button
                className="kyc-btn-close"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setRecord(null);
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {!record ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#8d551b", fontWeight: "600", fontSize: "14px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>{busy ? "Loading verification record..." : "Initializing compliance desk..."}</span>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 01: OUTREACH & SUBMISSION TRACKING */}
              <div className="kyc-outreach-card">
                <div className="kyc-outreach-info">
                  <div className="kyc-outreach-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#8d551b" }}>
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <span>Step 01: Request Self-Service Submission</span>
                  </div>
                  <p className="kyc-outreach-desc">
                    Send a push notification to the designer’s portal dashboard or share a secure direct link so they can submit their PAN details from mobile or desktop.
                  </p>

                  {submittedDetails && (
                    <div className="kyc-submission-preview">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>
                        <strong>Details Submitted:</strong> Name: <em>{submittedDetails.name}</em> &nbsp;·&nbsp; DOB: <em>{submittedDetails.date_of_birth}</em> &nbsp;·&nbsp; PAN: <em>{submittedDetails.pan}</em>
                      </span>
                    </div>
                  )}
                </div>

                <div className="kyc-outreach-actions">
                  <button
                    className="kyc-btn-outreach"
                    disabled={busy}
                    onClick={requestDetails}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>Send Portal Notification</span>
                  </button>

                  {generatedLink && (
                    <button
                      className="kyc-btn-copy-link"
                      onClick={() => copyToClipboard(generatedLink)}
                      title="Copy direct verification link to clipboard"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span>{copiedLink ? "✓ Link Copied!" : "Copy Secure Link"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* COMPLIANCE CONSENT DECLARATION */}
              <div className={`kyc-consent-card ${consent ? "checked" : ""}`}>
                <input
                  id="kyc-staff-consent"
                  type="checkbox"
                  className="kyc-consent-checkbox"
                  checked={consent}
                  disabled={busy}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <label htmlFor="kyc-staff-consent" className="kyc-consent-text" style={{ cursor: "pointer" }}>
                  <strong>Compliance Authorization Acknowledgment:</strong> I confirm that our team has contacted designer <strong>{ownerName}</strong> and received explicit consent to verify their Permanent Account Number (PAN) credentials via the authorized APITXT identity gateway.
                  <span className="kyc-consent-sub">
                    {!consent
                      ? "Mandatory: Acknowledge consent above to unlock the APITXT PAN verification engine."
                      : "✓ Consent acknowledged and timestamped for audit trail."}
                  </span>
                </label>
              </div>

              {/* STEP 02: PAN VERIFICATION ENGINE FORM */}
              <div className="kyc-form-card">
                <div className="kyc-section-header">
                  <span className="kyc-section-eyebrow">STEP 02</span>
                  <h3 className="kyc-section-title">APITXT Government PAN Verification</h3>
                </div>

                <div className="kyc-form-grid-3">
                  {/* Name as per PAN */}
                  <div className="kyc-field-group">
                    <label className="kyc-field-label">
                      <span>Full Name as per PAN</span>
                      {submittedDetails?.name && (
                        <button
                          type="button"
                          className="kyc-quick-tag"
                          style={{ padding: "2px 6px", fontSize: "10px" }}
                          onClick={() => {
                            setPanName(submittedDetails.name);
                            setConfirmed(false);
                          }}
                        >
                          Use Submitted
                        </button>
                      )}
                    </label>
                    <input
                      className="kyc-input"
                      type="text"
                      autoComplete="off"
                      maxLength={255}
                      value={panName}
                      disabled={busy}
                      onChange={(e) => {
                        setPanName(e.target.value);
                        setConfirmed(false);
                      }}
                      placeholder="Full name printed on PAN card"
                    />
                  </div>

                  {/* DOB as per PAN */}
                  <div className="kyc-field-group">
                    <label className="kyc-field-label">
                      <span>Date of Birth (as per PAN)</span>
                      {submittedDetails?.date_of_birth && (
                        <button
                          type="button"
                          className="kyc-quick-tag"
                          style={{ padding: "2px 6px", fontSize: "10px" }}
                          onClick={() => {
                            setPanDob(submittedDetails.date_of_birth);
                            setConfirmed(false);
                          }}
                        >
                          Use Submitted
                        </button>
                      )}
                    </label>
                    <input
                      className="kyc-input"
                      type="date"
                      value={panDob}
                      max={new Date().toISOString().slice(0, 10)}
                      disabled={busy}
                      onChange={(e) => {
                        setPanDob(e.target.value);
                        setConfirmed(false);
                      }}
                    />
                  </div>

                  {/* PAN Number */}
                  <div className="kyc-field-group">
                    <label className="kyc-field-label">
                      <span>PAN Number</span>
                      <span className="kyc-field-helper" style={{ color: pan && !panFormatValid ? "#b91c1c" : undefined }}>
                        {pan ? (panFormatValid ? "✓ Valid Format" : "Format: ABCDE1234F") : "10 Chars"}
                      </span>
                    </label>
                    <input
                      className="kyc-input pan-input"
                      type="text"
                      autoComplete="off"
                      maxLength={10}
                      value={pan}
                      disabled={busy}
                      onChange={(e) => {
                        setPan(e.target.value.toUpperCase());
                        setConfirmed(false);
                      }}
                      placeholder="ABCDE1234F"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <button
                    className="kyc-btn-api-check"
                    disabled={!canRunPanCheck}
                    onClick={check}
                  >
                    {busy ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <span>Querying APITXT Engine...</span>
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>Check PAN with APITXT Engine</span>
                      </>
                    )}
                  </button>

                  <span style={{ fontSize: "11px", color: "#847563" }}>
                    {!consent
                      ? "Requires consent checkbox acknowledgment above."
                      : !panFormatValid
                        ? "Enter 10-character alphanumeric PAN format."
                        : "Ready to query Income Tax Department records."}
                  </span>
                </div>

                {/* API Check Success Banner */}
                {panResult?.verified && (
                  <div className="kyc-verified-banner">
                    <div className="kyc-verified-banner-left">
                      <div className="kyc-verified-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <div className="kyc-verified-title">
                          Official APITXT Validation Passed
                        </div>
                        <div className="kyc-verified-meta">
                          Income Tax Record Name: <strong>{panResult.name}</strong> &nbsp;·&nbsp; Checked At:{" "}
                          {panResult.checked_at ? new Date(panResult.checked_at).toLocaleString() : "Just now"}
                        </div>
                      </div>
                    </div>

                    {panResult.reference && (
                      <span className="kyc-verified-ref-badge" title="Provider Audit Reference">
                        REF: {panResult.reference}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* STEP 03: 3-WAY IDENTITY RECONCILIATION MATRIX */}
              <div className="kyc-matrix-card">
                <div className="kyc-matrix-header">
                  <h3 className="kyc-matrix-title">
                    Step 03: 3-Way Identity Audit & Reconciliation
                  </h3>
                  <span style={{ fontSize: "12px", color: "#847563" }}>
                    CRM Registered vs. Designer Submitted vs. APITXT Official
                  </span>
                </div>

                <div className="kyc-table-scroll">
                  <table className="kyc-matrix-table">
                    <thead>
                      <tr>
                        <th className="kyc-matrix-col-field">Verification Field</th>
                        <th className="kyc-matrix-col-data">1. Registered Profile</th>
                        <th className="kyc-matrix-col-data">2. Designer Submitted</th>
                        <th className="kyc-matrix-col-data">3. APITXT Government Record</th>
                        <th className="kyc-matrix-col-status">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: Holder Name */}
                      <tr>
                        <td className="kyc-matrix-col-field">Owner / Holder Name</td>
                        <td className="kyc-matrix-col-data">
                          <strong>{ownerName}</strong>
                        </td>
                        <td className="kyc-matrix-col-data">
                          {submittedDetails?.name ? (
                            <span>{submittedDetails.name}</span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting designer submission</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-data">
                          {panResult?.name ? (
                            <strong style={{ color: "#047857" }}>{panResult.name}</strong>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting PAN check</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-status">
                          {!panChecked ? (
                            <span className="kyc-match-pill waiting">Pending</span>
                          ) : namesMatch ? (
                            <span className="kyc-match-pill matched">Match ✓</span>
                          ) : (
                            <span className="kyc-match-pill mismatched">Mismatch ✕</span>
                          )}
                        </td>
                      </tr>

                      {/* Row 2: Date of Birth */}
                      <tr>
                        <td className="kyc-matrix-col-field">Date of Birth</td>
                        <td className="kyc-matrix-col-data" style={{ color: "#9ca3af" }}>
                          — (Not in CRM)
                        </td>
                        <td className="kyc-matrix-col-data">
                          {submittedDetails?.date_of_birth ? (
                            <span>{submittedDetails.date_of_birth}</span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting designer submission</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-data">
                          {panResult?.date_of_birth || panResult?.submitted_date_of_birth ? (
                            <span>{panResult.date_of_birth || panResult.submitted_date_of_birth}</span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting PAN check</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-status">
                          {!panChecked ? (
                            <span className="kyc-match-pill waiting">Pending</span>
                          ) : dobMatch ? (
                            <span className="kyc-match-pill matched">Match ✓</span>
                          ) : (
                            <span className="kyc-match-pill mismatched">Mismatch ✕</span>
                          )}
                        </td>
                      </tr>

                      {/* Row 3: PAN Number */}
                      <tr>
                        <td className="kyc-matrix-col-field">PAN Number</td>
                        <td className="kyc-matrix-col-data" style={{ color: "#9ca3af" }}>
                          — (Initial registration)
                        </td>
                        <td className="kyc-matrix-col-data">
                          {submittedDetails?.pan ? (
                            <span style={{ fontFamily: "monospace", fontWeight: "700" }}>
                              {submittedDetails.pan}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Awaiting designer submission</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-data">
                          {record.pan_number ? (
                            <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#047857" }}>
                              {record.pan_number}
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Not queried</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-status">
                          {!panChecked ? (
                            <span className="kyc-match-pill waiting">Pending</span>
                          ) : numbersMatch ? (
                            <span className="kyc-match-pill matched">Match ✓</span>
                          ) : (
                            <span className="kyc-match-pill mismatched">Mismatch ✕</span>
                          )}
                        </td>
                      </tr>

                      {/* Row 4: Gateway Verification Status */}
                      <tr>
                        <td className="kyc-matrix-col-field">Verification Engine</td>
                        <td className="kyc-matrix-col-data">
                          <span className="kyc-badge pending">CRM Pending</span>
                        </td>
                        <td className="kyc-matrix-col-data">
                          {submittedDetails ? (
                            <span className="kyc-badge verified">Details Received</span>
                          ) : (
                            <span className="kyc-badge pending">Awaiting</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-data">
                          {panResult?.verified ? (
                            <span className="kyc-badge verified">APITXT Passed</span>
                          ) : (
                            <span className="kyc-badge pending">Pending Check</span>
                          )}
                        </td>
                        <td className="kyc-matrix-col-status">
                          {panResult?.verified ? (
                            <span className="kyc-match-pill matched">Passed ✓</span>
                          ) : (
                            <span className="kyc-match-pill waiting">Pending</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Audit Result Banner */}
                {panChecked && (
                  <div className={`kyc-audit-alert ${allCriteriaMatch ? "pass" : "fail"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {allCriteriaMatch ? (
                        <polyline points="20 6 9 17 4 12"></polyline>
                      ) : (
                        <circle cx="12" cy="12" r="10"></circle>
                      )}
                    </svg>
                    <span>
                      {allCriteriaMatch
                        ? "Reconciliation Complete: Submitted identity details match the verified APITXT government PAN record. Ready for staff audit confirmation."
                        : "Discrepancy Detected: The designer's submitted name, birth date, or PAN number does not match the APITXT result. Record review notes and reject for correction."}
                    </span>
                  </div>
                )}
              </div>

              {/* STEP 04: DECISION & COMPLIANCE REVIEW DESK */}
              <div className="kyc-decision-card">
                <div className="kyc-section-header">
                  <span className="kyc-section-eyebrow">STEP 04</span>
                  <h3 className="kyc-section-title">Compliance Decision & Audit Log</h3>
                </div>

                {/* Quick Preset Tags for Review Notes */}
                <div style={{ marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#6d5134", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    Quick Notes Presets:
                  </span>
                </div>
                <div className="kyc-quick-tags">
                  {[
                    "Verified 100% · All credentials match official PAN record.",
                    "Name spelling discrepancy on PAN card. Correction required.",
                    "Date of birth mismatch against Income Tax records.",
                    "Designer provided incorrect PAN number.",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="kyc-quick-tag"
                      disabled={busy}
                      onClick={() => setNotes(preset)}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <div className="kyc-field-group" style={{ marginBottom: "18px" }}>
                  <label className="kyc-field-label">
                    <span>Audit Review / Correction Notes</span>
                    <span className="kyc-field-helper">Required when rejecting</span>
                  </label>
                  <textarea
                    className="kyc-notes-textarea"
                    value={notes}
                    disabled={busy}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record notes from the designer call, discrepancy details, or compliance confirmation notes..."
                  />
                </div>

                {/* Staff Confirmation Checkbox */}
                <div className={`kyc-consent-card ${confirmed ? "checked" : ""}`} style={{ marginBottom: "20px" }}>
                  <input
                    id="kyc-staff-confirm"
                    type="checkbox"
                    className="kyc-consent-checkbox"
                    checked={confirmed}
                    disabled={busy || !allCriteriaMatch}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <label htmlFor="kyc-staff-confirm" className="kyc-consent-text" style={{ cursor: allCriteriaMatch ? "pointer" : "not-allowed" }}>
                    <strong>Staff Audit Declaration:</strong> I have personally inspected and compared the registered designer profile, the designer's submitted credentials, and the official APITXT government PAN result.
                    <span className="kyc-consent-sub">
                      {!allCriteriaMatch
                        ? "Locked: All 3 identity checkpoints (Name, DOB, PAN) must match before confirmation can be declared."
                        : "Unlocked: Tick to confirm audit and enable final verification approval."}
                    </span>
                  </label>
                </div>

                {/* Real-time Checklist Bar */}
                <div className="kyc-checklist-bar">
                  <span className={`kyc-check-chip ${consent ? "done" : "pending"}`}>
                    {consent ? "✓ Consent Confirmed" : "○ Consent Pending"}
                  </span>
                  <span>·</span>
                  <span className={`kyc-check-chip ${panChecked ? "done" : "pending"}`}>
                    {panChecked ? "✓ PAN Check Passed" : "○ PAN Check Pending"}
                  </span>
                  <span>·</span>
                  <span className={`kyc-check-chip ${allCriteriaMatch ? "done" : "pending"}`}>
                    {allCriteriaMatch ? "✓ 3-Way Match Reconciled" : "○ Identity Reconciled"}
                  </span>
                  <span>·</span>
                  <span className={`kyc-check-chip ${confirmed ? "done" : "pending"}`}>
                    {confirmed ? "✓ Staff Audit Declared" : "○ Staff Audit Pending"}
                  </span>
                </div>

                {/* Decision Actions */}
                <div className="kyc-decision-actions">
                  <button
                    className="kyc-btn-approve"
                    disabled={
                      busy ||
                      !readyToApprove ||
                      pan !== record.pan_number ||
                      panName.trim() !== record.holder_name ||
                      panDob !== panResult?.submitted_date_of_birth
                    }
                    onClick={() => finish("VERIFIED")}
                    title={
                      !readyToApprove
                        ? "Complete all 4 checklist requirements to approve KYC"
                        : "Confirm designer KYC verification and activate account"
                    }
                  >
                    {busy ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        <span>Processing Clearance...</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Approve & Verify Designer KYC</span>
                      </>
                    )}
                  </button>

                  <button
                    className="kyc-btn-reject"
                    disabled={busy || !notes.trim()}
                    onClick={() => finish("REJECTED")}
                    title={!notes.trim() ? "Enter review notes before rejecting" : "Mark as Needs Correction"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    <span>Reject / Request Corrections</span>
                  </button>
                </div>

                <small className="kyc-legal-disclaimer">
                  * Note: Official KYC verification grants clearance to the designer account, unlocking inventory publishing, storefront catalog sync, and financial payout disbursements. An audit record is stored permanently.
                </small>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
