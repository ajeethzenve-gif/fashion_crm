import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/MediaStudio.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";
import { getMediaQueue, submitMediaAction } from "../services/api";
import { showSuccessToast, showErrorToast, showWarningToast, showDesignerAcceptedToast } from "../utils/zenveToast";

/* =========================================================
   ICONS
========================================================= */

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 7L5 12L10 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RefreshIcon({ spinning }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "zenve-spin" : ""}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function FigmaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 16.5L12 11.5L17 16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11.5V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.39 18.39A5 5 0 0018 9H16.74A8 8 0 103 16.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 8V14M8 11H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56263 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* =========================================================
   CONSTANTS & STATUS LABELS
========================================================= */

export const MEDIA_STATUS_CONFIG = {
  QUEUED: {
    label: "Ready for Media",
    badgeClass: "status-queued",
    tone: "info",
    desc: "4 originals uploaded · Awaiting creative work",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badgeClass: "status-in-progress",
    tone: "purple",
    desc: "Figma creative direction & asset generation",
  },
  IN_REVIEW: {
    label: "Designer Review",
    badgeClass: "status-in-review",
    tone: "warn",
    desc: "Deliverables sent · Awaiting designer sign-off",
  },
  CHANGES_REQUESTED: {
    label: "Changes Requested",
    badgeClass: "status-changes-requested",
    tone: "bad",
    desc: "Feedback provided · Revisions required",
  },
  APPROVED: {
    label: "Approved & Live",
    badgeClass: "status-approved",
    tone: "good",
    desc: "Approved by designer · Live for catalogue",
  },
};

const POSITION_NAMES = {
  1: "Front View",
  2: "Back View",
  3: "Texture & Detail",
  4: "Model & Styling",
};

/* =========================================================
   LIGHTBOX MODAL
========================================================= */

function ImageLightbox({ image, onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext) onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!image) return null;

  return (
    <div className="ZENVE-lightbox-backdrop" onClick={onClose}>
      <div className="ZENVE-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox-close-btn" onClick={onClose} aria-label="Close image">
          ×
        </button>

        {hasPrev && (
          <button type="button" className="lightbox-nav-btn prev" onClick={onPrev} aria-label="Previous image">
            ‹
          </button>
        )}

        {hasNext && (
          <button type="button" className="lightbox-nav-btn next" onClick={onNext} aria-label="Next image">
            ›
          </button>
        )}

        <div className="lightbox-image-wrap">
          <img src={image.src} alt={image.title || "Product Asset"} />
        </div>

        <div className="lightbox-caption">
          <div className="caption-text">
            <strong>{image.title}</strong>
            {image.subtitle && <span>{image.subtitle}</span>}
          </div>
          <a
            href={image.src}
            target="_blank"
            rel="noreferrer"
            className="lightbox-open-external"
            download
          >
            Open Original ↗
          </a>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   INTERACTIVE MEDIA CARD
========================================================= */

function MediaCard({ item, designerMode, onUpdate, onInspectImage }) {
  const [notes, setNotes] = useState(item.notes || "");
  const [feedback, setFeedback] = useState(item.feedback || "");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef(null);
  const locked = ["IN_REVIEW", "APPROVED"].includes(item.status);
  const statusCfg = MEDIA_STATUS_CONFIG[item.status] || MEDIA_STATUS_CONFIG.QUEUED;

  // Cleanup object URLs when selected files change
  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleFileSelection = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const validFiles = [];
    for (const f of incoming) {
      if (f.size > 10 * 1024 * 1024) {
        showErrorToast(`"${f.name}" is over 10 MB limit. Please resize.`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
        showErrorToast(`"${f.name}" must be JPG, PNG, or WebP.`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length + selectedFiles.length > 12) {
      showWarningToast("Maximum 12 generated assets allowed per product.");
      const allowed = validFiles.slice(0, 12 - selectedFiles.length);
      setSelectedFiles((prev) => [...prev, ...allowed]);
    } else {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveSelectedFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCopyFigma = () => {
    if (!item.figma_url) return;
    navigator.clipboard.writeText(item.figma_url);
    setIsCopied(true);
    showSuccessToast("Figma link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const submit = async (action) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("action", action);

      if (designerMode) {
        body.append("feedback", feedback);
      } else {
        if (item.figma_url) body.append("figma_url", item.figma_url);
        body.append("notes", notes.trim());
        selectedFiles.forEach((file) => body.append("images", file));
      }

      const updated = await submitMediaAction(item.id, body);
      setSelectedFiles([]);
      onUpdate(updated);

      if (action === "send") {
        showSuccessToast("Deliverables dispatched to Designer Portal for review!", "Sent to Designer");
      } else if (action === "approve") {
        showDesignerAcceptedToast(item.product_name, item.sku);
      } else if (action === "changes") {
        showWarningToast("Revision feedback sent to media team.", "Changes Requested");
      } else {
        showSuccessToast("Draft creative work saved.", "Saved");
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to process media action");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`ZENVE-media-card ${statusCfg.badgeClass}`}>
      {/* 1. CARD HEADER */}
      <div className="card-top-bar">
        <div className="product-identity">
          <div className="sku-badge-row">
            <span className="sku-tag">{item.sku}</span>
            <span className="brand-tag">{item.brand}</span>
            {item.designer_name && <span className="designer-tag">By {item.designer_name}</span>}
          </div>
          <h3 className="product-name">{item.product_name}</h3>
        </div>

        <div className="status-badge-wrap">
          <span className={`status-pill ${statusCfg.tone}`}>
            {statusCfg.label}
          </span>
          {item.sent_at && (
            <span className="sent-timestamp" title={new Date(item.sent_at).toLocaleString("en-IN")}>
              Dispatched {new Date(item.sent_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* 2. DUAL PHOTOGRAPHY WORKSPACE */}
      <div className="card-photography-workspace">
        {/* SECTION A: 4 DESIGNER ORIGINALS */}
        <div className="photo-lane">
          <div className="lane-header">
            <h4>
              <span className="lane-counter">4/4</span>
              <span>Designer Original Photography</span>
            </h4>
            <span className="lane-sub">Standard angles required from studio upload</span>
          </div>

          <div className="originals-grid">
            {item.originals.map((orig, idx) => (
              <div
                key={orig.id}
                className="image-box"
                onClick={() =>
                  onInspectImage({
                    src: orig.image,
                    title: `${item.product_name} — Original Photo ${idx + 1}`,
                    subtitle: POSITION_NAMES[orig.position] || `Angle ${idx + 1}`,
                  })
                }
              >
                <img src={orig.image} alt={`Original ${idx + 1}`} loading="lazy" />
                <div className="image-overlay">
                  <ZoomIcon />
                  <span>Inspect</span>
                </div>
                <span className="image-pos-badge">
                  {POSITION_NAMES[orig.position] || `Angle ${idx + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION B: GENERATED LUXURY ASSETS */}
        <div className="photo-lane generated-lane">
          <div className="lane-header">
            <h4>
              <span className="lane-counter accent">{item.assets.length}</span>
              <span>Generated Creative Deliverables</span>
            </h4>
            <span className="lane-sub">
              {item.assets.length
                ? "Retouched brand visuals ready for storefront review"
                : "Awaiting media team generation"}
            </span>
          </div>

          {item.assets.length > 0 ? (
            <div className="generated-grid">
              {item.assets.map((asset, idx) => (
                <div
                  key={asset.id}
                  className="image-box"
                  onClick={() =>
                    onInspectImage({
                      src: asset.image,
                      title: `${item.product_name} — Generated Creative Asset ${idx + 1}`,
                      subtitle: `Deliverable ${idx + 1} of ${item.assets.length}`,
                    })
                  }
                >
                  <img src={asset.image} alt={`Generated asset ${idx + 1}`} loading="lazy" />
                  <div className="image-overlay">
                    <ZoomIcon />
                    <span>Inspect</span>
                  </div>
                  <span className="image-pos-badge gold">Asset #{idx + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-generated-box">
              <UploadCloudIcon />
              <p>No generated assets delivered yet.</p>
              <span>Upload up to 12 retouched creatives below to dispatch for designer review.</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. FIGMA INTEGRATION BAR (Shown only if linked) */}
      {item.figma_url && (
        <div className="figma-integration-bar">
          <div className="figma-brand-label">
            <FigmaIcon />
            <span>Figma Workspace</span>
          </div>

          <div className="figma-link-pill">
            <a
              href={item.figma_url}
              target="_blank"
              rel="noreferrer"
              className="figma-external-link"
              title={item.figma_url}
            >
              Open Creative File in Figma ↗
            </a>
            <button
              type="button"
              className="figma-copy-btn"
              onClick={handleCopyFigma}
              title="Copy Figma URL"
            >
              {isCopied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* 4. FEEDBACK / REVISION THREAD */}
      {item.feedback && (
        <div className="media-feedback-callout">
          <div className="feedback-badge">
            <EditIcon />
            <span>Designer Revision Feedback</span>
          </div>
          <p className="feedback-body">{item.feedback}</p>
        </div>
      )}

      {/* 5. NOTES TO DESIGNER */}
      {item.notes && designerMode && (
        <div className="media-notes-callout">
          <span className="notes-author">Message from Creative Director:</span>
          <p className="notes-body">{item.notes}</p>
        </div>
      )}

      {/* 6. ACTION FORMS (DESIGNER MODE VS MEDIA TEAM MODE) */}
      <div className="card-action-zone">
        {designerMode ? (
          /* DESIGNER MODE CONTROLS */
          <div className="designer-review-controls">
            {item.status === "IN_REVIEW" && (
              <div className="review-action-box">
                <label className="input-label" htmlFor={`feedback-${item.id}`}>
                  <span>Your Revision Notes (Required if requesting changes)</span>
                </label>
                <textarea
                  id={`feedback-${item.id}`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="E.g. Please enhance contrast on the back view and sharpen fabric texture..."
                  className="ZENVE-textarea"
                  rows={3}
                  maxLength={10000}
                />

                <div className="action-buttons-row">
                  <button
                    type="button"
                    className="ZENVE-btn-success"
                    disabled={busy}
                    onClick={() => submit("approve")}
                  >
                    <CheckCircleIcon />
                    <span>{busy ? "Accepting..." : "Accept & Approve Images"}</span>
                  </button>

                  <button
                    type="button"
                    className="ZENVE-btn-warning"
                    disabled={busy || !feedback.trim()}
                    onClick={() => submit("changes")}
                  >
                    <EditIcon />
                    <span>{busy ? "Submitting..." : "Request Creative Changes"}</span>
                  </button>
                </div>
              </div>
            )}

            {item.status === "CHANGES_REQUESTED" && (
              <div className="status-notice-box info">
                <span>The media studio is applying your revisions. The next delivery will appear here once sent.</span>
              </div>
            )}

            {item.status === "APPROVED" && (
              <div className="status-notice-box success">
                <CheckCircleIcon />
                <span>These visuals are approved and actively syndicated to the storefront catalogue.</span>
              </div>
            )}
          </div>
        ) : (
          /* MEDIA TEAM WORKSPACE CONTROLS */
          <fieldset className="media-team-controls" disabled={busy}>
            {/* MESSAGE / NOTES INPUT */}
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="input-label" htmlFor={`notes-input-${item.id}`}>
                <span>Creative Direction Notes to Designer</span>
              </label>
              <input
                id={`notes-input-${item.id}`}
                type="text"
                value={notes}
                disabled={locked}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain lighting, color treatment, or design nuances..."
                className="ZENVE-input-text"
                maxLength={10000}
              />
            </div>

            {/* DRAG AND DROP UPLOAD ZONE */}
            <div
              className={`media-upload-dropzone ${dragOver ? "drag-over" : ""} ${locked ? "disabled" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!locked) handleFileSelection(e.dataTransfer.files);
              }}
              onClick={() => {
                if (!locked && fileInputRef.current) fileInputRef.current.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFileSelection(e.target.files)}
              />
              <UploadCloudIcon />
              <div className="dropzone-text">
                <strong>Click or drag & drop generated visuals</strong>
                <span>JPG, PNG or WebP · Up to 12 images · Max 10 MB per asset</span>
              </div>
            </div>

            {/* CLIENT-SIDE FILE PREVIEW THUMBNAILS */}
            {selectedFiles.length > 0 && (
              <div className="selected-files-preview-strip">
                <div className="preview-strip-header">
                  <span>{selectedFiles.length} new asset(s) ready to upload:</span>
                  <button
                    type="button"
                    className="btn-clear-selection"
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </button>
                </div>

                <div className="preview-thumbnails-grid">
                  {selectedFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="preview-thumb-card">
                      <img src={previewUrls[idx]} alt={file.name} />
                      <div className="thumb-info">
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-thumb"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSelectedFile(idx);
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="media-action-footer">
              {locked && (
                <span className="lock-notice">
                  Delivery locked while in designer review or approved.
                </span>
              )}

              <div className="buttons-cluster">
                {item.status === "IN_REVIEW" && (
                  <button
                    type="button"
                    className="ZENVE-btn-success"
                    disabled={busy}
                    onClick={() => submit("approve")}
                    title="Accept images on behalf of designer"
                  >
                    <CheckCircleIcon />
                    <span>{busy ? "Accepting..." : "Accept Images (Designer Sign-Off)"}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-secondary"
                  disabled={busy || locked}
                  onClick={() => submit("save")}
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-primary"
                  disabled={busy || locked || (!selectedFiles.length && !item.assets.length)}
                  onClick={() => submit("send")}
                >
                  <SendIcon />
                  <span>{busy ? "Sending..." : "Dispatch to Designer"}</span>
                </button>
              </div>
            </div>
          </fieldset>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   MEDIA WORKSPACE (CORE EXPORT)
========================================================= */

export function MediaWorkspace({
  designerId,
  onApprovalsChange,
  filterToProductId,
  unreadApprovals = [],
  onDismissApproval,
}) {
  const designerMode = designerId !== undefined;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState(null);

  // Previous status map for real-time approval detection
  const prevStatusMapRef = useRef(new Map());

  // Fetch Media Items
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    if (designerMode && !designerId) {
      setLoading(false);
      return;
    }

    getMediaQueue(designerId)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load media products");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [designerId, designerMode, refreshCounter]);

  // Real-time background sync (every 12 seconds)
  useEffect(() => {
    if (designerMode) return;

    const interval = setInterval(() => {
      getMediaQueue()
        .then((fresh) => {
          setItems((prev) => {
            const prevMap = prevStatusMapRef.current;
            fresh.forEach((item) => {
              if (
                item.status === "APPROVED" &&
                prevMap.has(item.id) &&
                prevMap.get(item.id) !== "APPROVED"
              ) {
                // Newly accepted by designer! Trigger bottom-right SweetAlert
                showDesignerAcceptedToast(item.product_name, item.sku);
              }
            });

            const newMap = new Map();
            fresh.forEach((item) => newMap.set(item.id, item.status));
            prevStatusMapRef.current = newMap;

            return fresh;
          });
        })
        .catch(() => {});
    }, 12000);

    return () => clearInterval(interval);
  }, [designerMode]);

  // Initial map setup & notify parent of approvals
  useEffect(() => {
    if (items.length > 0) {
      if (prevStatusMapRef.current.size === 0) {
        const map = new Map();
        items.forEach((item) => map.set(item.id, item.status));
        prevStatusMapRef.current = map;
      }
      if (!designerMode) {
        const approved = items.filter((i) => i.status === "APPROVED");
        onApprovalsChange?.(approved);
      }
    }
  }, [items, designerMode, onApprovalsChange]);

  // Focus filter if filterToProductId is provided from notification click
  useEffect(() => {
    if (filterToProductId) {
      setActiveStatusFilter("ALL");
      setBrandFilter("ALL");
      const matched = items.find((i) => i.id === filterToProductId);
      if (matched) {
        setSearchQuery(matched.sku);
      }
    }
  }, [filterToProductId, items]);

  // Compute KPI Counts
  const kpis = useMemo(() => {
    return {
      total: items.length,
      queued: items.filter((i) => i.status === "QUEUED").length,
      inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
      inReview: items.filter((i) => i.status === "IN_REVIEW").length,
      changesRequested: items.filter((i) => i.status === "CHANGES_REQUESTED").length,
      approved: items.filter((i) => i.status === "APPROVED").length,
      totalAssets: items.reduce((sum, i) => sum + (i.assets?.length || 0), 0),
    };
  }, [items]);

  // Available brands for dropdown
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.brand).filter(Boolean))).sort();
  }, [items]);

  // Filtered & Sorted items
  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesStatus =
          activeStatusFilter === "ALL" || item.status === activeStatusFilter;

        const matchesBrand =
          brandFilter === "ALL" || item.brand === brandFilter;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          `${item.product_name} ${item.sku} ${item.brand} ${item.designer_name}`
            .toLowerCase()
            .includes(q);

        return matchesStatus && matchesBrand && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === "SKU") return a.sku.localeCompare(b.sku);
        if (sortOrder === "BRAND") return (a.brand || "").localeCompare(b.brand || "");
        return b.id - a.id; // Newest first
      });
  }, [items, activeStatusFilter, brandFilter, searchQuery, sortOrder]);

  return (
    <section className="ZENVE-media-workspace">
      {/* DESIGNER APPROVAL ALERT BANNER */}
      {!designerMode && unreadApprovals.length > 0 && (
        <div className="media-approval-alert-banner">
          <div className="banner-icon-title">
            <CheckCircleIcon />
            <div className="banner-text-block">
              <span className="banner-badge">DESIGNER APPROVED</span>
              <p>
                <strong>{unreadApprovals[0].designer_name || "Designer"}</strong> accepted creative images for{" "}
                <strong>{unreadApprovals[0].product_name}</strong> ({unreadApprovals[0].sku}). Visuals are approved for the catalogue storefront.
                {unreadApprovals.length > 1 && ` (+${unreadApprovals.length - 1} more approvals)`}
              </p>
            </div>
          </div>
          <div className="banner-actions">
            <button
              type="button"
              className="btn-banner-view"
              onClick={() => {
                setActiveStatusFilter("APPROVED");
                setSearchQuery("");
              }}
            >
              View Approved ({kpis.approved})
            </button>
            <button
              type="button"
              className="btn-banner-dismiss"
              onClick={() => onDismissApproval?.(unreadApprovals.map((i) => i.id))}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 1. SECTION TITLE & REFRESH */}
      <div className="workspace-hero-bar">
        <div>
          <h2 className="workspace-title">
            {designerMode ? "Creative Media Deliverables" : "Studio Creative Production Queue"}
          </h2>
          <p className="workspace-subtitle">
            {designerMode
              ? "Review photography deliverables from the creative studio, inspect high-resolution assets, and approve for catalogue."
              : "Studio pipeline: 4 Original Studio Photos → Figma Creative Direction → Retouched Generated Assets → Designer Review & Approval."}
          </p>
        </div>

        <button
          type="button"
          className="ZENVE-btn ZENVE-btn-secondary btn-refresh"
          disabled={loading}
          onClick={() => {
            setRefreshCounter((n) => n + 1);
            showSuccessToast("Media pipeline synchronized.");
          }}
          title="Refresh queue"
        >
          <RefreshIcon spinning={loading} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. TOP KPI METRICS TILES */}
      <div className="ZENVE-media-kpi-grid">
        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "ALL" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("ALL")}
        >
          <span className="kpi-label">Total Pipeline</span>
          <strong className="kpi-val">{kpis.total}</strong>
          <span className="kpi-hint">{kpis.totalAssets} deliverables created</span>
        </div>

        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "QUEUED" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("QUEUED")}
        >
          <span className="kpi-label">Ready for Media</span>
          <strong className="kpi-val text-blue">{kpis.queued}</strong>
          <span className="kpi-hint">4 originals verified</span>
        </div>

        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "IN_PROGRESS" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("IN_PROGRESS")}
        >
          <span className="kpi-label">In Progress</span>
          <strong className="kpi-val text-purple">{kpis.inProgress}</strong>
          <span className="kpi-hint">Figma art direction</span>
        </div>

        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "IN_REVIEW" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("IN_REVIEW")}
        >
          <span className="kpi-label">Under Review</span>
          <strong className="kpi-val text-amber">{kpis.inReview}</strong>
          <span className="kpi-hint">With brand partners</span>
        </div>

        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "CHANGES_REQUESTED" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("CHANGES_REQUESTED")}
        >
          <span className="kpi-label">Revisions Needed</span>
          <strong className="kpi-val text-red">{kpis.changesRequested}</strong>
          <span className="kpi-hint">Feedback to address</span>
        </div>

        <div
          className={`ZENVE-media-kpi-card ${activeStatusFilter === "APPROVED" ? "selected" : ""}`}
          onClick={() => setActiveStatusFilter("APPROVED")}
        >
          <span className="kpi-label">Approved & Live</span>
          <strong className="kpi-val text-green">{kpis.approved}</strong>
          <span className="kpi-hint">Storefront ready</span>
        </div>
      </div>

      {/* 3. FILTER CONTROLS & TOOLBAR */}
      <div className="ZENVE-media-toolbar">
        {/* Search */}
        <div className="toolbar-search">
          <input
            type="text"
            placeholder="Search by product, SKU, brand, or designer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ZENVE-input-text search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="toolbar-filter-item">
          <label htmlFor="media-status-select">Status:</label>
          <select
            id="media-status-select"
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value)}
            className="ZENVE-select"
          >
            <option value="ALL">All Statuses ({kpis.total})</option>
            {Object.entries(MEDIA_STATUS_CONFIG).map(([stKey, cfg]) => (
              <option key={stKey} value={stKey}>
                {cfg.label} ({items.filter((i) => i.status === stKey).length})
              </option>
            ))}
          </select>
        </div>

        {/* Brand Dropdown */}
        {uniqueBrands.length > 1 && (
          <div className="toolbar-filter-item">
            <label htmlFor="media-brand-select">Brand:</label>
            <select
              id="media-brand-select"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="ZENVE-select"
            >
              <option value="ALL">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div className="toolbar-filter-item">
          <label htmlFor="media-sort-select">Sort:</label>
          <select
            id="media-sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="ZENVE-select"
          >
            <option value="NEWEST">Newest First</option>
            <option value="SKU">SKU Code (A-Z)</option>
            <option value="BRAND">Brand (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN ITEMS LIST */}
      {loading ? (
        <div className="ZENVE-empty-box">
          <RefreshIcon spinning={true} />
          <p>Connecting to creative production pipeline...</p>
        </div>
      ) : error ? (
        <div className="ZENVE-alert-box error">
          <span>{error}</span>
          <button
            type="button"
            className="ZENVE-btn ZENVE-btn-secondary"
            onClick={() => setRefreshCounter((n) => n + 1)}
          >
            Retry Connection
          </button>
        </div>
      ) : !visibleItems.length ? (
        <div className="ZENVE-empty-box">
          <UploadCloudIcon />
          <h3>No products in this view</h3>
          <p>
            {items.length
              ? "No creative assets match the selected filters."
              : designerMode
              ? "No creative deliveries yet. Visual deliverables sent by the creative team will appear here for your approval."
              : "Products automatically enter the Media Studio queue as soon as a designer uploads all four original product angles."}
          </p>
          {(activeStatusFilter !== "ALL" || brandFilter !== "ALL" || searchQuery) && (
            <button
              type="button"
              className="ZENVE-btn ZENVE-btn-secondary"
              onClick={() => {
                setActiveStatusFilter("ALL");
                setBrandFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="media-cards-stack">
          {visibleItems.map((item) => (
            <MediaCard
              key={`${designerId || "team"}-${item.id}`}
              item={item}
              designerMode={designerMode}
              onInspectImage={setLightboxImage}
              onUpdate={(updated) =>
                setItems((prev) =>
                  prev.map((i) => (i.id === updated.id ? updated : i))
                )
              }
            />
          ))}
        </div>
      )}

      {/* 5. LIGHTBOX MODAL */}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </section>
  );
}

/* =========================================================
   STANDALONE MEDIA STUDIO PAGE (LAYER 13)
========================================================= */

export default function MediaStudio() {
  const [approvals, setApprovals] = useState([]);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [filterToProductId, setFilterToProductId] = useState(null);
  const [readApprovalIds, setReadApprovalIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("zenve_read_media_approvals") || "[]");
    } catch {
      return [];
    }
  });

  const unreadApprovals = useMemo(() => {
    return approvals.filter((item) => !readApprovalIds.includes(item.id));
  }, [approvals, readApprovalIds]);

  const markAllRead = () => {
    const allIds = approvals.map((i) => i.id);
    setReadApprovalIds(allIds);
    try {
      localStorage.setItem("zenve_read_media_approvals", JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleDismissApproval = (idsToDismiss) => {
    setReadApprovalIds((prev) => {
      const next = Array.from(new Set([...prev, ...idsToDismiss]));
      try {
        localStorage.setItem("zenve_read_media_approvals", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="ZENVE-media-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-media-header">
        <div className="ZENVE-header-left">
          <Link to="/" className="ZENVE-portal-logo" aria-label="Go to home">
            <img src={zenveLogo} alt="Zenve Fashion" />
          </Link>

          <div className="ZENVE-header-title-block">
            <Link to="/" className="ZENVE-back-link">
              <BackIcon />
              <span>ALL 15 LAYERS</span>
            </Link>

            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">13</span>
              <span>Media Studio</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Creative Operations · Transform raw studio photography into luxury high-converting editorial assets and manage brand approvals.
            </p>
          </div>
        </div>

        <div className="ZENVE-header-right">
          <SearchBar />

          <button
            type="button"
            className="ZENVE-media-notif-btn"
            onClick={() => setNotifDrawerOpen(true)}
            aria-label="Open designer approvals notifications"
            title={
              unreadApprovals.length > 0
                ? `${unreadApprovals.length} new designer approval${unreadApprovals.length > 1 ? "s" : ""}`
                : "Designer Approvals"
            }
          >
            <BellIcon />
            {unreadApprovals.length > 0 && (
              <span className="ZENVE-media-notif-badge">
                {unreadApprovals.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN WORKSPACE CONTAINER
      ===================================================== */}
      <main className="ZENVE-media-main">
        <MediaWorkspace
          onApprovalsChange={setApprovals}
          filterToProductId={filterToProductId}
          unreadApprovals={unreadApprovals}
          onDismissApproval={handleDismissApproval}
        />
      </main>

      {/* =====================================================
          NOTIFICATIONS DRAWER / SIDEBAR
      ===================================================== */}
      {notifDrawerOpen && (
        <div
          className="ZENVE-notif-backdrop"
          onClick={() => setNotifDrawerOpen(false)}
          aria-hidden="true"
        >
          <div
            className="ZENVE-notif-sidebar"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-notif-title"
          >
            <div className="ZENVE-notif-sidebar-header">
              <div className="ZENVE-notif-sidebar-title-wrap">
                <div className="ZENVE-notif-sidebar-title-row">
                  <h2 id="media-notif-title" className="ZENVE-notif-sidebar-title">
                    Designer Approvals
                  </h2>
                  {unreadApprovals.length > 0 ? (
                    <span className="ZENVE-notif-count-pill">
                      {unreadApprovals.length} new
                    </span>
                  ) : (
                    <span className="ZENVE-notif-count-pill subtle">
                      All caught up
                    </span>
                  )}
                </div>
                <p className="ZENVE-notif-sidebar-sub">
                  Live notifications when designers accept & approve creative media deliverables.
                </p>
              </div>

              <button
                type="button"
                className="ZENVE-notif-sidebar-close"
                onClick={() => setNotifDrawerOpen(false)}
                aria-label="Close notifications sidebar"
              >
                ×
              </button>
            </div>

            <div className="ZENVE-notif-sidebar-actions">
              <span className="ZENVE-label-caps">
                {approvals.length} Approved Product{approvals.length === 1 ? "" : "s"}
              </span>

              {unreadApprovals.length > 0 && (
                <button
                  type="button"
                  className="ZENVE-btn-outline-sm"
                  onClick={markAllRead}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="ZENVE-notif-sidebar-body">
              {approvals.length === 0 ? (
                <div className="ZENVE-item-empty">
                  No designer approvals yet. Deliverables accepted by brand designers will automatically notify here.
                </div>
              ) : (
                <div className="ZENVE-notifications-list">
                  {approvals.map((item) => {
                    const isUnread = !readApprovalIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`ZENVE-notification-row ${isUnread ? "unread" : ""}`}
                      >
                        <div className="ZENVE-notif-left">
                          {isUnread && <span className="ZENVE-unread-dot" />}
                          <div className="media-notif-content">
                            <div className="media-notif-title-row">
                              <CheckCircleIcon />
                              <strong className="media-notif-title">
                                Approved by Designer
                              </strong>
                            </div>
                            <span className="media-notif-product-name">
                              {item.product_name}
                            </span>
                            <span className="media-notif-sku-info">
                              SKU: {item.sku} {item.designer_name ? `· By ${item.designer_name}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="ZENVE-notif-right">
                          <span className="ZENVE-tone-badge good">
                            Approved
                          </span>
                          <button
                            type="button"
                            className="btn-media-notif-view"
                            onClick={() => {
                              setFilterToProductId(item.id);
                              setNotifDrawerOpen(false);
                            }}
                            title="Inspect product deliverables"
                          >
                            Inspect →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="ZENVE-notif-sidebar-footer">
              <button
                type="button"
                className="ZENVE-btn ZENVE-btn-secondary"
                onClick={() => setNotifDrawerOpen(false)}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
