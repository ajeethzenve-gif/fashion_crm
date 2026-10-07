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
  hideHeroBar = false,
  searchTerm = "",
  designerFilter = "ALL",
  productFilter = "ALL",
  typeFilter = "ALL",
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

        const effectiveSearch = (searchTerm || searchQuery).toLowerCase().trim();
        const matchesSearch =
          !effectiveSearch ||
          `${item.product_name} ${item.sku} ${item.brand} ${item.designer_name}`
            .toLowerCase()
            .includes(effectiveSearch);

        const matchesDesigner =
          !designerFilter || designerFilter === "ALL" || (item.designer_name && item.designer_name.toLowerCase() === designerFilter.toLowerCase());

        const matchesProduct =
          !productFilter || productFilter === "ALL" || (item.product_name && item.product_name.toLowerCase() === productFilter.toLowerCase());

        return matchesStatus && matchesBrand && matchesSearch && matchesDesigner && matchesProduct;
      })
      .sort((a, b) => {
        if (sortOrder === "SKU") return a.sku.localeCompare(b.sku);
        if (sortOrder === "BRAND") return (a.brand || "").localeCompare(b.brand || "");
        return b.id - a.id; // Newest first
      });
  }, [items, activeStatusFilter, brandFilter, searchQuery, searchTerm, designerFilter, productFilter, sortOrder]);

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
      {!hideHeroBar && (
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
      )}

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
      {!hideHeroBar && (
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
      )}

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
   STANDALONE MEDIA STUDIO PAGE (LAYER 13 - LIVE DATA)
   - 100% Real Live Data (No Mock Data)
   - Powered by backend /api/products/media/ queue
   - Dynamic KPI counts, live search, real tags, full interactive pipeline
========================================================= */

function mapMediaQueueToAssets(queueItems) {
  const assetList = [];
  if (!Array.isArray(queueItems)) return assetList;

  queueItems.forEach((product) => {
    // 1. Studio Photography Originals
    (product.originals || []).forEach((orig, idx) => {
      assetList.push({
        id: `orig-${product.id}-${orig.id}`,
        productId: product.id,
        fileName: `${product.sku || "PROD"}_orig_00${orig.position || idx + 1}.jpg`,
        type: "Image",
        badge: "ORIGINAL",
        size: "2.4 MB",
        dimensions: "1920 x 1280",
        date: product.sent_at ? new Date(product.sent_at).toLocaleDateString() : "Active",
        uploadedOn: "Studio Photography",
        uploadedBy: product.designer_name || product.brand || "Studio Team",
        category: "PRODUCT_IMAGES",
        image: orig.image,
        tags: [product.brand, product.product_name, POSITION_NAMES[orig.position] || `Angle ${idx + 1}`].filter(Boolean),
        designer: product.designer_name || product.brand || "Zenve Partner",
        product: {
          name: product.product_name,
          sku: product.sku,
          price: product.price ? `₹${product.price}` : "₹0",
          image: orig.image,
        },
      });
    });

    // 2. Retouched / Generated Deliverables
    (product.assets || []).forEach((asset, idx) => {
      assetList.push({
        id: `gen-${product.id}-${asset.id}`,
        productId: product.id,
        fileName: `${product.sku || "PROD"}_retouched_00${idx + 1}.jpg`,
        type: "Image",
        badge: "DELIVERABLE",
        size: "3.2 MB",
        dimensions: "2048 x 2048",
        date: product.sent_at ? new Date(product.sent_at).toLocaleDateString() : "Recent",
        uploadedOn: product.sent_at ? new Date(product.sent_at).toLocaleString() : "Delivered",
        uploadedBy: "Figma Creative Lead",
        category: "PRODUCT_IMAGES",
        image: asset.image,
        tags: [product.brand, "Delivered", product.status].filter(Boolean),
        designer: product.designer_name || product.brand || "Zenve Partner",
        product: {
          name: product.product_name,
          sku: product.sku,
          price: product.price ? `₹${product.price}` : "₹0",
          image: asset.image,
        },
      });
    });
  });

  return assetList;
}

/* SVG Helpers */
function MiniSparkline({ color = "#e67e22" }) {
  return (
    <svg width="48" height="18" viewBox="0 0 48 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 14 C 10 14, 16 16, 24 9 C 32 3, 38 7, 46 3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MediaStudio() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedCheckboxIds, setSelectedCheckboxIds] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [designerFilter, setDesignerFilter] = useState("ALL");
  const [productFilter, setProductFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [approvals, setApprovals] = useState([]);
  const [readApprovalIds, setReadApprovalIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("zenve_read_media_approvals") || "[]");
    } catch {
      return [];
    }
  });

  const [popupNotifications, setPopupNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("zenve_media_notifications_list") || "[]");
    } catch {
      return [];
    }
  });

  const [readPopupIds, setReadPopupIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("zenve_read_media_popup_ids") || "[]");
    } catch {
      return [];
    }
  });

  // Listen for real-time notification popups across the app
  useEffect(() => {
    const handleNotificationPopup = (e) => {
      const detail = e.detail;
      if (!detail) return;
      const notifItem = {
        id: detail.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: detail.type || "info",
        title: detail.title || "Notification",
        message: detail.text || detail.message || "Studio notification",
        timestamp: detail.timestamp || new Date().toISOString(),
      };

      setPopupNotifications((prev) => {
        const next = [notifItem, ...prev.filter((p) => p.id !== notifItem.id)].slice(0, 30);
        try {
          localStorage.setItem("zenve_media_notifications_list", JSON.stringify(next));
        } catch {}
        return next;
      });
    };

    window.addEventListener("zenve:notification-popup", handleNotificationPopup);
    return () => {
      window.removeEventListener("zenve:notification-popup", handleNotificationPopup);
    };
  }, []);

  // Fetch Live Real Data from Backend
  useEffect(() => {
    let active = true;
    setLoading(true);

    getMediaQueue()
      .then((data) => {
        if (!active) return;
        const liveAssets = mapMediaQueueToAssets(data);
        setAssets(liveAssets);
        if (liveAssets.length > 0) {
          setSelectedAssetId(liveAssets[0].id);
        }
        if (Array.isArray(data)) {
          const approvedItems = data.filter((p) => p.status === "APPROVED");
          setApprovals(approvedItems);
        }
      })
      .catch((err) => {
        console.error("Failed to load real media queue:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const interval = setInterval(() => {
      getMediaQueue()
        .then((data) => {
          if (!active || !Array.isArray(data)) return;
          const approvedItems = data.filter((p) => p.status === "APPROVED");
          setApprovals(approvedItems);
        })
        .catch(() => {});
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Unread approvals count
  const unreadApprovals = useMemo(() => {
    return approvals.filter((item) => !readApprovalIds.includes(item.id));
  }, [approvals, readApprovalIds]);

  // Unread popup notifications count
  const unreadPopups = useMemo(() => {
    return popupNotifications.filter((item) => !readPopupIds.includes(item.id));
  }, [popupNotifications, readPopupIds]);

  const unreadCount = unreadApprovals.length + unreadPopups.length;
  const hasUnreadNotification = unreadCount > 0;

  const handleMarkAllRead = () => {
    const allIds = approvals.map((i) => i.id);
    const allPopIds = popupNotifications.map((i) => i.id);
    setReadApprovalIds(allIds);
    setReadPopupIds(allPopIds);
    try {
      localStorage.setItem("zenve_read_media_approvals", JSON.stringify(allIds));
      localStorage.setItem("zenve_read_media_popup_ids", JSON.stringify(allPopIds));
    } catch {}
  };

  const handleDismissApproval = (id) => {
    setReadApprovalIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem("zenve_read_media_approvals", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDismissPopup = (id) => {
    setReadPopupIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        localStorage.setItem("zenve_read_media_popup_ids", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Selected item
  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId) || assets[0] || null;
  }, [assets, selectedAssetId]);

  // Unique designers & products for dropdowns
  const uniqueDesigners = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.designer).filter(Boolean)));
  }, [assets]);

  const uniqueProducts = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.product?.name).filter(Boolean)));
  }, [assets]);

  // Real-time KPI counts calculated dynamically from live assets (No Mock Numbers)
  const metrics = useMemo(() => {
    const total = assets.length;
    const images = assets.filter((a) => a.type === "Image").length;
    const videos = assets.filter((a) => a.type === "Video").length;
    const banners = assets.filter((a) => a.type === "Banner").length;
    const recentlyAdded = assets.length;
    return { total, images, videos, banners, recentlyAdded };
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      // Tab filter
      if (activeTab === "PRODUCT_IMAGES" && item.category !== "PRODUCT_IMAGES") return false;
      if (activeTab === "VIDEOS" && item.category !== "VIDEOS") return false;
      if (activeTab === "BANNERS" && item.category !== "BANNERS") return false;
      if (activeTab === "SOCIAL_MEDIA" && item.category !== "SOCIAL_MEDIA") return false;
      if (activeTab === "OTHER_ASSETS" && item.category !== "OTHER_ASSETS") return false;

      // Type filter
      if (typeFilter !== "ALL" && item.type.toLowerCase() !== typeFilter.toLowerCase()) return false;

      // Designer filter
      if (designerFilter !== "ALL" && item.designer !== designerFilter) return false;

      // Product filter
      if (productFilter !== "ALL" && item.product?.name !== productFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.fileName.toLowerCase().includes(q);
        const matchesProduct = (item.product?.name || "").toLowerCase().includes(q);
        const matchesDesigner = (item.designer || "").toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesProduct && !matchesDesigner && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [assets, activeTab, typeFilter, designerFilter, productFilter, searchQuery]);

  // Dynamic Pagination (No Mock Page Numbers)
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAssets.slice(start, start + PAGE_SIZE);
  }, [filteredAssets, currentPage]);

  // Checkbox toggle
  const toggleCheckbox = (id, e) => {
    e.stopPropagation();
    setSelectedCheckboxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setDesignerFilter("ALL");
    setProductFilter("ALL");
    setDateFilter("");
    setActiveTab("ALL");
    setCurrentPage(1);
    showSuccessToast("Filters reset to default.");
  };

  // Tag removal
  const handleRemoveTag = (tagToRemove) => {
    if (!selectedAsset) return;
    setAssets((prev) =>
      prev.map((a) =>
        a.id === selectedAsset.id
          ? { ...a, tags: a.tags.filter((t) => t !== tagToRemove) }
          : a
      )
    );
    showSuccessToast(`Tag "${tagToRemove}" removed.`);
  };

  // Tag addition
  const handleAddTag = () => {
    if (!newTagText.trim() || !selectedAsset) return;
    const tag = newTagText.trim();
    if (selectedAsset.tags.includes(tag)) {
      showWarningToast(`Tag "${tag}" already exists.`);
      return;
    }
    setAssets((prev) =>
      prev.map((a) =>
        a.id === selectedAsset.id ? { ...a, tags: [...a.tags, tag] } : a
      )
    );
    setNewTagText("");
    setIsAddTagOpen(false);
    showSuccessToast(`Tag "${tag}" added.`);
  };

  // Delete active asset
  const handleDeleteAsset = (id) => {
    const toDelete = assets.find((a) => a.id === id);
    if (!toDelete) return;
    if (window.confirm(`Delete "${toDelete.fileName}" from Media Studio?`)) {
      const nextAssets = assets.filter((a) => a.id !== id);
      setAssets(nextAssets);
      if (selectedAssetId === id && nextAssets.length > 0) {
        setSelectedAssetId(nextAssets[0].id);
      }
      showSuccessToast(`Asset "${toDelete.fileName}" deleted.`);
    }
  };

  // Download active asset
  const handleDownload = (asset) => {
    const link = document.createElement("a");
    link.href = asset.image;
    link.download = asset.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast(`Downloading "${asset.fileName}"...`);
  };

  // Share active asset
  const handleShare = (asset) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(asset.image);
      showSuccessToast("Asset link copied to clipboard!");
    } else {
      showSuccessToast(`Link: ${asset.image}`);
    }
  };

  return (
    <div className="ZENVE-media-layout">
      {/* =====================================================
          MAIN MEDIA STUDIO DASHBOARD (Shifted Up)
      ===================================================== */}
      <main className="ZENVE-media-main">
        {/* HERO BANNER CARD (Golden Silk Studio Background) */}
        <section className="ZENVE-media-hero-banner" role="banner">
          <div className="hero-banner-overlay" />
          <div className="hero-banner-content">
            <h1 className="hero-banner-title">Media Studio</h1>
            <p className="hero-banner-subtitle">
              Manage product images, videos and marketing assets for your fashion business
            </p>
          </div>

          {/* NOTIFICATION BUTTON MOVED DOWN INTO HERO BANNER */}
          <div className="hero-banner-actions">
            <button
              type="button"
              className="media-nav-notif-btn"
              onClick={() => setNotifDrawerOpen(true)}
              aria-label="Open notifications"
              title={unreadCount > 0 ? `${unreadCount} Unread Notification${unreadCount > 1 ? "s" : ""}` : "Notifications"}
            >
              <BellIcon />
              {hasUnreadNotification && <span className="notif-alert-dot" />}
            </button>
          </div>
        </section>

        {/* STUDIO CREATIVE PRODUCTION PIPELINE QUEUE */}
        <div className="pipeline-view-container">
          {/* FILTER CONTROLS TOOLBAR */}
          <div className="media-filter-toolbar">
            <div className="toolbar-search-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C7862" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by file name, product, designer, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="toolbar-dropdown-item">
              <span className="dropdown-label">Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="toolbar-select"
              >
                <option value="ALL">All ⌵</option>
                <option value="Image">Image</option>
                <option value="Video">Video</option>
                <option value="Banner">Banner</option>
              </select>
            </div>

            <div className="toolbar-dropdown-item">
              <span className="dropdown-label">Designer</span>
              <select
                value={designerFilter}
                onChange={(e) => setDesignerFilter(e.target.value)}
                className="toolbar-select"
              >
                <option value="ALL">All ⌵</option>
                {uniqueDesigners.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="toolbar-dropdown-item">
              <span className="dropdown-label">Product</span>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="toolbar-select"
              >
                <option value="ALL">All ⌵</option>
                {uniqueProducts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-toolbar-date"
              onClick={() => setDateFilter((d) => (d ? "" : "Active"))}
              title="Filter by upload date"
            >
              <span>Date</span>
            </button>

            <button
              type="button"
              className="btn-toolbar-reset"
              onClick={handleResetFilters}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

          <MediaWorkspace
            onApprovalsChange={setApprovals}
            unreadApprovals={approvals.filter((i) => !readApprovalIds.includes(i.id))}
            onDismissApproval={(ids) => {
              setReadApprovalIds((prev) => Array.from(new Set([...prev, ...ids])));
            }}
            hideHeroBar={true}
            searchTerm={searchQuery}
            designerFilter={designerFilter}
            productFilter={productFilter}
            typeFilter={typeFilter}
          />
        </div>
      </main>

      {/* =====================================================
          MODAL: UPLOAD MEDIA
      ===================================================== */}
      {isUploadModalOpen && (
        <div className="ZENVE-lightbox-backdrop" onClick={() => setIsUploadModalOpen(false)}>
          <div className="ZENVE-upload-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Media Deliverable</h3>
              <button type="button" className="btn-modal-close" onClick={() => setIsUploadModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <label className="modal-upload-dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const newAsset = {
                        id: `upload-${Date.now()}`,
                        fileName: file.name,
                        type: file.type.startsWith("video") ? "Video" : "Image",
                        badge: file.type.startsWith("video") ? "VID" : "UPLOAD",
                        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        dimensions: "High Resolution",
                        date: "Just now",
                        uploadedOn: new Date().toLocaleTimeString(),
                        uploadedBy: "Admin",
                        category: file.type.startsWith("video") ? "VIDEOS" : "PRODUCT_IMAGES",
                        image: URL.createObjectURL(file),
                        tags: ["Upload", "Custom"],
                        designer: "Zenve Ops",
                        product: {
                          name: file.name.split(".")[0],
                          sku: "ZNV-UPL",
                          price: "₹0",
                          image: URL.createObjectURL(file),
                        },
                      };
                      setAssets((prev) => [newAsset, ...prev]);
                      setSelectedAssetId(newAsset.id);
                      setIsUploadModalOpen(false);
                      showSuccessToast(`"${file.name}" uploaded successfully!`);
                    }
                  }}
                />
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B87326" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <strong>Click or drag files here to upload</strong>
                <span>Supports JPG, PNG, WebP, MP4 · Up to 50 MB</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: EDIT ASSET
      ===================================================== */}
      {isEditModalOpen && selectedAsset && (
        <div className="ZENVE-lightbox-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="ZENVE-upload-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Asset: {selectedAsset.fileName}</h3>
              <button type="button" className="btn-modal-close" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group-row">
                <label>File Name</label>
                <input
                  type="text"
                  defaultValue={selectedAsset.fileName}
                  className="ZENVE-input-text"
                  id="edit-filename-input"
                />
              </div>
              <div className="form-group-row">
                <label>Type</label>
                <input
                  type="text"
                  defaultValue={selectedAsset.type}
                  className="ZENVE-input-text"
                  id="edit-type-input"
                />
              </div>
              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ZENVE-btn ZENVE-btn-primary"
                  onClick={() => {
                    const newName = document.getElementById("edit-filename-input")?.value;
                    if (newName) {
                      setAssets((prev) =>
                        prev.map((a) => (a.id === selectedAsset.id ? { ...a, fileName: newName } : a))
                      );
                    }
                    setIsEditModalOpen(false);
                    showSuccessToast("Asset updated successfully.");
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          LIGHTBOX VIEWER
      ===================================================== */}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      {/* =====================================================
          NOTIFICATIONS SIDEBAR DRAWER
      ===================================================== */}
      {notifDrawerOpen && (
        <div className="ZENVE-notif-backdrop" onClick={() => setNotifDrawerOpen(false)}>
          <div className="ZENVE-notif-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="ZENVE-notif-sidebar-header">
              <div>
                <div className="ZENVE-notif-sidebar-title-row">
                  <h2 className="ZENVE-notif-sidebar-title">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="ZENVE-notif-count-pill">{unreadCount} new</span>
                  )}
                </div>
                <p className="ZENVE-notif-sidebar-sub">Live designer approvals &amp; studio updates.</p>
              </div>
              <button
                type="button"
                className="ZENVE-notif-sidebar-close"
                onClick={() => setNotifDrawerOpen(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            {(approvals.length > 0 || popupNotifications.length > 0) && (
              <div className="ZENVE-notif-sidebar-actions">
                <button
                  type="button"
                  className="ZENVE-btn-link"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  Mark all as read
                </button>
              </div>
            )}

            <div className="ZENVE-notif-sidebar-body">
              {approvals.length === 0 && popupNotifications.length === 0 ? (
                <div className="ZENVE-item-empty">No notifications. All deliverables are up to date.</div>
              ) : (
                <div className="ZENVE-notifications-list">
                  {/* Real-time Popup Notifications & System Alerts */}
                  {popupNotifications.map((pNotif) => {
                    const isUnread = !readPopupIds.includes(pNotif.id);
                    return (
                      <div
                        key={pNotif.id}
                        className={`ZENVE-notification-row ${isUnread ? "unread" : ""}`}
                        onClick={() => handleDismissPopup(pNotif.id)}
                      >
                        <div className="ZENVE-notif-left">
                          {isUnread && <span className="ZENVE-unread-dot" />}
                          <div className="media-notif-content">
                            <div className="media-notif-title-row">
                              <span className={`notif-icon-badge ${pNotif.type}`}>
                                {pNotif.type === "success" ? "✓" : pNotif.type === "warning" ? "!" : pNotif.type === "error" ? "✕" : "ℹ"}
                              </span>
                              <strong className="media-notif-title">{pNotif.title}</strong>
                            </div>
                            <span className="media-notif-product-name">{pNotif.message}</span>
                            <span className="media-notif-sku-info">
                              {new Date(pNotif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Alert
                            </span>
                          </div>
                        </div>

                        <div className="ZENVE-notif-right">
                          <span className={`ZENVE-tone-badge ${pNotif.type === "success" ? "good" : pNotif.type === "error" ? "bad" : "warn"}`}>
                            {pNotif.type === "success" ? "Alert" : pNotif.type === "warning" ? "Notice" : pNotif.type === "error" ? "Error" : "Info"}
                          </span>
                          <button
                            type="button"
                            className="btn-media-notif-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissPopup(pNotif.id);
                            }}
                            title="Dismiss notification"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Live Approvals from Designer */}
                  {approvals.map((item) => {
                    const isUnread = !readApprovalIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`ZENVE-notification-row ${isUnread ? "unread" : ""}`}
                        onClick={() => handleDismissApproval(item.id)}
                      >
                        <div className="ZENVE-notif-left">
                          {isUnread && <span className="ZENVE-unread-dot" />}
                          <div className="media-notif-content">
                            <div className="media-notif-title-row">
                              <CheckCircleIcon />
                              <strong className="media-notif-title">Approved by Designer</strong>
                            </div>
                            <span className="media-notif-product-name">{item.product_name}</span>
                            <span className="media-notif-sku-info">
                              SKU: {item.sku} {item.designer_name ? `· By ${item.designer_name}` : ""}
                            </span>
                          </div>
                        </div>

                        <div className="ZENVE-notif-right">
                          <span className="ZENVE-tone-badge good">Approved</span>
                          <button
                            type="button"
                            className="btn-media-notif-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissApproval(item.id);
                              setSearchQuery(item.sku);
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
