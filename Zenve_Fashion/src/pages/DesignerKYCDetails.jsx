import React, { useEffect, useState } from "react";
import { getAccessToken } from "../services/authApi";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import "../styles/DesignerKYC.css";
export default function DesignerKYCDetails({ authenticated = false }) {
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => { window.history.replaceState(null, "", window.location.pathname); }, []);
  const [form, setForm] = useState({ name: "", pan: "", dob: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/designers/kyc/${authenticated ? "my-details" : "requested-details"}/`, { method: "POST", headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: `Bearer ${getAccessToken() || localStorage.getItem("access_token") || ""}` } : {}) }, body: JSON.stringify({ token, ...form }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.detail || "Unable to send details.");
      setDone(result.detail); setForm({ name: "", pan: "", dob: "", consent: false });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="kyc-page" style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}><h1>Designer KYC details</h1><p>Your verification has started. These details help the team verify your identity for your designer account.</p>{done ? <div><p role="status">{done}</p><Link to="/designer-portal">Return to designer portal</Link></div> : !authenticated && !token ? <p role="alert">Open the request link sent by your verification team. If you refreshed this page, reopen that link.</p> : <form className="kyc-call-workspace" onSubmit={submit}>{error && <p role="alert">{error}</p>}{[["name", "Name as printed on PAN", "text"], ["dob", "Date of birth", "date"], ["pan", "PAN number", "text"]].map(([key, label, type]) => <label key={key} style={{ display: "block", marginBottom: 16 }}>{label}<input required type={type} maxLength={key === "pan" ? 10 : 255} pattern={key === "pan" ? "[A-Z]{5}[0-9]{4}[A-Z]" : undefined} max={key === "dob" ? new Date().toISOString().slice(0, 10) : undefined} autoComplete="off" value={form[key]} disabled={busy} onChange={(e) => setForm({ ...form, [key]: key === "pan" ? e.target.value.toUpperCase() : e.target.value })} /></label>)}<label><input type="checkbox" required checked={form.consent} disabled={busy} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /> I consent to identity verification using these details.</label><p>Only your PAN name, date of birth and PAN number are required for KYC.</p><button disabled={busy}>{busy ? "Sending..." : "Send details securely"}</button></form>}</main>;
}
