import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/SocialMedia.css";
import SearchBar from "../components/SearchBar";
import zenveLogo from "../assest/logo/zenve-logo-fashion.png";
import {
  getSocialMediaCampaigns,
  updateSocialMediaCampaign,
  approachDesignerForGrowth,
  getDesigners,
} from "../services/api";
import { showSuccessToast, showErrorToast, showWarningToast } from "../utils/zenveToast";
import { useAuth } from "../context/AuthContext";

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
      xmlns="http://www.w3.org/2000/svg"
      className={spinning ? "zenve-spin" : ""}
    >
      <path d="M23 4V10H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 20V14H7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 9A9 9 0 0120.49 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function VideoCameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 10L21 6V18L15 14V10Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 11V13C3 14.1046 3.89543 15 5 15H6L10 19V5L6 9H5C3.89543 9 3 9.89543 3 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 9C16.1046 10.1046 16.1046 13.8954 15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18 6C20.2091 8.20914 20.2091 15.7909 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.39 8.26L21 9.27L16 13.14L17.45 19.66L12 16.27L6.55 19.66L8 13.14L3 9.27L9.61 8.26L12 2Z" fill="currentColor"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 16.92V19.92C22.0011 20.1986 21.9441 20.4743 21.8326 20.7294C21.721 20.9846 21.5574 21.2137 21.3521 21.4019C21.1468 21.5902 20.9044 21.7335 20.6407 21.8228C20.3769 21.912 20.0974 21.9452 19.82 21.92C16.7428 21.5857 13.787 20.5342 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49997 10.2413 2.44824 7.27109 2.12 4.18C2.09501 3.90356 2.12787 3.62486 2.21649 3.36173C2.30512 3.0986 2.44754 2.85679 2.63462 2.65172C2.8217 2.44665 3.0493 2.28289 3.30291 2.17117C3.55652 2.05945 3.83061 2.00221 4.11 2.00001H7.11C7.5953 1.99524 8.06579 2.16708 8.43376 2.48354C8.80173 2.80001 9.04207 3.23955 9.11 3.72C9.23662 4.68007 9.47144 5.62273 9.81 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65089C9.81415 8.02486 9.62886 8.36812 9.36 8.64L8.09 9.91C9.51355 12.4136 11.5864 14.4865 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1859 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9586 21.2094 15.2032 21.5265 15.5776C21.8437 15.952 22.0122 16.4302 22 16.92Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382C17.11 14.199 15.333 13.325 15.003 13.204C14.673 13.084 14.432 13.023 14.191 13.388C13.95 13.753 13.257 14.575 13.045 14.819C12.833 15.063 12.622 15.093 12.26 14.91C11.898 14.728 10.735 14.347 9.356 13.118C8.282 12.161 7.556 10.979 7.345 10.613C7.134 10.248 7.323 10.05 7.505 9.869C7.668 9.706 7.868 9.444 8.049 9.231C8.23 9.018 8.29 8.866 8.411 8.622C8.532 8.379 8.472 8.166 8.381 7.983C8.29 7.801 7.568 6.021 7.266 5.304C6.973 4.606 6.677 4.7 6.456 4.689L5.762 4.677C5.521 4.677 5.129 4.768 4.798 5.133C4.467 5.498 3.533 6.381 3.533 8.177C3.533 9.973 4.829 11.708 5.01 11.951C5.191 12.195 7.563 15.86 11.206 17.434C12.072 17.808 12.75 18.033 13.275 18.2C14.145 18.477 14.935 18.437 15.56 18.344C16.257 18.24 17.708 17.466 18.009 16.613C18.31 15.761 18.31 15.03 18.22 14.878C18.129 14.726 17.834 14.565 17.472 14.382ZM12.04 21.75C10.315 21.75 8.705 21.285 7.31 20.478L2.25 21.805L3.605 16.877C2.697 15.303 2.215 13.513 2.215 11.666C2.215 6.275 6.623 1.888 12.044 1.888C14.669 1.889 17.135 2.914 18.99 4.772C20.846 6.63 21.868 9.098 21.866 11.724C21.864 17.117 17.456 21.75 12.04 21.75Z"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M15 3H21V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* =========================================================
   STATUS MAPPINGS & STAGES
========================================================= */

const STATUS_CONFIG = {
  PENDING_REVIEW: {
    label: "Pending Review",
    badgeClass: "zenve-status-pending",
    stepIndex: 0,
    desc: "Received from Designer Portal · Awaiting initial outreach",
  },
  SHOOT_SCHEDULED: {
    label: "Shoot Scheduled",
    badgeClass: "zenve-status-scheduled",
    stepIndex: 1,
    desc: "Production team visit locked in · Designer approached",
  },
  IN_PRODUCTION: {
    label: "In Production",
    badgeClass: "zenve-status-production",
    stepIndex: 2,
    desc: "Shooting on-site / Editing Reels & High-res Assets",
  },
  CONTENT_READY: {
    label: "Content Ready",
    badgeClass: "zenve-status-ready",
    stepIndex: 3,
    desc: "Visuals edited, color-graded, and staged for launch",
  },
  PROMOTION_ACTIVE: {
    label: "Campaign Live",
    badgeClass: "zenve-status-live",
    stepIndex: 4,
    desc: "Live across Zenve social channels, Meta & Influencer network",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "zenve-status-completed",
    stepIndex: 5,
    desc: "Campaign successfully wrapped · Growth add-on fulfilled",
  },
};

const PIPELINE_STAGES = [
  { key: "PENDING_REVIEW", label: "Review" },
  { key: "SHOOT_SCHEDULED", label: "Scheduled" },
  { key: "IN_PRODUCTION", label: "Production" },
  { key: "CONTENT_READY", label: "Ready" },
  { key: "PROMOTION_ACTIVE", label: "Live" },
  { key: "COMPLETED", label: "Done" },
];

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function SocialMedia() {
  const { currentUser } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState({
    total_requests: 0,
    video_shoots: 0,
    social_promotions: 0,
    total_credits: 0,
    pending_review: 0,
    in_production: 0,
    live_active: 0,
  });
  const [designersList, setDesignersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [addonFilter, setAddonFilter] = useState("ALL"); // ALL, video_shoot, social_promotion, both
  const [designerFilter, setDesignerFilter] = useState("");

  // Modals
  const [approachModal, setApproachModal] = useState(null); // item to approach
  const [editModal, setEditModal] = useState(null); // item to edit
  const [imageModal, setImageModal] = useState(null); // image url to preview
  const [submitting, setSubmitting] = useState(false);

  // Approach Form State
  const [approachChannel, setApproachChannel] = useState("whatsapp");
  const [approachMessage, setApproachMessage] = useState("");
  const [approachShootDate, setApproachShootDate] = useState("");
  const [assignedCrew, setAssignedCrew] = useState("Lead Creative Team");

  // Edit Form State
  const [editStatus, setEditStatus] = useState("PENDING_REVIEW");
  const [editShootDate, setEditShootDate] = useState("");
  const [editCampaignUrl, setEditCampaignUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Load Initial Data
  useEffect(() => {
    loadData();
    loadDesigners();
  }, []);

  const loadDesigners = async () => {
    try {
      const data = await getDesigners();
      const list = Array.isArray(data) ? data : data?.results || [];
      setDesignersList(list);
    } catch {
      // Non-fatal
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (addonFilter !== "ALL") params.addon_type = addonFilter;
      if (designerFilter) params.designer = designerFilter;
      if (search) params.search = search;

      const data = await getSocialMediaCampaigns(params);
      setCampaigns(data?.results || []);
      if (data?.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      showErrorToast(err.message || "Failed to load Social Media campaigns");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Trigger search / filters
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [statusFilter, addonFilter, designerFilter, search]);

  /* =========================================================
     APPROACH DESIGNER MODAL OPEN
  ========================================================= */

  const openApproachModal = (campaign) => {
    setApproachModal(campaign);
    setApproachChannel("whatsapp");
    const dName = campaign?.designer?.designer_name || "Designer";
    const brand = campaign?.designer?.brand_name || "your brand";
    const pName = campaign?.product_name || "your new collection SKU";

    let template = `Hello ${dName}! Zenve Creative & Social Media operations is reaching out regarding your Growth Add-on for "${pName}". `;
    if (campaign.growth_video_shoot && campaign.growth_social_promotion) {
      template += `You requested an Exclusive Video & Photo Shoot and Social Media Promotion. We would love to schedule our production crew visit to your atelier!`;
    } else if (campaign.growth_video_shoot) {
      template += `You requested an Exclusive Video & Photo Shoot. Our on-site production team is ready to schedule a shoot at your location!`;
    } else {
      template += `You requested an Exclusive Social Media Promotion. We are preparing tailored Reels, Carousels, and Meta campaign placements for your piece!`;
    }

    setApproachMessage(template);
    setApproachShootDate(campaign?.social_media_shoot_date || "");
  };

  const submitApproach = async () => {
    if (!approachModal) return;
    setSubmitting(true);

    try {
      await approachDesignerForGrowth(approachModal.id, {
        message: approachMessage,
        shoot_date: approachShootDate || undefined,
        channel: approachChannel,
        assigned_crew: assignedCrew,
      });

      showSuccessToast(
        `Designer ${approachModal?.designer?.designer_name || ""} approached successfully!`,
        "Growth Add-on Outreach Logged"
      );

      // If WhatsApp selected, optionally open direct link
      if (approachChannel === "whatsapp") {
        const phone = approachModal?.designer?.phone_number || "";
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        if (cleanPhone) {
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(approachMessage)}`;
          window.open(waUrl, "_blank", "noopener,noreferrer");
        }
      }

      setApproachModal(null);
      loadData(true);
    } catch (err) {
      showErrorToast(err.message || "Failed to log designer approach");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     MANAGE / EDIT CAMPAIGN MODAL
  ========================================================= */

  const openEditModal = (campaign) => {
    setEditModal(campaign);
    setEditStatus(campaign?.social_media_status || "PENDING_REVIEW");
    setEditShootDate(campaign?.social_media_shoot_date || "");
    setEditCampaignUrl(campaign?.social_media_campaign_url || "");
    setEditNotes(campaign?.social_media_notes || "");
  };

  const submitEdit = async () => {
    if (!editModal) return;
    setSubmitting(true);

    try {
      await updateSocialMediaCampaign(editModal.id, {
        social_media_status: editStatus,
        social_media_shoot_date: editShootDate || null,
        social_media_campaign_url: editCampaignUrl,
        social_media_notes: editNotes,
      });

      showSuccessToast("Social media campaign details updated", "Campaign Synchronized");
      setEditModal(null);
      loadData(true);
    } catch (err) {
      showErrorToast(err.message || "Failed to update campaign");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     QUICK STATUS TRANSITION
  ========================================================= */

  const handleQuickStatus = async (productId, newStatus) => {
    try {
      await updateSocialMediaCampaign(productId, {
        social_media_status: newStatus,
      });
      showSuccessToast(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      loadData(true);
    } catch (err) {
      showErrorToast(err.message || "Failed to transition status");
    }
  };

  return (
    <div className="ZENVE-sm-layout">
      {/* =========================================================
          TOP NAVIGATION BAR (MATCHING SYSTEM LAYER STYLE)
      ========================================================= */}
      <header className="ZENVE-sm-header">
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
              <span className="ZENVE-layer-num">15</span>
              <span>Social Media</span>
            </h1>

            <p className="ZENVE-portal-desc">
              Marketing &amp; Creator Operations · Growth add-ons pipeline, video &amp; photo shoots, creator campaigns, and social promotion
            </p>
          </div>
        </div>

        <div className="ZENVE-sm-header-right">
          <SearchBar />
        </div>
      </header>

      {/* =========================================================
          KEY PERFORMANCE METRICS (KPIs)
      ========================================================= */}
      <section className="ZENVE-sm-metrics-strip">
        <div className="ZENVE-sm-kpi-card highlight">
          <div className="ZENVE-sm-kpi-header">
            <span className="ZENVE-sm-kpi-label">TOTAL GROWTH REQUESTS</span>
            <span className="ZENVE-sm-kpi-badge primary">SKUs</span>
          </div>
          <div className="ZENVE-sm-kpi-value">{metrics.total_requests}</div>
          <div className="ZENVE-sm-kpi-subtext">Directly approached from Designer Portal</div>
        </div>

        <div className="ZENVE-sm-kpi-card">
          <div className="ZENVE-sm-kpi-header">
            <span className="ZENVE-sm-kpi-label">VIDEO &amp; PHOTO SHOOTS</span>
            <span className="ZENVE-sm-kpi-icon-wrap video">
              <VideoCameraIcon />
            </span>
          </div>
          <div className="ZENVE-sm-kpi-value">{metrics.video_shoots}</div>
          <div className="ZENVE-sm-kpi-subtext">On-site team visits &amp; atelier shoots</div>
        </div>

        <div className="ZENVE-sm-kpi-card">
          <div className="ZENVE-sm-kpi-header">
            <span className="ZENVE-sm-kpi-label">SOCIAL PROMOTIONS</span>
            <span className="ZENVE-sm-kpi-icon-wrap promo">
              <MegaphoneIcon />
            </span>
          </div>
          <div className="ZENVE-sm-kpi-value">{metrics.social_promotions}</div>
          <div className="ZENVE-sm-kpi-subtext">Tailored campaign &amp; sales boost</div>
        </div>

        <div className="ZENVE-sm-kpi-card">
          <div className="ZENVE-sm-kpi-header">
            <span className="ZENVE-sm-kpi-label">IN PRODUCTION / SCHEDULED</span>
            <span className="ZENVE-sm-kpi-badge amber">ACTIVE</span>
          </div>
          <div className="ZENVE-sm-kpi-value">{metrics.in_production}</div>
          <div className="ZENVE-sm-kpi-subtext">On-site shoots &amp; creative editing</div>
        </div>

        <div className="ZENVE-sm-kpi-card">
          <div className="ZENVE-sm-kpi-header">
            <span className="ZENVE-sm-kpi-label">LIVE &amp; COMPLETED</span>
            <span className="ZENVE-sm-kpi-badge green">LIVE</span>
          </div>
          <div className="ZENVE-sm-kpi-value">{metrics.live_active}</div>
          <div className="ZENVE-sm-kpi-subtext">Delivered on social channels</div>
        </div>
      </section>

      {/* =========================================================
          FILTER & CONTROL BAR
      ========================================================= */}
      <section className="ZENVE-sm-controls-section">
        {/* Status Tabs */}
        <div className="ZENVE-sm-tabs-row">
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Requests ({metrics.total_requests})
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "PENDING_REVIEW" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING_REVIEW")}
          >
            Pending Review ({metrics.pending_review})
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "SHOOT_SCHEDULED" ? "active" : ""}`}
            onClick={() => setStatusFilter("SHOOT_SCHEDULED")}
          >
            Shoot Scheduled
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "IN_PRODUCTION" ? "active" : ""}`}
            onClick={() => setStatusFilter("IN_PRODUCTION")}
          >
            In Production
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "CONTENT_READY" ? "active" : ""}`}
            onClick={() => setStatusFilter("CONTENT_READY")}
          >
            Content Ready
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "PROMOTION_ACTIVE" ? "active" : ""}`}
            onClick={() => setStatusFilter("PROMOTION_ACTIVE")}
          >
            Live Campaigns
          </button>
          <button
            type="button"
            className={`ZENVE-sm-tab-btn ${statusFilter === "COMPLETED" ? "active" : ""}`}
            onClick={() => setStatusFilter("COMPLETED")}
          >
            Completed
          </button>
        </div>

        {/* Filters and Search Row */}
        <div className="ZENVE-sm-filters-row">
          <div className="ZENVE-sm-search-input-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, product name, or designer..."
              className="ZENVE-sm-search-input"
            />
          </div>

          <div className="ZENVE-sm-filter-group">
            <label>Add-on Type:</label>
            <select
              value={addonFilter}
              onChange={(e) => setAddonFilter(e.target.value)}
              className="ZENVE-sm-select"
            >
              <option value="ALL">All Growth Add-ons</option>
              <option value="video_shoot">Exclusive Video &amp; Photo Shoot</option>
              <option value="social_promotion">Exclusive Social Promotion</option>
            </select>
          </div>

          <div className="ZENVE-sm-filter-group">
            <label>Designer Brand:</label>
            <select
              value={designerFilter}
              onChange={(e) => setDesignerFilter(e.target.value)}
              className="ZENVE-sm-select"
            >
              <option value="">All Brands &amp; Designers</option>
              {designersList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand_name || d.designer_name} ({d.designer_name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="ZENVE-sm-sync-btn"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            title="Refresh Growth Add-ons Queue"
          >
            <RefreshIcon spinning={refreshing} />
            <span>{refreshing ? "Refreshing..." : "Sync Pipeline"}</span>
          </button>
        </div>
      </section>

      {/* =========================================================
          CAMPAIGN CARDS GRID
      ========================================================= */}
      <main className="ZENVE-sm-main-container">
        {loading ? (
          <div className="ZENVE-sm-empty-state">
            <div className="zenve-spin-large" />
            <p>Loading Growth Add-on campaigns from Designer Portal...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="ZENVE-sm-empty-state">
            <div className="ZENVE-sm-empty-icon">
              <MegaphoneIcon />
            </div>
            <h3>No Growth Add-on requests found</h3>
            <p>
              When a designer opts into &quot;Exclusive video &amp; photo shoot&quot; or &quot;Exclusive social media promotion&quot;
              in the Designer Portal SKU upload form, it will appear here immediately for outreach.
            </p>
            <Link to="/designer-portal" className="ZENVE-sm-empty-action">
              Go to Designer Portal SKU Upload &rarr;
            </Link>
          </div>
        ) : (
          <div className="ZENVE-sm-grid">
            {campaigns.map((item) => {
              const status = STATUS_CONFIG[item.social_media_status] || STATUS_CONFIG.PENDING_REVIEW;
              const hasVideo = !!item.growth_video_shoot;
              const hasPromo = !!item.growth_social_promotion;
              const designer = item.designer || {};
              const images = item.product_images || [];
              const primaryImg = images.find((img) => img.is_primary) || images[0];
              const imgUrl = primaryImg?.image || null;

              return (
                <div key={item.id} className="ZENVE-sm-card">
                  {/* Card Header: Designer & Product Details */}
                  <div className="ZENVE-sm-card-top">
                    <div className="ZENVE-sm-thumb-wrap" onClick={() => imgUrl && setImageModal(imgUrl)}>
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.product_name} className="ZENVE-sm-thumb" />
                      ) : (
                        <div className="ZENVE-sm-thumb-placeholder">
                          <span>SKU</span>
                        </div>
                      )}
                    </div>

                    <div className="ZENVE-sm-product-info">
                      <div className="ZENVE-sm-brand-tag">
                        {designer.brand_name || "Independent Designer"}
                      </div>
                      <h3 className="ZENVE-sm-product-title" title={item.product_name}>
                        {item.product_name}
                      </h3>
                      <div className="ZENVE-sm-sku-meta">
                        <span className="sku-code">SKU: {item.sku}</span>
                        <span className="dot">·</span>
                        <span className="category">{item.category || "Apparel"}</span>
                        <span className="dot">·</span>
                        <span className="price">₹{(item.retail_price || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="ZENVE-sm-status-badge-container">
                      <span className={`ZENVE-sm-badge ${status.badgeClass}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Add-ons Opt-in Ribbon */}
                  <div className="ZENVE-sm-addons-pills-row">
                    {hasVideo && (
                      <div className="ZENVE-sm-addon-chip video">
                        <VideoCameraIcon />
                        <div className="chip-text">
                          <strong>Video &amp; Photo Shoot</strong>
                          <span>On-site Team Atelier Visit</span>
                        </div>
                      </div>
                    )}
                    {hasPromo && (
                      <div className="ZENVE-sm-addon-chip promo">
                        <MegaphoneIcon />
                        <div className="chip-text">
                          <strong>Social Media Promotion</strong>
                          <span>Campaign Boosts Product Sales</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pipeline Stepper */}
                  <div className="ZENVE-sm-pipeline-stepper">
                    {PIPELINE_STAGES.map((stg, idx) => {
                      const isCompleted = idx <= status.stepIndex;
                      const isCurrent = idx === status.stepIndex;
                      return (
                        <div
                          key={stg.key}
                          className={`ZENVE-sm-step-item ${isCompleted ? "completed" : ""} ${
                            isCurrent ? "current" : ""
                          }`}
                          onClick={() => handleQuickStatus(item.id, stg.key)}
                          title={`Click to set status to ${stg.label}`}
                        >
                          <div className="step-circle">{idx + 1}</div>
                          <span className="step-label">{stg.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Details & Designer Contact Strip */}
                  <div className="ZENVE-sm-details-box">
                    <div className="ZENVE-sm-designer-contact">
                      <div className="contact-line">
                        <span className="label">Designer:</span>
                        <strong>{designer.designer_name || "N/A"}</strong>
                      </div>
                      <div className="contact-line">
                        <span className="label">Email:</span>
                        <span>{designer.email || "No email recorded"}</span>
                      </div>
                      <div className="contact-line">
                        <span className="label">Phone:</span>
                        <span>{designer.phone_number || "No phone recorded"}</span>
                      </div>
                      {item.social_media_shoot_date && (
                        <div className="contact-line date">
                          <span className="label">Shoot Date:</span>
                          <strong className="date-val">
                            <CalendarIcon />
                            {new Date(item.social_media_shoot_date).toLocaleString()}
                          </strong>
                        </div>
                      )}
                    </div>

                    {item.social_media_campaign_url && (
                      <div className="ZENVE-sm-campaign-url-box">
                        <span className="label">Campaign Reel/Post:</span>
                        <a
                          href={item.social_media_campaign_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="url-link"
                        >
                          {item.social_media_campaign_url}
                          <ExternalLinkIcon />
                        </a>
                      </div>
                    )}

                    {item.social_media_notes && (
                      <div className="ZENVE-sm-notes-preview">
                        <span className="notes-label">Outreach &amp; Production Notes:</span>
                        <p>{item.social_media_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Direct Actions: Primary Approach Button */}
                  <div className="ZENVE-sm-actions-bar">
                    <button
                      type="button"
                      className="ZENVE-sm-btn-approach"
                      onClick={() => openApproachModal(item)}
                    >
                      <SparklesIcon />
                      <span>Approach Designer Directly</span>
                    </button>

                    <button
                      type="button"
                      className="ZENVE-sm-btn-manage"
                      onClick={() => openEditModal(item)}
                    >
                      <span>Manage Campaign</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================
          MODAL: DIRECT DESIGNER APPROACH
      ========================================================= */}
      {approachModal && (
        <div className="ZENVE-sm-modal-overlay" onClick={() => setApproachModal(null)}>
          <div className="ZENVE-sm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ZENVE-sm-modal-header">
              <div>
                <span className="ZENVE-sm-modal-tag">DIRECT DESIGNER OUTREACH</span>
                <h3 className="ZENVE-sm-modal-title">
                  Approach {approachModal?.designer?.designer_name} ({approachModal?.designer?.brand_name})
                </h3>
              </div>
              <button
                type="button"
                className="ZENVE-sm-modal-close"
                onClick={() => setApproachModal(null)}
              >
                &times;
              </button>
            </div>

            <div className="ZENVE-sm-modal-body">
              {/* Designer Quick Card */}
              <div className="ZENVE-sm-outreach-designer-strip">
                <div className="designer-avatar">
                  {approachModal?.designer?.designer_name?.charAt(0) || "D"}
                </div>
                <div className="designer-text">
                  <h4>{approachModal?.designer?.designer_name}</h4>
                  <p>
                    {approachModal?.designer?.brand_name} · {approachModal?.designer?.phone_number || "No Phone"} · {approachModal?.designer?.email || "No Email"}
                  </p>
                </div>
                <div className="addons-summary">
                  {approachModal?.growth_video_shoot && <span className="addon-tag video">Video Shoot</span>}
                  {approachModal?.growth_social_promotion && <span className="addon-tag promo">Social Promo</span>}
                </div>
              </div>

              {/* Communication Channel Tabs */}
              <div className="ZENVE-sm-channel-selector">
                <button
                  type="button"
                  className={`channel-btn whatsapp ${approachChannel === "whatsapp" ? "active" : ""}`}
                  onClick={() => setApproachChannel("whatsapp")}
                >
                  <WhatsAppIcon />
                  <span>WhatsApp Outreach</span>
                </button>
                <button
                  type="button"
                  className={`channel-btn phone ${approachChannel === "phone" ? "active" : ""}`}
                  onClick={() => setApproachChannel("phone")}
                >
                  <PhoneIcon />
                  <span>Direct Phone Call</span>
                </button>
                <button
                  type="button"
                  className={`channel-btn schedule ${approachChannel === "schedule" ? "active" : ""}`}
                  onClick={() => setApproachChannel("schedule")}
                >
                  <CalendarIcon />
                  <span>Schedule Shoot Visit</span>
                </button>
              </div>

              {/* Shoot Date Scheduling (If Video Shoot or Scheduled) */}
              {(approachModal?.growth_video_shoot || approachChannel === "schedule") && (
                <div className="ZENVE-sm-form-group">
                  <label>Scheduled On-Site Shoot Date:</label>
                  <input
                    type="date"
                    className="ZENVE-sm-input"
                    value={approachShootDate}
                    onChange={(e) => setApproachShootDate(e.target.value)}
                  />
                  <span className="field-hint">
                    Our team will visit the designer atelier on this selected date.
                  </span>
                </div>
              )}

              {/* Assigned Creative Crew */}
              <div className="ZENVE-sm-form-group">
                <label>Assigned Creative Crew / Stylist:</label>
                <input
                  type="text"
                  className="ZENVE-sm-input"
                  value={assignedCrew}
                  onChange={(e) => setAssignedCrew(e.target.value)}
                  placeholder="e.g. Lead Videographer, Creative Stylist & Model"
                />
              </div>

              {/* Message to Designer */}
              <div className="ZENVE-sm-form-group">
                <label>Direct Message &amp; Production Brief:</label>
                <textarea
                  className="ZENVE-sm-textarea"
                  rows={4}
                  value={approachMessage}
                  onChange={(e) => setApproachMessage(e.target.value)}
                  placeholder="Enter details of your outreach to the designer..."
                />
              </div>

              {/* Direct Quick Action Links */}
              <div className="ZENVE-sm-quick-links-row">
                {approachModal?.designer?.phone_number && (
                  <>
                    <a
                      href={`tel:${approachModal.designer.phone_number}`}
                      className="quick-action-link"
                    >
                      <PhoneIcon /> Call {approachModal.designer.phone_number}
                    </a>
                    <a
                      href={`https://wa.me/${approachModal.designer.phone_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        approachMessage
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-action-link wa"
                    >
                      <WhatsAppIcon /> Open WhatsApp Web
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="ZENVE-sm-modal-footer">
              <button
                type="button"
                className="ZENVE-sm-btn-secondary"
                onClick={() => setApproachModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ZENVE-sm-btn-primary"
                onClick={submitApproach}
                disabled={submitting}
              >
                {submitting ? "Logging Approach..." : "Log Outreach & Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: MANAGE CAMPAIGN
      ========================================================= */}
      {editModal && (
        <div className="ZENVE-sm-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="ZENVE-sm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ZENVE-sm-modal-header">
              <div>
                <span className="ZENVE-sm-modal-tag">CAMPAIGN WORKFLOW</span>
                <h3 className="ZENVE-sm-modal-title">Manage Growth Add-on: {editModal?.product_name}</h3>
              </div>
              <button
                type="button"
                className="ZENVE-sm-modal-close"
                onClick={() => setEditModal(null)}
              >
                &times;
              </button>
            </div>

            <div className="ZENVE-sm-modal-body">
              <div className="ZENVE-sm-form-group">
                <label>Workflow Status:</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="ZENVE-sm-select"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ZENVE-sm-form-group">
                <label>On-Site Shoot Date (If Applicable):</label>
                <input
                  type="date"
                  className="ZENVE-sm-input"
                  value={editShootDate}
                  onChange={(e) => setEditShootDate(e.target.value)}
                />
              </div>

              <div className="ZENVE-sm-form-group">
                <label>Campaign Live URL (Instagram Reel, Meta Ad, TikTok):</label>
                <input
                  type="url"
                  className="ZENVE-sm-input"
                  value={editCampaignUrl}
                  onChange={(e) => setEditCampaignUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                />
              </div>

              <div className="ZENVE-sm-form-group">
                <label>Internal Creative &amp; Production Notes:</label>
                <textarea
                  className="ZENVE-sm-textarea"
                  rows={4}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add notes regarding designer communication, styling requirements, shoot delivery..."
                />
              </div>
            </div>

            <div className="ZENVE-sm-modal-footer">
              <button
                type="button"
                className="ZENVE-sm-btn-secondary"
                onClick={() => setEditModal(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ZENVE-sm-btn-primary"
                onClick={submitEdit}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Campaign Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: PRODUCT IMAGE ZOOM
      ========================================================= */}
      {imageModal && (
        <div className="ZENVE-sm-modal-overlay" onClick={() => setImageModal(null)}>
          <div className="ZENVE-sm-img-preview-card" onClick={(e) => e.stopPropagation()}>
            <img src={imageModal} alt="Preview" className="ZENVE-sm-img-preview-full" />
            <button
              type="button"
              className="ZENVE-sm-img-close-btn"
              onClick={() => setImageModal(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
