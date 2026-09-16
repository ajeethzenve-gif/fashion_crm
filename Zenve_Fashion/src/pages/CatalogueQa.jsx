import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/CatalogueQa.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";
import { getProducts, updateProduct } from "../services/api";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =========================================================
   10 QA WEIGHTED DIMENSIONS
========================================================= */

const QA_DIMENSIONS = [
  { key: "productData", label: "Product data", weight: 15 },
  { key: "photography", label: "Photography", weight: 15 },
  { key: "brandQuality", label: "Brand quality", weight: 10 },
  { key: "sizeInfo", label: "Size information", weight: 10 },
  { key: "pricing", label: "Pricing", weight: 10 },
  { key: "compliance", label: "Compliance", weight: 10 },
  { key: "petSafety", label: "Pet safety", weight: 10 },
  { key: "inventory", label: "Inventory", weight: 10 },
  { key: "returnPolicy", label: "Return policy", weight: 5 },
  { key: "seo", label: "SEO", weight: 5 },
];

const getDefaultScores = () =>
  Object.fromEntries(QA_DIMENSIONS.map((d) => [d.key, 90]));

function calculateWeightedScore(scores) {
  if (!scores) return 0;
  const valid = QA_DIMENSIONS.filter((d) => typeof scores[d.key] === "number");
  if (!valid.length) return 0;
  const totalWeight = valid.reduce((acc, d) => acc + d.weight, 0);
  const weightedSum = valid.reduce((acc, d) => acc + (Number(scores[d.key]) || 0) * d.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function formatInr(val) {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

/* =========================================================
   MAIN COMPONENT: 04 CATALOGUE QA
========================================================= */

export default function CatalogueQa() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState(null);

  // Scores by SKU ID: { [skuId]: { productData: 90, photography: 90, ... } }
  const [scoresState, setScoresState] = useState({});
  // Reviewer notes by SKU ID: { [skuId]: string }
  const [notesState, setNotesState] = useState({});

  // Audit trail list of decisions
  const [auditLog, setAuditLog] = useState([]);

  /* =======================================================
     FETCH PRODUCTS FROM BACKEND
  ======================================================= */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProducts();
      const list = Array.isArray(data) ? data : data.results || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products for QA:", err);
      setError("Unable to connect to Django backend to fetch SKUs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  /* =======================================================
     DERIVED DATA & KPIS
  ======================================================= */
  const queueSkus = useMemo(() => {
    return products.filter((p) => {
      const status = p.qaStatus || p.status;
      return status === "PENDING_QA" || status === "CORRECTION";
    });
  }, [products]);

  const reviewedSkus = useMemo(() => {
    return products.filter((p) => p.qa_score !== null && p.qa_score !== undefined);
  }, [products]);

  const kpis = useMemo(() => {
    const inQueue = queueSkus.length;
    const approved = products.filter((p) => (p.qaStatus || p.status) === "APPROVED").length;
    const rejected = products.filter((p) => (p.qaStatus || p.status) === "REJECTED").length;
    const withScores = products.filter((p) => typeof p.qa_score === "number");
    const avgQuality = withScores.length
      ? Math.round(withScores.reduce((acc, p) => acc + p.qa_score, 0) / withScores.length)
      : 0;
    return { inQueue, approved, rejected, avgQuality };
  }, [products, queueSkus]);

  /* =======================================================
     SCORE HANDLERS
  ======================================================= */
  const getScoresForSku = (skuId) => scoresState[skuId] || getDefaultScores();

  const handleScoreChange = (skuId, key, val) => {
    const clamped = Math.max(0, Math.min(100, Number(val) || 0));
    setScoresState((prev) => ({
      ...prev,
      [skuId]: {
        ...getScoresForSku(skuId),
        [key]: clamped,
      },
    }));
  };

  /* =======================================================
     SUBMIT DETAILED REVIEW
  ======================================================= */
  const handleSubmitReview = async (skuItem) => {
    const scores = getScoresForSku(skuItem.id);
    const totalScore = calculateWeightedScore(scores);
    const note = notesState[skuItem.id] || "";

    let newStatus = "REJECTED";
    let isLive = false;
    let message = `Rejected (${totalScore}/100) — designer must resubmit`;

    if (totalScore >= 90) {
      newStatus = "APPROVED";
      isLive = true;
      message = `Approved with ${totalScore}/100 — SKU is now live`;
    } else if (totalScore >= 75) {
      newStatus = "CORRECTION";
      isLive = false;
      message = `Correction requested (${totalScore}/100) — sent back to designer`;
    }

    try {
      await updateProduct(skuItem.id, {
        status: newStatus,
        qa_score: totalScore,
        qa_scores: scores,
        qa_note: note,
        is_live: isLive,
      });

      setAlert({ type: "success", text: message });

      // Append to audit log
      setAuditLog((prev) => [
        {
          id: `log-${Date.now()}`,
          at: new Date().toISOString(),
          message: `${skuItem.product_name || skuItem.name} reviewed: ${message}`,
        },
        ...prev,
      ]);

      // Refresh product list
      await loadProducts();
    } catch (err) {
      console.error("Submit QA review failed:", err);
      setAlert({ type: "error", text: `Failed to submit review: ${err.message}` });
    }
  };

  /* =======================================================
     QUICK DECISION HANDLERS
  ======================================================= */
  const handleQuickDecision = async (skuItem, targetScore, targetStatus) => {
    const isLive = targetStatus === "APPROVED";
    const message =
      targetStatus === "APPROVED"
        ? `Quick approved with ${targetScore}/100 — SKU is now live`
        : `Quick rejected with ${targetScore}/100 — designer must resubmit`;

    try {
      await updateProduct(skuItem.id, {
        status: targetStatus,
        qa_score: targetScore,
        is_live: isLive,
        qa_note: `Quick decision applied (${targetScore}/100)`,
      });

      setAlert({ type: "success", text: message });

      setAuditLog((prev) => [
        {
          id: `log-${Date.now()}`,
          at: new Date().toISOString(),
          message: `${skuItem.product_name || skuItem.name}: ${message}`,
        },
        ...prev,
      ]);

      await loadProducts();
    } catch (err) {
      console.error("Quick decision failed:", err);
      setAlert({ type: "error", text: `Failed to apply quick decision: ${err.message}` });
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="lovable-qa-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="lovable-qa-header">
        <div className="lovable-header-left">
          <Link to="/" className="lovable-portal-logo">
            <img src={logo} alt="Zenve Fashion" />
          </Link>

          <div className="lovable-header-title-block">
            <Link to="/" className="lovable-back-link">
              <BackIcon />
              <span>ALL 12 LAYERS</span>
            </Link>

            <h1 className="lovable-portal-title">
              <span className="lovable-layer-num">04</span>
              Catalogue QA
            </h1>

            <p className="lovable-portal-subtitle">
              Review incoming designer SKUs across 10 quality dimensions.
            </p>
          </div>
        </div>

        <div className="lovable-header-right">
          <SearchBar />
        </div>
      </header>

      {/* FEEDBACK NOTIFICATION */}
      {alert && (
        <div className={`lovable-alert lovable-alert-${alert.type}`}>
          <span>{alert.text}</span>
          <button type="button" className="lovable-alert-close" onClick={() => setAlert(null)}>
            ×
          </button>
        </div>
      )}

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="lovable-alert lovable-alert-error">
          <span>{error}</span>
          <button type="button" className="lovable-alert-close" onClick={loadProducts}>
            Retry
          </button>
        </div>
      )}

      <main className="lovable-qa-main">
        {/* ===================================================
            TOP 4 KPI METRIC TILES
        =================================================== */}
        <div className="lovable-qa-kpi-grid">
          <div className="lovable-kpi-tile">
            <div className="lovable-tile-label">In queue</div>
            <div className="lovable-tile-value">{loading ? "—" : kpis.inQueue}</div>
            <div className="lovable-tile-hint">Awaiting a score</div>
          </div>

          <div className="lovable-kpi-tile">
            <div className="lovable-tile-label">Approved</div>
            <div className="lovable-tile-value">{loading ? "—" : kpis.approved}</div>
            <div className="lovable-tile-hint">Live on storefront</div>
          </div>

          <div className="lovable-kpi-tile">
            <div className="lovable-tile-label">Rejected</div>
            <div className="lovable-tile-value">{loading ? "—" : kpis.rejected}</div>
            <div className="lovable-tile-hint">Needs revision</div>
          </div>

          <div className="lovable-kpi-tile">
            <div className="lovable-tile-label">Average quality</div>
            <div className="lovable-tile-value">{loading ? "—" : `${kpis.avgQuality}/100`}</div>
            <div className="lovable-tile-hint">Across reviewed SKUs</div>
          </div>
        </div>

        {/* ===================================================
            SECTION 1: QA QUEUE
        =================================================== */}
        <section className="lovable-portal-card">
          <div className="lovable-card-header">
            <div>
              <h2 className="lovable-card-title">QA queue</h2>
              <p className="lovable-card-description">
                Ten weighted dimensions make the Total Product Quality Score. 90–100 approve · 75–89 correction · below 75 reject.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="lovable-item-empty">Loading QA queue from Django...</div>
          ) : queueSkus.length === 0 ? (
            <div className="lovable-item-empty">
              Queue is clear. New designer uploads land here automatically.
            </div>
          ) : (
            <div className="lovable-qa-queue-stack">
              {queueSkus.map((sku) => {
                const scores = getScoresForSku(sku.id);
                const totalScore = calculateWeightedScore(scores);
                const scoreTone = totalScore >= 90 ? "good" : totalScore >= 75 ? "warn" : "bad";
                const qaStatus = sku.qaStatus || sku.status || "PENDING_QA";
                const designerBrand = sku.designer_brand || sku.designer_name || "—";
                const location = sku.location || sku.fulfilment_location || "Mumbai FC";

                return (
                  <div key={sku.id} className="lovable-qa-card">
                    {/* CARD HEADER */}
                    <div className="lovable-qa-top-bar">
                      <h3 className="lovable-sku-title">{sku.product_name || sku.name}</h3>

                      <span className={`lovable-qa-badge tone-${qaStatus.toLowerCase()}`}>
                        {qaStatus}
                      </span>

                      <span className={`lovable-tone-badge ${scoreTone}`}>
                        {totalScore}/100
                      </span>
                    </div>

                    {/* SKU ID MONO */}
                    <div className="lovable-sku-id-mono">{sku.sku}</div>

                    {/* SUBTITLE DETAILS */}
                    <p className="lovable-qa-meta-line">
                      {designerBrand} · {sku.category} · {sku.colour} / {sku.size} · {formatInr(sku.price || sku.selling_price)} · {location}
                    </p>

                    {/* 10-DIMENSION SCORE INPUTS */}
                    <div className="lovable-dimensions-grid">
                      {QA_DIMENSIONS.map((dim) => (
                        <div key={dim.key} className="lovable-dimension-tile">
                          <span className="lovable-dim-label">
                            {dim.label} · {dim.weight}%
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={scores[dim.key] ?? 90}
                            onChange={(e) => handleScoreChange(sku.id, dim.key, e.target.value)}
                            className="lovable-dim-input"
                          />
                        </div>
                      ))}
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="lovable-qa-actions-row">
                      <input
                        type="text"
                        placeholder="Reviewer note to the designer"
                        value={notesState[sku.id] ?? ""}
                        onChange={(e) => setNotesState({ ...notesState, [sku.id]: e.target.value })}
                        className="lovable-note-input"
                      />

                      <button
                        type="button"
                        className="lovable-btn-primary"
                        onClick={() => handleSubmitReview(sku)}
                      >
                        Submit review ({totalScore}/100)
                      </button>

                      <button
                        type="button"
                        className="lovable-btn-outline-sm"
                        onClick={() => handleQuickDecision(sku, 95, "APPROVED")}
                      >
                        Quick approve (95)
                      </button>

                      <button
                        type="button"
                        className="lovable-btn-outline-sm"
                        onClick={() => handleQuickDecision(sku, 60, "REJECTED")}
                      >
                        Quick reject (60)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            SECTION 2: REVIEWED SKUS
        =================================================== */}
        <section className="lovable-portal-card">
          <div className="lovable-card-header">
            <div>
              <h2 className="lovable-card-title">Reviewed SKUs</h2>
              <p className="lovable-card-description">
                Score breakdown is kept with every decision.
              </p>
            </div>
          </div>

          {reviewedSkus.length === 0 ? (
            <div className="lovable-item-empty">Nothing reviewed yet.</div>
          ) : (
            <div className="lovable-reviewed-list">
              {reviewedSkus.map((sku) => {
                const qaStatus = sku.qaStatus || sku.status || "APPROVED";
                return (
                  <div key={sku.id} className="lovable-reviewed-row">
                    <div className="lovable-reviewed-head">
                      <span className="lovable-reviewed-name">{sku.product_name || sku.name}</span>
                      <span className="lovable-sku-id-mono">{sku.sku}</span>
                      <span className="lovable-reviewed-score">Score {sku.qa_score}/100</span>
                      <span className={`lovable-qa-badge tone-${qaStatus.toLowerCase()}`}>
                        {qaStatus}
                      </span>
                    </div>

                    {sku.qa_scores && Object.keys(sku.qa_scores).length > 0 && (
                      <p className="lovable-reviewed-breakdown">
                        {QA_DIMENSIONS.filter((d) => typeof sku.qa_scores[d.key] === "number")
                          .map((d) => `${d.label} ${sku.qa_scores[d.key]}`)
                          .join(" · ")}
                      </p>
                    )}

                    {sku.qa_note && (
                      <p className="lovable-reviewed-note">Note: {sku.qa_note}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================================================
            SECTION 3: AUDIT TRAIL
        =================================================== */}
        <section className="lovable-portal-card">
          <div className="lovable-card-header">
            <div>
              <h2 className="lovable-card-title">Audit trail</h2>
              <p className="lovable-card-description">
                Every QA decision is timestamped.
              </p>
            </div>
          </div>

          {auditLog.length === 0 ? (
            <div className="lovable-item-empty">No QA decisions recorded yet.</div>
          ) : (
            <ul className="lovable-audit-list">
              {auditLog.map((entry) => (
                <li key={entry.id} className="lovable-audit-item">
                  <span className="lovable-audit-time">
                    {new Date(entry.at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                  <span className="lovable-audit-msg">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
