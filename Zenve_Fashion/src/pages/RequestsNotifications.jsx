import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import { getAccessToken } from "../services/authApi";
import bannerImg from "../assets/accounting-banner.jpg";
import "../styles/DesignerCrm.css";
import "../styles/RequestsNotifications.css";

export default function RequestsNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const request = async (options = {}) => {
    const response = await fetch(`${API_BASE_URL}/notifications/`, {
      ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAccessToken() || localStorage.getItem("access_token") || ""}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Unable to load requests and notifications.");
    return data;
  };
  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await request()); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const markRead = async (ids) => {
    setSaving(true); setError("");
    try {
      await request({ method: "POST", body: JSON.stringify({ ids }) });
      setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, read: true } : item));
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const visible = items.filter((item) =>
    (category === "All" || category === item.category) && (!unreadOnly || !item.read) &&
    `${item.title} ${item.subject} ${item.category}`.toLowerCase().includes(query.toLowerCase())
  );
  const unread = items.filter((item) => !item.read);
  return <main className="requests-page">
    <header className="crm-hero-banner requests-header">
      <div className="crm-banner-content"><span className="requests-eyebrow">16 · OPERATIONS</span><h1 className="crm-hero-title">Requests & Notifications</h1><p className="crm-hero-subtitle">Manage requests, approvals and team updates in one place.</p></div>
      <img src={bannerImg} alt="" className="crm-banner-bg-img" />
    </header>
    <section className="crm-kpi-cards-grid requests-summary" aria-label="Notification overview">
      {[
        { label: "Total Notifications", value: items.length, icon: "users", path: "M4 4h16v16H4z M8 9h8 M8 13h6" },
        { label: "Unread Notifications", value: unread.length, icon: "pending", path: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4" },
        { label: "Open Requests", value: items.filter((item) => item.status !== "Completed").length, icon: "new", path: "M12 3v9l5 3 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
        { label: "Completed Requests", value: items.filter((item) => item.status === "Completed").length, icon: "active", path: "m8 12 3 3 5-6 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
      ].map((metric) => <div className="crm-kpi-card" key={metric.label}><div className="crm-kpi-info-group"><div className={`crm-kpi-icon-wrap ${metric.icon}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={metric.path} /></svg></div><div className="crm-kpi-text-block"><span className="crm-kpi-title">{metric.label}</span><span className="crm-kpi-number">{loading ? "…" : metric.value}</span></div></div></div>)}
    </section>
    <div className="requests-controls">
      <input aria-label="Search requests" placeholder="Search designer, request or notification" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{[...new Set(items.map((item) => item.category))].sort().map((value) => <option key={value}>{value}</option>)}</select>
      <label><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Unread only</label>
      <button disabled={saving || loading || !unread.length} onClick={() => markRead(unread.map((item) => item.id))}>Mark all as read</button>
      <button className="requests-refresh" onClick={load} disabled={loading}>↻ Refresh</button>
    </div>
    {error && <p role="alert" className="requests-error">{error}</p>}
    {loading ? <p role="status">Loading requests and notifications…</p> : <>
      {!visible.length && <div className="requests-empty">{items.length ? "No requests match your filters." : "You’re all caught up. No requests or notifications to show."}</div>}
      {visible.length > 0 && <section className="requests-table-panel">
        <div className="requests-table-heading"><h2>Requests & activity</h2><span>{visible.length} records</span></div>
        <div className="requests-table-scroll"><table className="requests-table"><thead><tr><th>Request / Notification</th><th>Category</th><th>Status</th><th>Received</th><th>Actions</th></tr></thead><tbody>{visible.map((item) => <tr key={item.id} className={item.read ? "" : "unread"}>
          <td><div className="request-title">{!item.read && <span className="request-unread-dot" aria-label="Unread" />}{item.title}</div><p className="request-subject">{item.subject}</p></td>
          <td><span className="request-category">{item.category}</span></td>
          <td><span className={`request-status ${item.status === "Completed" ? "completed" : "pending"}`}>{item.status}</span><small className="request-read-label">{item.read ? "Read" : "Unread"}</small></td>
          <td className="request-date">{item.at && new Date(item.at).toLocaleString()}</td>
          <td><div className="request-actions"><Link to={item.path}>Open {item.path === "/designer-crm" ? "Designer CRM" : item.category}</Link>{!item.read && <button disabled={saving} onClick={() => markRead([item.id])}>Mark as read</button>}</div></td>
        </tr>)}</tbody></table></div>
      </section>}
    </>}
  </main>;
}
