import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../services/api";
import { getAccessToken } from "../services/authApi";
import { useDataLoading } from "../components/DataLoading";
import bannerImg from "../assets/accounting-banner.jpg";
import "../styles/DesignerCrm.css";
import "../styles/RequestsNotifications.css";
import "../styles/DesignerKYC.css";

const normalizedName = (name) => String(name || "").toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, " ").trim();

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
  const [pan, setPan] = useState("");
  const [panName, setPanName] = useState("");
  const [panDob, setPanDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const workspace = useRef(null);
  useDataLoading(loading);
  const request = async (path = "", body) => {
    const response = await fetch(`${API_BASE_URL}/designers/kyc/${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken() || localStorage.getItem("access_token") || ""}` },
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
          if (details) { setPan(details.pan || ""); setPanName(details.name || ""); setPanDob(details.date_of_birth || ""); setConfirmed(false); }
        }
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const openDesigner = async (designer) => {
    setSelected(designer); setRecord(null); setPan(""); 
    setPanName(designer.owner_name || designer.designer_name || "");
    setPanDob("");
    setConsent(false); setConfirmed(false); setNotes(""); setError(""); setMessage(""); setBusy(true);
    try {
      const result = await request(`designer/${designer.id}/start/`, {});
      setRecord(result); setPan(result.api_checks?.designer_details?.pan || result.pan_number || "");
      setPanName(result.api_checks?.designer_details?.name || designer.owner_name || designer.designer_name || "");
      setPanDob(result.api_checks?.designer_details?.date_of_birth || "");
      setTimeout(() => workspace.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const requestDetails = async () => {
    setBusy(true); setError("");
    try {
      await request(`${record.id}/request-details/`, {});
      setMessage("KYC request sent to the designer's portal notifications. They can sign in and submit their details.");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const check = async () => {
    if (!record) return;
    if (!consent) {
      setError("Tick the designer consent checkbox before checking PAN.");
      return;
    }
    if (!data.provider_configured) {
      setError("APITXT KYC is not connected on the backend. The administrator must configure the PAN API integration before verification can run.");
      return;
    }
    setBusy(true); setError(""); setMessage(""); setConfirmed(false);
    try {
      const result = await request(`${record.id}/check/`, { action: "pan", consent, pan_number: pan, pan_name: panName.trim(), pan_dob: panDob });
      setRecord(result); setMessage("PAN verified. Compare the designer's submitted details below before approval.");
    } catch (err) {
      setError(err.message);
      // A new attempt invalidates previous evidence; refresh the persisted state.
      try { const latest = await request(); setData(latest); setRecord(latest.submissions.find((item) => item.id === record.id) || record); } catch {}
    } finally { setBusy(false); }
  };
  const finish = async (decision) => {
    setBusy(true); setError(""); setMessage("");
    try {
      await request(`${record.id}/confirm/`, { decision, notes, details_confirmed: confirmed });
      setSelected(null); setRecord(null); 
      setMessage(decision === "VERIFIED" ? "Designer KYC verified. PAN verification and the identity review are complete." : "KYC rejected with your review notes.");
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const unverified = data.designers.filter((designer) => designer.kyc_status !== "VERIFIED");
  const queue = unverified.filter((designer) => (filter === "All unverified" || designer.kyc_status === filter) && `${designer.designer_name} ${designer.brand_name} ${designer.owner_name} ${designer.phone}`.toLowerCase().includes(query.toLowerCase()));
  const submittedDetails = record?.api_checks?.designer_details;
  const panResult = record?.api_checks?.pan;
  const ownerName = selected?.owner_name || selected?.designer_name || "";
  const bothChecked = panResult?.verified === true;
  const namesMatch = bothChecked && normalizedName(submittedDetails?.name || record?.holder_name || ownerName) === normalizedName(panResult.name);
  const returnedBirthDates = [panResult?.date_of_birth, panResult?.submitted_date_of_birth, submittedDetails?.date_of_birth].filter(Boolean);
  const dobMatch = new Set(returnedBirthDates).size <= 1;
  const numbersMatch = (!submittedDetails?.pan || submittedDetails.pan === record?.pan_number);
  const ready = Boolean(namesMatch && dobMatch && numbersMatch && confirmed);
  return <main className="requests-page kyc-page">
    <header className="crm-hero-banner"><div className="crm-banner-content"><span className="requests-eyebrow">17 · VERIFICATION TEAM</span><h1 className="crm-hero-title">Designer KYC Verification</h1><p className="crm-hero-subtitle">Call the designer. Verify PAN. Confirm the details.</p></div><img src={bannerImg} alt="" className="crm-banner-bg-img" /></header>
    <section className="crm-kpi-cards-grid requests-summary">{[
      ["Unverified Designers", unverified.length], ["Pending Verification", unverified.filter((item) => item.kyc_status === "PENDING").length],
      ["Needs Correction", unverified.filter((item) => item.kyc_status === "REJECTED").length], ["KYC Verified", data.designers.length - unverified.length],
    ].map(([label, value]) => <div className="crm-kpi-card" key={label}><div className="crm-kpi-text-block"><span className="crm-kpi-title">{label}</span><strong className="crm-kpi-number">{value}</strong></div></div>)}</section>
    <div className="kyc-workflow-steps"><span>01 · Call designer</span><span>02 · Check PAN</span><span>03 · Compare & confirm</span></div>
    {!data.provider_configured && <p className="kyc-notice">APITXT verification is not connected yet. You can view and call designers; identity checks and final verification will remain unavailable until the service is connected.</p>}
    {error && <p role="alert" className="requests-error">{error}</p>}{message && <p role="status" className="kyc-notice">{message}</p>}
    <div className="requests-controls"><input aria-label="Search unverified designers" placeholder="Search designer, brand, owner or mobile" value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Verification status" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All unverified</option><option value="PENDING">Pending</option><option value="REJECTED">Needs correction</option></select><button disabled={busy} onClick={load}>Refresh</button></div>
    <section className="requests-table-panel"><div className="requests-table-heading"><h2>Unverified designer queue</h2><span>{queue.length} designers</span></div><div className="requests-table-scroll"><table className="requests-table"><thead><tr><th>Designer / Brand</th><th>Registered Owner</th><th>Contact</th><th>City</th><th>KYC Status</th><th>Action</th></tr></thead><tbody>{queue.map((designer) => <tr key={designer.id} className={selected?.id === designer.id ? "kyc-selected-row" : ""}><td><strong>{designer.brand_name}</strong><p className="request-subject">{designer.designer_name}</p></td><td>{designer.owner_name || designer.designer_name}</td><td>{designer.phone ? <a className="kyc-phone" href={`tel:${designer.phone.replace(/[^+0-9]/g, "")}`}>{designer.phone}</a> : "No mobile number"}<p className="request-subject">{designer.email}</p></td><td>{designer.city || "—"}</td><td><span className="request-status pending">{designer.kyc_status === "REJECTED" ? "Needs correction" : "Not verified"}</span></td><td><button disabled={busy} onClick={() => openDesigner(designer)}>Call & Verify →</button></td></tr>)}</tbody></table></div>{!queue.length && <div className="requests-empty">{unverified.length ? "No designers match your filters." : "All designers are KYC verified."}</div>}</section>
    {selected && <section ref={workspace} className="kyc-call-workspace" aria-label="Selected designer verification">
      <header className="kyc-workspace-header"><div><span className="requests-eyebrow">VERIFICATION WORKSPACE</span><h2>{selected.brand_name} · {selected.designer_name}</h2><p>{ownerName} · {selected.city || "City not provided"}</p></div><div className="request-actions">{selected.phone && <a href={`tel:${selected.phone.replace(/[^+0-9]/g, "")}`}>Call {selected.phone}</a>}<button disabled={busy} onClick={() => { setSelected(null); setRecord(null); }}>Close</button></div></header>
      {!record ? <p role="status">{busy ? "Opening verification…" : "Could not open verification. Select the designer again to retry."}</p> : <>
        <section className="kyc-notice"><strong>Request details from designer</strong><p>Explain that KYC verifies the registered owner for the designer account.</p><button disabled={busy} onClick={requestDetails}>Send KYC notification</button>{record.api_checks?.designer_details && <p role="status">Designer submitted details. PAN name and date of birth are filled below. API checks are still required.</p>}</section>
        <label className="kyc-checkbox"><input type="checkbox" checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} /> I have contacted this designer and received consent to verify PAN details through APITXT.</label>
        <p className="kyc-button-guidance" role="status">{!consent ? "First tick the consent checkbox above to enable verification." : !data.provider_configured ? "APITXT is not connected. Clicking a check button will show the setup requirement; no identity details will be sent." : "Consent confirmed. Enter valid identity details to start verification."}</p>
        <div className="kyc-review-grid"><section><span className="requests-eyebrow">STEP 02</span><h3>PAN verification</h3><p>Ask for the designer’s PAN number.</p><label>Name as per PAN<input autoComplete="off" maxLength={255} value={panName} disabled={busy} onChange={(e) => { setPanName(e.target.value); setConfirmed(false); }} placeholder="Full name printed on PAN" /></label><label>Date of birth as per PAN<input type="date" value={panDob} max={new Date().toISOString().slice(0, 10)} disabled={busy} onChange={(e) => { setPanDob(e.target.value); setConfirmed(false); }} /></label><label>PAN number<input autoComplete="off" maxLength={10} value={pan} disabled={busy} onChange={(e) => { setPan(e.target.value.toUpperCase()); setConfirmed(false); }} placeholder="ABCDE1234F" /></label><button disabled={busy || !consent || panName.trim().length < 2 || !panDob || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)} onClick={() => check("pan")}>{busy ? "Please wait…" : "Check PAN with APITXT"}</button>{panResult?.verified && <p className="kyc-check-success">API check passed · {panResult.name}</p>}</section>
        </div>
        <div className="kyc-comparison"><span className="requests-eyebrow">STEP 03</span><h3>Compare returned identity details</h3><div className="requests-table-scroll"><table className="requests-table"><thead><tr><th>Detail</th><th>Registered designer</th><th>Designer submitted details</th><th>PAN API result</th></tr></thead><tbody><tr><td>Owner / holder name</td><td>{ownerName}</td><td>{submittedDetails?.name || "Awaiting designer submission"}</td><td>{panResult?.name || "Awaiting PAN check"}</td></tr><tr><td>Date of birth</td><td>—</td><td>{submittedDetails?.date_of_birth || "Awaiting designer submission"}</td><td>{panResult?.date_of_birth || "Not returned"}</td></tr><tr><td>Identity number</td><td>—</td><td>{submittedDetails ? <>PAN: {submittedDetails.pan}</> : "Awaiting designer submission"}</td><td>{record.pan_number || "—"}</td></tr><tr><td>API verification</td><td>Not verified</td><td>{submittedDetails ? "Submitted · pending API checks" : "Not submitted"}</td><td>{panResult?.verified ? "Passed" : "Pending"}</td></tr></tbody></table></div>
        {bothChecked && <p className={namesMatch && dobMatch && numbersMatch ? "kyc-check-success" : "requests-error"}>{namesMatch && dobMatch && numbersMatch ? "Submitted details match PAN. Review to finish." : "PAN or identity numbers do not match the submitted details. Request corrections or reject with a reason."}</p>}
        <label>Review / correction notes<textarea value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} placeholder="Record any mismatches or notes from the call" /></label>
        <label className="kyc-checkbox"><input type="checkbox" checked={confirmed} disabled={busy || !namesMatch || !dobMatch || !numbersMatch} onChange={(e) => setConfirmed(e.target.checked)} /> I compared the submitted details with the verified PAN result.</label>
        <div className="request-actions"><button className="kyc-final-approve" disabled={busy || !ready || !consent || pan !== record.pan_number || panName.trim() !== record.holder_name || panDob !== panResult?.submitted_date_of_birth} onClick={() => finish("VERIFIED")}>Confirm designer KYC verified</button><button disabled={busy || !notes.trim()} onClick={() => finish("REJECTED")}>Reject / details incorrect</button></div><small>API success alone does not complete KYC. A successful PAN check, matching submitted details and staff confirmation are required.</small></div>
      </>}
    </section>}
  </main>;
}
