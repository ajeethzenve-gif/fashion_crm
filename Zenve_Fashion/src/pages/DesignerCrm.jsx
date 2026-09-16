import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/DesignerCrm.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";
import {
  getDesigners,
  createDesigner,
  updateDesigner,
  getOrders,
  getProducts,
  getReturns,
  getSettlements,
} from "../services/api";

/* =========================================================
   CONSTANTS & BLUEPRINT SEQUENCE
========================================================= */

const STAGES_SEQUENCE = [
  "LEAD",
  "QUALIFIED",
  "PORTFOLIO",
  "REVIEW",
  "APPROVED",
  "CONTRACT",
  "SIGNED",
  "LIVE",
  "ACTIVE",
  "REJECTED",
];

const SALES_OWNERS = [
  "Nisha Kapoor",
  "Dev Ranganathan",
  "Sana Qureshi",
  "Unassigned",
];

const LEAD_SOURCES = [
  "Referral",
  "Outreach",
  "Inbound",
  "Instagram",
  "Trade Show",
  "Agency",
];

const LOST_REASONS = [
  "Price / take rate",
  "Exclusivity with another marketplace",
  "Capacity constraints",
  "Quality below standard",
  "Went silent",
];

function getStageTone(stage) {
  switch (stage) {
    case "ACTIVE":
    case "LIVE":
    case "SIGNED":
      return "good";
    case "APPROVED":
    case "CONTRACT":
    case "REVIEW":
      return "info";
    case "QUALIFIED":
    case "PORTFOLIO":
      return "warn";
    case "REJECTED":
    case "OFFBOARDED":
      return "bad";
    default:
      return "neutral";
  }
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      className={spinning ? "crm-spinner" : ""}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/* =========================================================
   MAIN COMPONENT: 01 DESIGNER CRM
========================================================= */

export default function DesignerCRM() {
  const [designers, setDesigners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [returns, setReturns] = useState([]);
  const [settlements, setSettlements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // New task inputs per designer
  const [taskInputs, setTaskInputs] = useState({});

  // Add lead form state (14 fields)
  const [newLead, setNewLead] = useState({
    name: "",
    brand: "",
    contact: "",
    city: "Mumbai",
    category: "Pet Occasion Wear",
    tier: "Emerging",
    takeRate: 32,
    gst: "",
    contractEnds: "",
    source: "Referral",
    owner: "Nisha Kapoor",
    nextFollowUp: "",
    cac: 8000,
    renewalProbability: 50,
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch all live records
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [
        designersRes,
        ordersRes,
        productsRes,
        returnsRes,
        settlementsRes,
      ] = await Promise.all([
        getDesigners().catch(() => []),
        getOrders().catch(() => []),
        getProducts().catch(() => []),
        getReturns().catch(() => []),
        getSettlements().catch(() => []),
      ]);

      setDesigners(Array.isArray(designersRes) ? designersRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
      setReturns(Array.isArray(returnsRes) ? returnsRes : []);
      setSettlements(Array.isArray(settlementsRes) ? settlementsRes : []);

      if (isManual) showToast("Live designer pipeline refreshed.");
    } catch (err) {
      console.error("Failed to load CRM data:", err);
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Top 5 KPIs
  const pipelineCount = designers.length;

  const sellingNowCount = useMemo(() => {
    return designers.filter((d) => ["LIVE", "ACTIVE"].includes(d.stage)).length;
  }, [designers]);

  const kycPendingCount = useMemo(() => {
    return designers.filter((d) => !d.kyc_verified && d.kyc_status !== "VERIFIED")
      .length;
  }, [designers]);

  const followupsOverdueCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let count = 0;
    designers.forEach((d) => {
      (d.follow_up_tasks || []).forEach((t) => {
        if (!t.completed && t.due_date && t.due_date < today) {
          count += 1;
        }
      });
    });
    return count;
  }, [designers]);

  const partnershipRevenue = useMemo(() => {
    return settlements
      .filter((s) => s.status !== "REVERSED" && !s.is_reversal)
      .reduce(
        (sum, s) => sum + (Number(s.commission || s.commission_amount) || 0),
        0
      );
  }, [settlements]);

  // Designer Economics & Health Score calculation
  const getDesignerEconomics = (designer) => {
    const designerSkus = products
      .filter(
        (p) =>
          p.designer === designer.id ||
          p.designerId === designer.id ||
          p.designer_name === designer.brand_name
      )
      .map((p) => p.sku || p.id);

    const designerOrders = orders.filter((o) =>
      (o.lines || o.items || []).some((l) =>
        designerSkus.includes(l.sku || l.skuId)
      )
    );

    const nonCancelled = designerOrders.filter((o) => o.status !== "CANCELLED");
    const gmv = nonCancelled.reduce(
      (sum, o) => sum + (Number(o.amount || o.total_amount) || 0),
      0
    );

    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const monthlyGmv = nonCancelled
      .filter(
        (o) =>
          o.created_at &&
          new Date(o.created_at).getTime() >= monthAgo
      )
      .reduce(
        (sum, o) => sum + (Number(o.amount || o.total_amount) || 0),
        0
      );

    const takeRatePct = Number(designer.take_rate) || 32;
    const ltv = Math.round((gmv * takeRatePct) / 100);
    const cac = Number(designer.acquisition_cost) || 8000;
    const roi = cac > 0 ? Math.round((ltv / cac) * 100) / 100 : null;

    const liveSkus = products.filter(
      (p) =>
        (p.designer === designer.id ||
          p.designerId === designer.id ||
          p.designer_name === designer.brand_name) &&
        (p.status === "LIVE" || p.live)
    ).length;

    const skuProductivity =
      liveSkus > 0 ? Math.round(gmv / liveSkus) : Math.round(gmv);

    // Health score formula (matches Lovable)
    const dProducts = products.filter(
      (p) =>
        p.designer === designer.id ||
        p.designerId === designer.id ||
        p.designer_name === designer.brand_name
    );
    const qaApproved = dProducts.filter((p) => p.status === "LIVE" || p.status === "APPROVED").length;
    const qaRate = dProducts.length ? (qaApproved / dProducts.length) * 100 : 80;
    const inStock = dProducts.filter((p) => Number(p.available_quantity || 0) > 0).length;
    const stockRate = dProducts.length ? (inStock / dProducts.length) * 100 : 80;
    const isKyc = designer.kyc_verified || designer.kyc_status === "VERIFIED";
    const renewalProb = designer.renewal_likelihood ?? 50;

    const health = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          qaRate * 0.25 +
            stockRate * 0.2 +
            Math.min(100, monthlyGmv / 500) * 0.25 +
            (isKyc ? 100 : 0) * 0.1 +
            renewalProb * 0.2
        )
      )
    );

    return {
      monthlyGmv,
      gmv,
      ltv,
      cac,
      roi,
      skuProductivity,
      health,
      isKyc,
    };
  };

  // Actions
  const handleStageChange = async (designerId, nextStage) => {
    try {
      await updateDesigner(designerId, { stage: nextStage });
      setDesigners((list) =>
        list.map((d) => (d.id === designerId ? { ...d, stage: nextStage } : d))
      );
      showToast(`Updated stage to ${nextStage}.`);
    } catch (err) {
      console.error("Failed to update stage:", err);
      alert("Failed to update stage.");
    }
  };

  const handleAdvanceStage = async (designer) => {
    const currentIdx = STAGES_SEQUENCE.indexOf(designer.stage);
    if (currentIdx === -1 || currentIdx >= STAGES_SEQUENCE.length - 2) {
      showToast(`${designer.brand_name} is at final stage.`);
      return;
    }
    const nextStage = STAGES_SEQUENCE[currentIdx + 1];
    await handleStageChange(designer.id, nextStage);
    showToast(`${designer.brand_name} advanced to ${nextStage}.`);
  };

  const handleToggleKyc = async (designer) => {
    const currentVerified =
      designer.kyc_verified || designer.kyc_status === "VERIFIED";
    const nextStatus = currentVerified ? "PENDING" : "VERIFIED";
    try {
      await updateDesigner(designer.id, {
        kyc_status: nextStatus,
        kyc_verified: !currentVerified,
      });
      setDesigners((list) =>
        list.map((d) =>
          d.id === designer.id
            ? {
                ...d,
                kyc_status: nextStatus,
                kyc_verified: !currentVerified,
              }
            : d
        )
      );
      showToast(
        !currentVerified
          ? `${designer.brand_name} KYC verified.`
          : `${designer.brand_name} KYC revoked.`
      );
    } catch (err) {
      console.error("Failed to toggle KYC:", err);
      alert("Failed to update KYC status.");
    }
  };

  const handleUpdateField = async (designerId, patch) => {
    try {
      await updateDesigner(designerId, patch);
      setDesigners((list) =>
        list.map((d) => (d.id === designerId ? { ...d, ...patch } : d))
      );
      showToast("Updated designer details.");
    } catch (err) {
      console.error("Failed to update designer:", err);
    }
  };

  // Follow-up tasks
  const handleToggleTask = async (designerId, taskId) => {
    const target = designers.find((d) => d.id === designerId);
    if (!target) return;
    const updatedTasks = (target.follow_up_tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed, done: !t.done } : t
    );

    setDesigners((list) =>
      list.map((d) =>
        d.id === designerId ? { ...d, follow_up_tasks: updatedTasks } : d
      )
    );

    try {
      await updateDesigner(designerId, { follow_up_tasks: updatedTasks });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleAddTask = async (designerId) => {
    const input = taskInputs[designerId] || {};
    const text = (input.text || "").trim();
    const due = input.due || new Date().toISOString().split("T")[0];

    if (!text) {
      alert("Task title is required.");
      return;
    }

    const newTask = {
      id: Date.now(),
      text,
      title: text,
      due,
      due_date: due,
      completed: false,
      done: false,
    };

    const target = designers.find((d) => d.id === designerId);
    const updatedTasks = [...(target?.follow_up_tasks || []), newTask];

    setDesigners((list) =>
      list.map((d) =>
        d.id === designerId ? { ...d, follow_up_tasks: updatedTasks } : d
      )
    );

    setTaskInputs((prev) => ({
      ...prev,
      [designerId]: { text: "", due: "" },
    }));

    try {
      await updateDesigner(designerId, { follow_up_tasks: updatedTasks });
      showToast("Follow-up scheduled.");
    } catch (err) {
      console.error("Failed to save task:", err);
    }
  };

  // Create lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.name.trim() || !newLead.brand.trim() || !newLead.contact.trim()) {
      alert("Name, brand and contact are required.");
      return;
    }

    const isEmail = newLead.contact.includes("@");
    const designerCode = `DSG-${String(Date.now()).slice(-4)}`;

    const payload = {
      designer_code: designerCode,
      designer_name: newLead.name.trim(),
      brand_name: newLead.brand.trim(),
      owner_name: newLead.name.trim(),
      email: isEmail ? newLead.contact.trim() : `${newLead.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: !isEmail ? newLead.contact.trim() : "9876543210",
      city: newLead.city || "Mumbai",
      primary_category: newLead.category || "Pet Occasion Wear",
      tier: newLead.tier.toUpperCase(),
      take_rate: Number(newLead.takeRate) || 32,
      gst_number: newLead.gst || "",
      contract_end_date: newLead.contractEnds || null,
      lead_source: newLead.source,
      sales_owner: newLead.owner,
      next_followup_date: newLead.nextFollowUp || null,
      acquisition_cost: Number(newLead.cac) || 8000,
      renewal_likelihood: Number(newLead.renewalProbability) || 50,
      stage: "LEAD",
      kyc_status: "PENDING",
      kyc_verified: false,
      follow_up_tasks: [],
    };

    try {
      const created = await createDesigner(payload);
      setDesigners((prev) => [created, ...prev]);
      showToast(`${newLead.brand} added as a new lead.`);
      setNewLead({
        name: "",
        brand: "",
        contact: "",
        city: "Mumbai",
        category: "Pet Occasion Wear",
        tier: "Emerging",
        takeRate: 32,
        gst: "",
        contractEnds: "",
        source: "Referral",
        owner: "Nisha Kapoor",
        nextFollowUp: "",
        cac: 8000,
        renewalProbability: 50,
      });
    } catch (err) {
      console.error("Failed to create designer lead:", err);
      alert(err.message || "Failed to create designer lead.");
    }
  };

  return (
    <div className="designer-crm-page">
      {/* HEADER */}
      <header className="lovable-header">
        <div className="lovable-header-inner">
          <div className="lovable-header-left">
            <div className="lovable-portal-logo">
              <img src={logo} alt="Zenve Fashion" />
            </div>

            <div className="lovable-header-title-block">
              <Link to="/command-centre" className="lovable-back-link">
                ← ALL 12 LAYERS
              </Link>

              <h1 className="lovable-portal-title">
                <span className="lovable-layer-num">01</span>
                <span>Designer CRM</span>
              </h1>

              <p className="lovable-portal-desc">
                Supply layer · Lead, qualification, approval, KYC, contract, status
              </p>
            </div>
          </div>

          <div className="lovable-header-right">
            <button
              type="button"
              className="crm-refresh-btn"
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh live designer metrics"
            >
              <RefreshIcon spinning={refreshing} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <SearchBar />
          </div>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && <div className="crm-toast">{toastMessage}</div>}

      {/* MAIN CONTAINER */}
      <main className="crm-container">
        {/* ERROR BANNER */}
        {error && (
          <div className="crm-error-banner">
            <span>{error}</span>
            <button type="button" onClick={() => loadData(true)}>
              Retry
            </button>
          </div>
        )}

        {/* 1. TOP 5 KPI CARDS */}
        <section className="crm-kpi-grid">
          <div className="crm-kpi-card">
            <p className="label-caps">Pipeline</p>
            <p className="crm-kpi-value">{loading ? "..." : pipelineCount}</p>
            <p className="crm-kpi-hint">All designers</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Selling now</p>
            <p className="crm-kpi-value">{loading ? "..." : sellingNowCount}</p>
            <p className="crm-kpi-hint">Live or active</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">KYC pending</p>
            <p className="crm-kpi-value">{loading ? "..." : kycPendingCount}</p>
            <p className="crm-kpi-hint">Blocks contract</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Follow-ups overdue</p>
            <p className="crm-kpi-value">{loading ? "..." : followupsOverdueCount}</p>
            <p className="crm-kpi-hint">Needs a call today</p>
          </div>

          <div className="crm-kpi-card">
            <p className="label-caps">Partnership revenue</p>
            <p className="crm-kpi-value">
              {loading ? "..." : `₹${partnershipRevenue.toLocaleString()}`}
            </p>
            <p className="crm-kpi-hint">Commission earned by Zenve</p>
          </div>
        </section>

        {/* 2. DESIGNER PIPELINE */}
        <section className="crm-panel">
          <div className="crm-panel-header">
            <div className="crm-panel-title-block">
              <h2 className="crm-panel-title">Designer pipeline</h2>
              <p className="crm-panel-desc">
                Stages follow the blueprint: lead → qualified → portfolio →
                review → approved → contract → signed → live → active.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="crm-empty-state">Loading designer records...</div>
          ) : designers.length === 0 ? (
            <div className="crm-empty-state">
              No designers yet. Add a lead below.
            </div>
          ) : (
            <div className="designer-cards-list">
              {designers.map((designer) => {
                const econ = getDesignerEconomics(designer);
                const tasks = designer.follow_up_tasks || [];
                const currentInput = taskInputs[designer.id] || {
                  text: "",
                  due: "",
                };

                return (
                  <article className="designer-card" key={designer.id}>
                    {/* Top Row: Brand, Badges, Stage Actions */}
                    <div className="designer-card-top">
                      <div className="designer-info-left">
                        <div className="designer-header-row">
                          <h3 className="designer-brand-name">
                            {designer.brand_name || designer.name || "Brand"}
                          </h3>

                          <span
                            className={`tone-badge ${getStageTone(
                              designer.stage
                            )}`}
                          >
                            {designer.stage || "LEAD"}
                          </span>

                          <span className="tone-badge info">
                            {designer.tier || "Emerging"}
                          </span>

                          <span
                            className={`tone-badge ${
                              econ.isKyc ? "good" : "bad"
                            }`}
                          >
                            {econ.isKyc ? "KYC verified" : "KYC missing"}
                          </span>

                          <span
                            className={`tone-badge ${
                              econ.health >= 70
                                ? "good"
                                : econ.health >= 45
                                ? "warn"
                                : "bad"
                            }`}
                          >
                            Health {econ.health}/100
                          </span>
                        </div>

                        {/* Meta Line 1 */}
                        <p className="designer-subtext-line">
                          {designer.designer_code || `DSG-${designer.id}`} ·{" "}
                          {designer.designer_name || designer.owner_name || "—"} ·{" "}
                          {designer.email || designer.phone || "—"} ·{" "}
                          {designer.city || "Mumbai"} ·{" "}
                          {designer.primary_category || "Pet Occasion Wear"} · take
                          rate {designer.take_rate ?? 32}%
                          {designer.contract_end_date
                            ? ` · contract ends ${designer.contract_end_date}`
                            : ""}
                        </p>

                        {/* Meta Line 2 */}
                        <p className="designer-subtext-line">
                          Source {designer.lead_source || "Referral"} · owner{" "}
                          {designer.sales_owner || "Unassigned"} · next follow-up{" "}
                          {designer.next_followup_date
                            ? new Date(
                                designer.next_followup_date
                              ).toLocaleDateString()
                            : "not set"}{" "}
                          · renewal likelihood{" "}
                          {designer.renewal_likelihood ?? 50}%
                          {designer.lost_reason
                            ? ` · lost: ${designer.lost_reason}`
                            : ""}
                        </p>
                      </div>

                      {/* Right Actions */}
                      <div className="designer-actions-right">
                        <select
                          className="designer-stage-select"
                          value={designer.stage || "LEAD"}
                          onChange={(e) =>
                            handleStageChange(designer.id, e.target.value)
                          }
                        >
                          {STAGES_SEQUENCE.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="btn-crm-action outline"
                          onClick={() => handleToggleKyc(designer)}
                        >
                          {econ.isKyc ? "Revoke KYC" : "Verify KYC"}
                        </button>

                        <button
                          type="button"
                          className="btn-crm-action primary"
                          onClick={() => handleAdvanceStage(designer)}
                        >
                          Advance stage
                        </button>
                      </div>
                    </div>

                    {/* 6 Economics Boxes */}
                    <div className="designer-economics-grid">
                      <div className="econ-box">
                        <span className="label-caps">Monthly GMV</span>
                        <span className="econ-val">
                          ₹{econ.monthlyGmv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Lifetime GMV</span>
                        <span className="econ-val">
                          ₹{econ.gmv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Designer LTV</span>
                        <span className="econ-val">
                          ₹{econ.ltv.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">Designer CAC</span>
                        <span className="econ-val">
                          ₹{econ.cac.toLocaleString()}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">LTV / CAC</span>
                        <span className="econ-val">
                          {econ.roi !== null ? `${econ.roi}×` : "—"}
                        </span>
                      </div>

                      <div className="econ-box">
                        <span className="label-caps">SKU productivity</span>
                        <span className="econ-val">
                          ₹{econ.skuProductivity.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Follow-Up Tasks (Left) & Controls (Right) */}
                    <div className="designer-bottom-grid">
                      {/* Left: Follow-up Tasks */}
                      <div className="crm-col-box">
                        <span className="label-caps">Follow-up tasks</span>
                        {tasks.length === 0 ? (
                          <p className="designer-subtext-line">Nothing scheduled.</p>
                        ) : (
                          <ul className="tasks-list">
                            {tasks.map((task) => {
                              const isDone = task.completed || task.done;
                              const isOverdue =
                                !isDone &&
                                task.due_date &&
                                task.due_date <
                                  new Date().toISOString().split("T")[0];
                              return (
                                <li key={task.id} className="task-row-item">
                                  <input
                                    type="checkbox"
                                    checked={!!isDone}
                                    onChange={() =>
                                      handleToggleTask(designer.id, task.id)
                                    }
                                  />
                                  <span
                                    className={`task-title ${
                                      isDone ? "done" : ""
                                    }`}
                                  >
                                    {task.title || task.text}
                                  </span>
                                  {task.due_date && (
                                    <span className="task-due">
                                      due {task.due_date}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="tone-badge bad">
                                      Overdue
                                    </span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {/* Add task inline */}
                        <div className="task-add-row">
                          <input
                            type="text"
                            className="task-input-text"
                            placeholder="New follow-up task"
                            value={currentInput.text || ""}
                            onChange={(e) =>
                              setTaskInputs((prev) => ({
                                ...prev,
                                [designer.id]: {
                                  ...prev[designer.id],
                                  text: e.target.value,
                                },
                              }))
                            }
                          />
                          <input
                            type="date"
                            className="task-input-date"
                            value={currentInput.due || ""}
                            onChange={(e) =>
                              setTaskInputs((prev) => ({
                                ...prev,
                                [designer.id]: {
                                  ...prev[designer.id],
                                  due: e.target.value,
                                },
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-crm-action outline"
                            onClick={() => handleAddTask(designer.id)}
                          >
                            Add task
                          </button>
                        </div>
                      </div>

                      {/* Right: Sales Controls */}
                      <div className="crm-controls-grid">
                        <div className="crm-control-item">
                          <span className="label-caps">Sales owner</span>
                          <select
                            className="crm-select"
                            value={designer.sales_owner || "Nisha Kapoor"}
                            onChange={(e) =>
                              handleUpdateField(designer.id, {
                                sales_owner: e.target.value,
                              })
                            }
                          >
                            {SALES_OWNERS.map((owner) => (
                              <option key={owner} value={owner}>
                                {owner}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="crm-control-item">
                          <span className="label-caps">Renewal likelihood %</span>
                          <input
                            type="number"
                            className="crm-input-num"
                            min="0"
                            max="100"
                            value={designer.renewal_likelihood ?? 50}
                            onChange={(e) =>
                              handleUpdateField(designer.id, {
                                renewal_likelihood: Number(e.target.value),
                              })
                            }
                          />
                        </div>

                        <div className="crm-control-item full-width">
                          <span className="label-caps">Mark lost with a reason</span>
                          <select
                            className="crm-select"
                            value={designer.lost_reason || ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateField(designer.id, {
                                  lost_reason: e.target.value,
                                  stage: "REJECTED",
                                });
                              }
                            }}
                          >
                            <option value="">Select a lost reason</option>
                            {LOST_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 3. ADD A DESIGNER LEAD (14 Fields) */}
        <section className="crm-panel">
          <div className="crm-panel-header">
            <div className="crm-panel-title-block">
              <h2 className="crm-panel-title">Add a designer lead</h2>
              <p className="crm-panel-desc">
                Creates the designer record used by every other layer.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateLead} className="lead-form-grid">
            <div className="lead-form-field">
              <label className="label-caps">Designer name</label>
              <input
                type="text"
                className="lead-input"
                placeholder="e.g. Rohini Sharma"
                value={newLead.name}
                onChange={(e) =>
                  setNewLead({ ...newLead, name: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Brand</label>
              <input
                type="text"
                className="lead-input"
                placeholder="e.g. Velvet Canine"
                value={newLead.brand}
                onChange={(e) =>
                  setNewLead({ ...newLead, brand: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Contact email / phone</label>
              <input
                type="text"
                className="lead-input"
                placeholder="email@brand.com or 9876543210"
                value={newLead.contact}
                onChange={(e) =>
                  setNewLead({ ...newLead, contact: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Lead source</label>
              <select
                className="lead-select"
                value={newLead.source}
                onChange={(e) =>
                  setNewLead({ ...newLead, source: e.target.value })
                }
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Sales owner</label>
              <select
                className="lead-select"
                value={newLead.owner}
                onChange={(e) =>
                  setNewLead({ ...newLead, owner: e.target.value })
                }
              >
                {SALES_OWNERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Next follow-up date</label>
              <input
                type="date"
                className="lead-input"
                value={newLead.nextFollowUp}
                onChange={(e) =>
                  setNewLead({ ...newLead, nextFollowUp: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">City</label>
              <input
                type="text"
                className="lead-input"
                value={newLead.city}
                onChange={(e) =>
                  setNewLead({ ...newLead, city: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Primary category</label>
              <input
                type="text"
                className="lead-input"
                value={newLead.category}
                onChange={(e) =>
                  setNewLead({ ...newLead, category: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Tier</label>
              <select
                className="lead-select"
                value={newLead.tier}
                onChange={(e) =>
                  setNewLead({ ...newLead, tier: e.target.value })
                }
              >
                <option value="Premium">Premium</option>
                <option value="Core">Core</option>
                <option value="Emerging">Emerging</option>
              </select>
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Take rate %</label>
              <input
                type="number"
                className="lead-input"
                min="1"
                max="100"
                value={newLead.takeRate}
                onChange={(e) =>
                  setNewLead({ ...newLead, takeRate: Number(e.target.value) })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Acquisition cost (CAC)</label>
              <input
                type="number"
                className="lead-input"
                value={newLead.cac}
                onChange={(e) =>
                  setNewLead({ ...newLead, cac: Number(e.target.value) })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Renewal likelihood %</label>
              <input
                type="number"
                className="lead-input"
                min="0"
                max="100"
                value={newLead.renewalProbability}
                onChange={(e) =>
                  setNewLead({
                    ...newLead,
                    renewalProbability: Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">GST number</label>
              <input
                type="text"
                className="lead-input"
                placeholder="27AAAAA0000A1Z5"
                value={newLead.gst}
                onChange={(e) =>
                  setNewLead({ ...newLead, gst: e.target.value })
                }
              />
            </div>

            <div className="lead-form-field">
              <label className="label-caps">Contract end date</label>
              <input
                type="date"
                className="lead-input"
                value={newLead.contractEnds}
                onChange={(e) =>
                  setNewLead({ ...newLead, contractEnds: e.target.value })
                }
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-create-lead">
                Create lead
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}