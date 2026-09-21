import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/DesignerPortal.css";
import SearchBar from "../components/SearchBar";
import logo from "../assest/logo/zenve-logo-fashion.png";
import {
  getDesigners,
  getDesignerPortalDashboard,
  markDesignerNotificationsRead,
  createProduct,
  updateDesigner,
} from "../services/api";

import { maskGstNumber, isCompanyGst } from "../utils/gstUtils.js";

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

function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function UserProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const BANK_IFSC_MAP = {
  HDFC: "HDFC Bank",
  SBIN: "State Bank of India",
  ICIC: "ICICI Bank",
  UTIB: "Axis Bank",
  KKBK: "Kotak Mahindra Bank",
  BARB: "Bank of Baroda",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  UBIN: "Union Bank of India",
  IDIB: "Indian Bank",
  YESB: "Yes Bank",
  INDB: "IndusInd Bank",
  FDRL: "Federal Bank",
  IDFB: "IDFC First Bank",
};

function getBankNameFromIfsc(ifsc) {
  if (!ifsc || ifsc.length < 4) return "";
  const prefix = ifsc.substring(0, 4).toUpperCase();
  return BANK_IFSC_MAP[prefix] || "Verified Bank";
}

/* =========================================================
   SWITCH COMPONENT
========================================================= */

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`ZENVE-switch ${checked ? "checked" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="ZENVE-switch-thumb" />
    </button>
  );
}

/* =========================================================
   HELPER FORMATTER
========================================================= */

const formatInr = (val) => {
  const num = Number(val) || 0;
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

const cleanCode = (str, len = 3) => {
  return (
    (str || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, len) || "XXX"
  );
};

/* =========================================================
   MAIN COMPONENT: DESIGNER PORTAL (02)
========================================================= */

export default function DesignerPortal() {
  // Master designer selection
  const [designers, setDesigners] = useState([]);
  const [selectedDesignerId, setSelectedDesignerId] = useState("");
  const [loadingDesigners, setLoadingDesigners] = useState(true);

  // Portal dashboard live data from Django
  const [portalData, setPortalData] = useState(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState("");

  // Notification sidebar drawer state
  const [notifSidebarOpen, setNotifSidebarOpen] = useState(false);

  // Close notification sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && notifSidebarOpen) {
        setNotifSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notifSidebarOpen]);

  // Lock body scroll when notification sidebar is open
  useEffect(() => {
    if (notifSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [notifSidebarOpen]);

  // Toast / feedback message
  const [alertMessage, setAlertMessage] = useState(null);

  // SKU Upload form state
  const [form, setForm] = useState({
    name: "",
    category: "",
    colour: "",
    size: "M",
    mrp: "",
    price: "",
    fabric: "",
    petSafety: "No loose beads. Breathable fabric. Supervised wear recommended.",
    location: "Mumbai FC",
    fastDelivery: true,
    returnable: true,
  });
  const [submittingSku, setSubmittingSku] = useState(false);

  // My profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    brand: "",
    name: "",
    contact: "",
    city: "",
    gst: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Account Details state
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    panNumber: "",
  });
  const [savingAccount, setSavingAccount] = useState(false);
  const [isAccountMasked, setIsAccountMasked] = useState(true);
  // Access control for My Profile & Account Details (accessible only via header button)
  const [showProfileAndAccount, setShowProfileAndAccount] = useState(false);

  /* =======================================================
     LOAD DESIGNERS LIST
  ======================================================= */
  const fetchDesigners = async () => {
    try {
      setLoadingDesigners(true);
      const data = await getDesigners();
      const list = Array.isArray(data) ? data : data.results || [];
      setDesigners(list);

      if (list.length > 0) {
        setSelectedDesignerId((prev) => {
          const exists = list.some((d) => String(d.id) === String(prev));
          return exists ? prev : String(list[0].id);
        });
      }
    } catch (err) {
      console.error("Failed to load designers:", err);
      setPortalError("Unable to fetch designers list from backend.");
    } finally {
      setLoadingDesigners(false);
    }
  };

  useEffect(() => {
    fetchDesigners();
  }, []);

  /* =======================================================
     LOAD PORTAL DASHBOARD FOR ACTIVE DESIGNER
  ======================================================= */
  const loadDashboard = async (designerId) => {
    if (!designerId) {
      setPortalData(null);
      return;
    }

    try {
      setLoadingPortal(true);
      setPortalError("");
      const data = await getDesignerPortalDashboard(designerId);
      setPortalData(data);
    } catch (err) {
      console.error("Failed to fetch portal dashboard:", err);
      setPortalError("Could not retrieve portal dashboard metrics.");
    } finally {
      setLoadingPortal(false);
    }
  };

  useEffect(() => {
    if (selectedDesignerId) {
      loadDashboard(selectedDesignerId);
    }
  }, [selectedDesignerId]);

  /* =======================================================
     DERIVED STATE
  ======================================================= */
  const activeDesigner = portalData?.designer || null;
  const kpis = portalData?.kpis || {};
  const pendingActions = portalData?.pendingActions || [];
  const notifications = portalData?.notifications || [];
  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const skus = portalData?.skus || [];
  const orders = portalData?.orders || [];
  const settlements = portalData?.settlements || [];

  /* =======================================================
     SKU ID PREVIEW
  ======================================================= */
  const skuPreview = useMemo(() => {
    if (!activeDesigner || !form.name.trim()) return "—";
    const brandCode = cleanCode(activeDesigner.brand, 3);
    const catCode = cleanCode(form.category, 3);
    const nameCode = cleanCode(form.name, 6);
    const colCode = cleanCode(form.colour, 5);
    const sizeCode = cleanCode(form.size, 4);
    return `ZNV-${brandCode}-${catCode}-${nameCode}-${colCode}-${sizeCode}`;
  }, [activeDesigner, form]);

  /* =======================================================
     SUBMIT SKU TO QA
  ======================================================= */
  const handleSkuSubmit = async (e) => {
    e.preventDefault();

    if (!activeDesigner) {
      setAlertMessage({ type: "error", text: "Please select a designer first." });
      return;
    }

    const allowedStages = ["SIGNED", "LIVE", "ACTIVE", "CONTRACT"];
    if (!allowedStages.includes(activeDesigner.stage)) {
      setAlertMessage({
        type: "error",
        text: "Designer must reach CONTRACT stage in the CRM before uploading SKUs",
      });
      return;
    }

    if (!form.name.trim() || !form.category.trim() || !form.colour.trim()) {
      setAlertMessage({
        type: "error",
        text: "Name, category and colour are required",
      });
      return;
    }

    const numMrp = Number(form.mrp);
    const numPrice = Number(form.price);

    if (numPrice <= 0 || numPrice > numMrp) {
      setAlertMessage({
        type: "error",
        text: "Selling price must be positive and not above MRP",
      });
      return;
    }

    const payload = {
      product_name: form.name.trim(),
      sku: skuPreview,
      designer: activeDesigner.id,
      category: form.category.trim(),
      colour: form.colour.trim(),
      size: form.size,
      mrp: numMrp,
      selling_price: numPrice,
      material: form.fabric.trim(),
      pet_safety: form.petSafety.trim(),
      fulfilment_location: form.location,
      fast_delivery: form.fastDelivery,
      return_policy: form.returnable ? "RETURNABLE" : "FINAL_SALE",
      status: "PENDING_QA",
      inventory_quantity: 10,
    };

    try {
      setSubmittingSku(true);
      await createProduct(payload);
      setAlertMessage({
        type: "success",
        text: `${skuPreview} submitted — now in Catalogue QA`,
      });
      setForm((prev) => ({
        ...prev,
        name: "",
        colour: "",
        mrp: "",
        price: "",
        fabric: "",
      }));
      await loadDashboard(selectedDesignerId);
    } catch (err) {
      console.error("Failed to upload SKU:", err);
      setAlertMessage({
        type: "error",
        text: err.message || "Failed to submit SKU to QA",
      });
    } finally {
      setSubmittingSku(false);
    }
  };

  /* =======================================================
     MARK ALL NOTIFICATIONS AS READ
  ======================================================= */
  const handleMarkNotificationsRead = async () => {
    if (!selectedDesignerId) return;
    try {
      await markDesignerNotificationsRead(selectedDesignerId);
      setPortalData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: (prev.notifications || []).map((n) => ({
            ...n,
            read: true,
          })),
        };
      });
      setAlertMessage({
        type: "success",
        text: "Notifications marked as read",
      });
    } catch (err) {
      console.error("Mark notifications read error:", err);
    }
  };

  /* =======================================================
     EDIT PROFILE HANDLERS
  ======================================================= */
  const handleStartEditProfile = () => {
    if (!activeDesigner) return;
    setProfileForm({
      brand: activeDesigner.brand || "",
      name: activeDesigner.name || "",
      contact: activeDesigner.contact || "",
      city: activeDesigner.city || "",
      gst: activeDesigner.gst || "",
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    if (!activeDesigner || !selectedDesignerId) return;
    if (!profileForm.brand.trim() || !profileForm.name.trim()) {
      setAlertMessage({
        type: "error",
        text: "Brand name and Owner name cannot be empty.",
      });
      return;
    }

    try {
      setSavingProfile(true);
      const isEmail = profileForm.contact.includes("@");
      const payload = {
        brand_name: profileForm.brand.trim(),
        designer_name: profileForm.name.trim(),
        owner_name: profileForm.name.trim(),
        email: isEmail ? profileForm.contact.trim() : (activeDesigner.email || ""),
        phone: !isEmail ? profileForm.contact.trim() : (activeDesigner.phone || ""),
        city: profileForm.city.trim(),
        gst_number: profileForm.gst.trim() ? profileForm.gst.trim().toUpperCase() : null,
      };

      await updateDesigner(selectedDesignerId, payload);
      await loadDashboard(selectedDesignerId);
      await fetchDesigners();
      setIsEditingProfile(false);
      setAlertMessage({
        type: "success",
        text: "Profile details updated successfully.",
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      setAlertMessage({
        type: "error",
        text: err.message || "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  /* =======================================================
     ACCOUNT DETAILS PERSISTENCE & HANDLERS
  ======================================================= */
  useEffect(() => {
    if (!selectedDesignerId) return;
    const storageKey = `zenve_account_details_${selectedDesignerId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAccountForm(JSON.parse(saved));
        return;
      } catch {
        // fallback
      }
    }

    // Smart defaults from activeDesigner
    const gst =
      activeDesigner?.gst && activeDesigner?.gst !== "—"
        ? activeDesigner.gst.trim()
        : "";
    let extractedPan = "";
    if (gst.length === 15) {
      extractedPan = gst.substring(2, 12).toUpperCase();
    }

    setAccountForm({
      accountHolderName:
        activeDesigner?.name || activeDesigner?.brand || "Account Holder",
      accountNumber: "50100" + String(selectedDesignerId).padStart(7, "4"),
      ifscCode: "HDFC0001206",
      panNumber: extractedPan || "AAACC1206D",
    });
  }, [selectedDesignerId, activeDesigner]);

  const handleStartEditAccount = () => {
    setIsEditingAccount(true);
  };

  const handleCancelEditAccount = () => {
    setIsEditingAccount(false);
    if (selectedDesignerId) {
      const saved = localStorage.getItem(
        `zenve_account_details_${selectedDesignerId}`
      );
      if (saved) {
        try {
          setAccountForm(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  };

  const handleIfscChange = (val) => {
    const formattedIfsc = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 11);

    setAccountForm((prev) => {
      // While inserting the IFSC code, ensure name is populated with Account Holder Name
      const updatedName = prev.accountHolderName.trim()
        ? prev.accountHolderName
        : activeDesigner?.name || activeDesigner?.brand || "";
      return {
        ...prev,
        ifscCode: formattedIfsc,
        accountHolderName: updatedName,
      };
    });
  };

  const handleSaveAccountDetails = () => {
    if (!selectedDesignerId) return;
    if (!accountForm.accountHolderName.trim()) {
      setAlertMessage({
        type: "error",
        text: "Account Holder Name is required.",
      });
      return;
    }
    if (!accountForm.accountNumber.trim()) {
      setAlertMessage({
        type: "error",
        text: "Account Number is required.",
      });
      return;
    }
    if (!accountForm.ifscCode.trim()) {
      setAlertMessage({
        type: "error",
        text: "IFSC Code is required.",
      });
      return;
    }

    setSavingAccount(true);
    try {
      localStorage.setItem(
        `zenve_account_details_${selectedDesignerId}`,
        JSON.stringify(accountForm)
      );
      setIsEditingAccount(false);
      setAlertMessage({
        type: "success",
        text: "Account & banking details updated successfully.",
      });
    } catch (err) {
      console.error("Failed to save account details:", err);
      setAlertMessage({
        type: "error",
        text: "Failed to save account details.",
      });
    } finally {
      setSavingAccount(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */
  return (
    <div className="ZENVE-portal-layout">
      {/* =====================================================
          HEADER SECTION
      ===================================================== */}
      <header className="ZENVE-portal-header">
        <div className="ZENVE-header-left">
          <Link to="/" className="ZENVE-portal-logo">
            <img src={logo} alt="Zenve Fashion" />
          </Link>

          <div className="ZENVE-header-title-block">
            <Link to="/" className="ZENVE-back-link">
              <BackIcon />
              <span>ALL 12 LAYERS</span>
            </Link>

            <h1 className="ZENVE-portal-title">
              <span className="ZENVE-layer-num">02</span>
              Designer Portal
            </h1>

            <p className="ZENVE-portal-subtitle">
              Supply layer · Profile, SKU upload, inventory, orders, settlement view
            </p>
          </div>
        </div>

        <div className="ZENVE-header-right">
          <SearchBar />

          {/* CONTROLS (DESIGNER SELECTOR + ACTION BUTTONS) */}
          <div className="ZENVE-header-right-controls">
            {/* SIGNED IN AS SELECTOR (UNIFIED INLINE PILL) */}
            <div className="ZENVE-signed-in-box">
              <span className="ZENVE-signed-in-prefix">SIGNED IN AS</span>
              <div className="ZENVE-select-wrap">
                <select
                  value={selectedDesignerId}
                  onChange={(e) => setSelectedDesignerId(e.target.value)}
                  disabled={loadingDesigners || designers.length === 0}
                  className="ZENVE-designer-select"
                  title="Switch active signed in designer"
                >
                  {designers.length === 0 ? (
                    <option value="">
                      {loadingDesigners ? "Loading..." : "No designers found"}
                    </option>
                  ) : (
                    designers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand_name || d.designer_name}
                      </option>
                    ))
                  )}
                </select>
                <span className="ZENVE-select-chevron">
                  <ArrowDownIcon />
                </span>
              </div>
            </div>

            {/* HEADER ACTIONS GROUP */}
            <div className="ZENVE-header-actions-group">
              {/* PROFILE & ACCOUNT DETAILS ACCESS BUTTON (LOGO ONLY) */}
              <button
                type="button"
                className={`ZENVE-header-profile-btn ${showProfileAndAccount ? "active" : ""}`}
                onClick={() => {
                  setShowProfileAndAccount((prev) => {
                    const nextState = !prev;
                    if (!prev) {
                      setTimeout(() => {
                        const el = document.getElementById("zenve-profile-account-section");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 120);
                    }
                    return nextState;
                  });
                }}
                title={
                  showProfileAndAccount
                    ? "Hide My Profile & Account Details"
                    : "View My Profile & Account Details"
                }
                aria-expanded={showProfileAndAccount}
                aria-label="Profile and Account Details"
              >
                <UserProfileIcon />
                {showProfileAndAccount && <span className="ZENVE-header-active-dot" />}
              </button>

              {/* NOTIFICATION BUTTON IN HEADER */}
              <button
                type="button"
                className="ZENVE-header-notif-btn"
                onClick={() => setNotifSidebarOpen(true)}
                aria-label="Open notifications sidebar"
                title={
                  unreadNotifications > 0
                    ? `${unreadNotifications} unread notification${unreadNotifications > 1 ? "s" : ""}`
                    : "Notifications"
                }
              >
                <BellIcon />
                {unreadNotifications > 0 && (
                  <span className="ZENVE-header-notif-badge">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* FEEDBACK BANNER */}
      {alertMessage && (
        <div className={`ZENVE-alert ZENVE-alert-${alertMessage.type}`}>
          <span>{alertMessage.text}</span>
          <button
            type="button"
            className="ZENVE-alert-close"
            onClick={() => setAlertMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* ERROR NOTICE */}
      {portalError && (
        <div className="ZENVE-alert ZENVE-alert-error">
          <span>{portalError}</span>
          <button
            type="button"
            className="ZENVE-alert-close"
            onClick={() => loadDashboard(selectedDesignerId)}
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN BODY */}
      {!activeDesigner && !loadingPortal && !loadingDesigners ? (
        <div className="ZENVE-empty-state-card">
          <h3>Create a designer in the Designer CRM first.</h3>
          <p>You need a registered designer brand to access the portal dashboard.</p>
          <Link to="/designer-crm" className="ZENVE-btn-primary">
            Open 01 Designer CRM →
          </Link>
        </div>
      ) : (
        <main className="ZENVE-portal-main">
          {/* ===================================================
              SECTION 1: MY DASHBOARD (10 KPI CARDS + PENDING ACTIONS)
              (HIDDEN WHEN IN PROFILE & ACCOUNT VIEW)
          =================================================== */}
          {!showProfileAndAccount && (
            <section className="ZENVE-portal-card">
              <div className="ZENVE-card-header">
                <div>
                  <h2 className="ZENVE-card-title">My dashboard</h2>
                  <p className="ZENVE-card-description">
                    This month at a glance, straight from the live order and settlement ledgers.
                  </p>
                </div>
              </div>

              {/* 10 KPI METRIC CARDS */}
              <div className="ZENVE-kpi-grid">
                {/* 1. Sales this month */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Sales this month</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : formatInr(kpis.monthlyGmv)}
                  </div>
                  <div className="ZENVE-tile-hint">Delivered GMV</div>
                </div>

                {/* 2. Orders */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Orders</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : kpis.orders ?? 0}
                  </div>
                  <div className="ZENVE-tile-hint">
                    {loadingPortal ? "..." : `${kpis.units ?? 0} units sold`}
                  </div>
                </div>

                {/* 3. Commission */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Commission</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : formatInr(kpis.commission)}
                  </div>
                  <div className="ZENVE-tile-hint">
                    Take rate {activeDesigner?.takeRate ?? 0}%
                  </div>
                </div>

                {/* 4. Net payable */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Net payable</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : formatInr(kpis.netPayable)}
                  </div>
                  <div className="ZENVE-tile-hint">
                    {formatInr(kpis.paid)} already paid
                  </div>
                </div>

                {/* 5. Conversion */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Conversion</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : `${kpis.conversion ?? 0.1}%`}
                  </div>
                  <div className="ZENVE-tile-hint">Units per 100 views</div>
                </div>

                {/* 6. Best seller */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Best seller</div>
                  <div className="ZENVE-tile-value ZENVE-truncate" title={kpis.bestSeller?.name || "—"}>
                    {loadingPortal ? "—" : kpis.bestSeller?.name || "—"}
                  </div>
                  <div className="ZENVE-tile-hint">
                    {kpis.bestSeller ? `${kpis.bestSeller.units} units` : "No sales yet"}
                  </div>
                </div>

                {/* 7. Returns */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Returns</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : kpis.returns ?? 0}
                  </div>
                  <div className="ZENVE-tile-hint">
                    {kpis.returnRate ?? 0}% of units
                  </div>
                </div>

                {/* 8. Live SKUs */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Live SKUs</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : kpis.liveSkus ?? 0}
                  </div>
                  <div className="ZENVE-tile-hint">
                    {kpis.totalSkus ?? 0} total
                  </div>
                </div>

                {/* 9. Inventory alerts */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Inventory alerts</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : kpis.inventoryAlerts ?? 0}
                  </div>
                  <div className="ZENVE-tile-hint">At or below reorder point</div>
                </div>

                {/* 10. Health score */}
                <div className="ZENVE-kpi-tile">
                  <div className="ZENVE-tile-label">Health score</div>
                  <div className="ZENVE-tile-value">
                    {loadingPortal ? "—" : `${kpis.health ?? 75}/100`}
                  </div>
                  <div className="ZENVE-tile-hint">Zenve partner score</div>
                </div>
              </div>

              {/* PENDING ACTIONS */}
              <div className="ZENVE-pending-actions-wrap">
                <span className="ZENVE-label-caps">Pending actions</span>
                {pendingActions.length === 0 ? (
                  <p className="ZENVE-pending-empty">Nothing needs your attention.</p>
                ) : (
                  <ul className="ZENVE-pending-list">
                    {pendingActions.map((action, idx) => (
                      <li key={idx}>• {action}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* ===================================================
              SECTIONS 2 & 2B: ACCESSIBLE ONLY VIA HEADER BUTTON
              (EXCLUSIVE VIEW: PROFILE & ACCOUNT DETAILS ONLY)
          =================================================== */}
          {showProfileAndAccount && (
            <div id="zenve-profile-account-section" className="ZENVE-profile-account-exclusive-view">
              {/* SECTION 2: MY PROFILE */}
              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">My profile</h2>
                    <p className="ZENVE-card-description">
                      Maintained by the acquisition team in the CRM.
                    </p>
                  </div>

                  <div className="ZENVE-profile-header-actions">
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        className="ZENVE-btn-edit-profile"
                        onClick={handleStartEditProfile}
                        disabled={!activeDesigner}
                        title="Edit profile information"
                      >
                        <EditPencilIcon />
                        <span>Edit profile</span>
                      </button>
                    ) : (
                      <div className="ZENVE-edit-actions-row">
                        <button
                          type="button"
                          className="ZENVE-btn-secondary-sm"
                          onClick={handleCancelEditProfile}
                          disabled={savingProfile}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="ZENVE-btn-save-sm"
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                        >
                          {savingProfile ? "Saving..." : "Save changes"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      className="ZENVE-btn-hide-profile-section"
                      onClick={() => setShowProfileAndAccount(false)}
                      title="Hide My Profile and Account Details"
                    >
                      ✕ Hide
                    </button>
                  </div>
                </div>

                {!isEditingProfile ? (
                  <dl className="ZENVE-profile-dl">
                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Brand</dt>
                      <dd>{activeDesigner?.brand || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Owner</dt>
                      <dd>{activeDesigner?.name || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Contact</dt>
                      <dd>{activeDesigner?.contact || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">City</dt>
                      <dd>{activeDesigner?.city || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Stage</dt>
                      <dd>{activeDesigner?.stage || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">KYC</dt>
                      <dd>{activeDesigner?.kyc ? "Verified" : "Pending"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">GST</dt>
                      <dd>
                        {activeDesigner?.gst === "COMPANY_GST_REQUESTED" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: "#c2410c", fontWeight: "600", fontSize: "12px" }}>Creation In Progress</span>
                            <span className="ZENVE-verified-mini-pill" style={{ background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "1px 6px", borderRadius: "3px", fontSize: "10px" }}>
                              Company-Side
                            </span>
                          </span>
                        ) : isCompanyGst(activeDesigner?.gst) ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span>{maskGstNumber(activeDesigner?.gst)}</span>
                            <span className="ZENVE-verified-mini-pill" style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "1px 6px", borderRadius: "3px", fontSize: "10px" }}>
                              Company-Provided
                            </span>
                          </span>
                        ) : (
                          maskGstNumber(activeDesigner?.gst)
                        )}
                      </dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Contract ends</dt>
                      <dd>{activeDesigner?.contractEnds || "—"}</dd>
                    </div>

                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Take rate</dt>
                      <dd>{activeDesigner?.takeRate}%</dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveProfile();
                    }}
                    className="ZENVE-profile-dl"
                  >
                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">Brand</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={profileForm.brand}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, brand: e.target.value })
                        }
                        placeholder="e.g. Velvet Canine"
                        required
                      />
                    </div>

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">Owner</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, name: e.target.value })
                        }
                        placeholder="e.g. Rohini Sharma"
                        required
                      />
                    </div>

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">Contact</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={profileForm.contact}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, contact: e.target.value })
                        }
                        placeholder="email@brand.com or 9876543210"
                      />
                    </div>

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">City</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={profileForm.city}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, city: e.target.value })
                        }
                        placeholder="e.g. Mumbai"
                      />
                    </div>

                    <div className="ZENVE-profile-item">
                      <span className="ZENVE-label-caps">Stage</span>
                      <div className="ZENVE-profile-readonly-box">
                        <span className="ZENVE-profile-readonly-val">
                          {activeDesigner?.stage || "—"}
                        </span>
                        <span className="ZENVE-profile-lock-badge">CRM Controlled</span>
                      </div>
                    </div>

                    <div className="ZENVE-profile-item">
                      <span className="ZENVE-label-caps">KYC</span>
                      <div className="ZENVE-profile-readonly-box">
                        <span className="ZENVE-profile-readonly-val">
                          {activeDesigner?.kyc ? "Verified" : "Pending"}
                        </span>
                        <span className="ZENVE-profile-lock-badge">Verified in CRM</span>
                      </div>
                    </div>

                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">GST</label>
                      {isCompanyGst(activeDesigner?.gst) || activeDesigner?.gst === "COMPANY_GST_REQUESTED" ? (
                        <div className="ZENVE-profile-readonly-box">
                          <span className="ZENVE-profile-readonly-val">
                            {activeDesigner?.gst === "COMPANY_GST_REQUESTED"
                              ? "Company GST Creation In Progress"
                              : maskGstNumber(activeDesigner?.gst)}
                          </span>
                          <span className="ZENVE-profile-lock-badge">Company Managed</span>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            className="ZENVE-profile-input"
                            value={profileForm.gst}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, gst: e.target.value })
                            }
                            placeholder="27AAAAA0000A1Z5"
                          />
                          <span className="ZENVE-field-hint" style={{ fontSize: "11px", color: "#8a7f72", marginTop: "3px", display: "block" }}>
                            Masked for security. Contact CRM team to use company-developed GST.
                          </span>
                        </>
                      )}
                    </div>

                    <div className="ZENVE-profile-item">
                      <span className="ZENVE-label-caps">Contract ends</span>
                      <div className="ZENVE-profile-readonly-box">
                        <span className="ZENVE-profile-readonly-val">
                          {activeDesigner?.contractEnds || "—"}
                        </span>
                        <span className="ZENVE-profile-lock-badge">CRM Contract</span>
                      </div>
                    </div>

                    <div className="ZENVE-profile-item">
                      <span className="ZENVE-label-caps">Take rate</span>
                      <div className="ZENVE-profile-readonly-box">
                        <span className="ZENVE-profile-readonly-val">
                          {activeDesigner?.takeRate}%
                        </span>
                        <span className="ZENVE-profile-lock-badge">Fixed Agreement</span>
                      </div>
                    </div>
                  </form>
                )}
              </section>

              {/* ===================================================
              SECTION 2B: ACCOUNT DETAILS
          =================================================== */}
              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">Account Details</h2>
                    <p className="ZENVE-card-description">
                      Bank settlement account, IFSC routing, and PAN card records for payouts and disbursements.
                    </p>
                  </div>

                  {!isEditingAccount ? (
                    <button
                      type="button"
                      className="ZENVE-btn-edit-profile"
                      onClick={handleStartEditAccount}
                      disabled={!activeDesigner}
                      title="Edit banking and account details"
                    >
                      <EditPencilIcon />
                      <span>Edit account</span>
                    </button>
                  ) : (
                    <div className="ZENVE-edit-actions-row">
                      <button
                        type="button"
                        className="ZENVE-btn-secondary-sm"
                        onClick={handleCancelEditAccount}
                        disabled={savingAccount}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ZENVE-btn-save-sm"
                        onClick={handleSaveAccountDetails}
                        disabled={savingAccount}
                      >
                        {savingAccount ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingAccount ? (
                  <dl className="ZENVE-profile-dl">
                    {/* 1. Account Holder Name */}
                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Account Holder Name</dt>
                      <dd className="ZENVE-account-holder-dd">
                        <span>
                          {accountForm.accountHolderName ||
                            activeDesigner?.name ||
                            activeDesigner?.brand ||
                            "—"}
                        </span>
                        <span className="ZENVE-verified-mini-pill">Primary</span>
                      </dd>
                    </div>

                    {/* 2. Account Number */}
                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">Account Number</dt>
                      <dd className="ZENVE-account-num-dd">
                        <span>
                          {isAccountMasked && accountForm.accountNumber
                            ? accountForm.accountNumber.length > 4
                              ? "•••• •••• " + accountForm.accountNumber.slice(-4)
                              : accountForm.accountNumber
                            : accountForm.accountNumber || "—"}
                        </span>
                        {accountForm.accountNumber && (
                          <button
                            type="button"
                            className="ZENVE-mask-toggle-btn"
                            onClick={() => setIsAccountMasked(!isAccountMasked)}
                            title={
                              isAccountMasked
                                ? "Reveal full account number"
                                : "Mask account number"
                            }
                          >
                            <EyeIcon off={!isAccountMasked} />
                          </button>
                        )}
                      </dd>
                    </div>

                    {/* 3. IFSC Code */}
                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">IFSC Code</dt>
                      <dd className="ZENVE-ifsc-dd">
                        <code>{accountForm.ifscCode || "—"}</code>
                        {accountForm.ifscCode && (
                          <span className="ZENVE-bank-tag">
                            {getBankNameFromIfsc(accountForm.ifscCode)}
                          </span>
                        )}
                      </dd>
                    </div>

                    {/* 4. PAN Card Details */}
                    <div className="ZENVE-profile-item">
                      <dt className="ZENVE-label-caps">PAN Card Details</dt>
                      <dd className="ZENVE-pan-dd">
                        <code>{accountForm.panNumber || "—"}</code>
                        {accountForm.panNumber && (
                          <span className="ZENVE-verified-mini-pill">Verified PAN</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveAccountDetails();
                    }}
                    className="ZENVE-profile-dl"
                  >
                    {/* 1. Account Holder Name */}
                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={accountForm.accountHolderName}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            accountHolderName: e.target.value,
                          })
                        }
                        placeholder="e.g. Franke Sharma"
                        required
                      />
                      <span className="ZENVE-field-hint">
                        Name as per bank records
                      </span>
                    </div>

                    {/* 2. Account Number */}
                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">Account Number</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input"
                        value={accountForm.accountNumber}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            accountNumber: e.target.value
                              .replace(/[^0-9]/g, "")
                              .slice(0, 18),
                          })
                        }
                        placeholder="e.g. 50100234567890"
                        required
                      />
                      <span className="ZENVE-field-hint">
                        9 to 18 digit beneficiary account number
                      </span>
                    </div>

                    {/* 3. IFSC Code */}
                    <div className="ZENVE-profile-item">
                      <div className="ZENVE-field-title-row">
                        <label className="ZENVE-label-caps">IFSC Code</label>
                        {accountForm.ifscCode && (
                          <span className="ZENVE-bank-tag">
                            {getBankNameFromIfsc(accountForm.ifscCode)}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        className="ZENVE-profile-input uppercase-code"
                        value={accountForm.ifscCode}
                        onChange={(e) => handleIfscChange(e.target.value)}
                        placeholder="e.g. HDFC0001206"
                        maxLength={11}
                        required
                      />
                      <span className="ZENVE-field-hint">
                        11-digit alphanumeric bank branch code
                      </span>
                    </div>

                    {/* 4. PAN Card Details */}
                    <div className="ZENVE-profile-item">
                      <label className="ZENVE-label-caps">PAN Card Details</label>
                      <input
                        type="text"
                        className="ZENVE-profile-input uppercase-code"
                        value={accountForm.panNumber}
                        onChange={(e) =>
                          setAccountForm({
                            ...accountForm,
                            panNumber: e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z0-9]/g, "")
                              .slice(0, 10),
                          })
                        }
                        placeholder="e.g. AAACC1206D"
                        maxLength={10}
                        required
                      />
                      <span className="ZENVE-field-hint">
                        10-digit Income Tax Permanent Account Number
                      </span>
                    </div>
                  </form>
                )}
              </section>
            </div>
          )}

          {/* ===================================================
              BALANCE DIVS (SECTIONS 3, 4, 5)
              (HIDDEN WHEN IN PROFILE & ACCOUNT VIEW)
          =================================================== */}
          {!showProfileAndAccount && (
            <>
              {/* SECTION 3: UPLOAD A SKU */}
              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">Upload a SKU</h2>
                    <p className="ZENVE-card-description">
                      SKU ID is auto-generated and the row goes straight to QA.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSkuSubmit} className="ZENVE-sku-form">
                  <div className="ZENVE-form-grid">
                    {/* 1. Product name */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Product name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ivory Silk Dog Kurta"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    {/* 2. Category */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Pet Occasion Wear"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        required
                      />
                    </div>

                    {/* 3. Colour */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Colour</label>
                      <input
                        type="text"
                        placeholder="e.g. Ivory Gold"
                        value={form.colour}
                        onChange={(e) => setForm({ ...form, colour: e.target.value })}
                        required
                      />
                    </div>

                    {/* 4. Size */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Size</label>
                      <select
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                      >
                        <option value="XS">XS</option>
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                        <option value="FREE">Free Size</option>
                      </select>
                    </div>

                    {/* 5. MRP */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">MRP</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 4500"
                        value={form.mrp}
                        onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                        required
                      />
                    </div>

                    {/* 6. Selling price */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Selling price</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 3499"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                      />
                    </div>

                    {/* 7. Fabric / material */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Fabric / material</label>
                      <input
                        type="text"
                        placeholder="e.g. Pure Raw Silk"
                        value={form.fabric}
                        onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                      />
                    </div>

                    {/* 8. Pet safety information (span 2) */}
                    <div className="ZENVE-form-group span-2">
                      <label className="ZENVE-label-caps">Pet safety information</label>
                      <input
                        type="text"
                        value={form.petSafety}
                        onChange={(e) => setForm({ ...form, petSafety: e.target.value })}
                      />
                    </div>

                    {/* 9. Stocking location */}
                    <div className="ZENVE-form-group">
                      <label className="ZENVE-label-caps">Stocking location</label>
                      <select
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      >
                        <option value="Mumbai FC">Mumbai FC</option>
                        <option value="Bangalore FC">Bangalore FC</option>
                        <option value="Designer Studio">Designer Studio</option>
                      </select>
                    </div>

                    {/* 10. Fast delivery toggle */}
                    <div className="ZENVE-form-toggle-row">
                      <span className="ZENVE-label-caps">Fast delivery eligible</span>
                      <Switch
                        checked={form.fastDelivery}
                        onChange={(val) => setForm({ ...form, fastDelivery: val })}
                      />
                    </div>

                    {/* 11. Returnable toggle */}
                    <div className="ZENVE-form-toggle-row">
                      <span className="ZENVE-label-caps">Returnable</span>
                      <Switch
                        checked={form.returnable}
                        onChange={(val) => setForm({ ...form, returnable: val })}
                      />
                    </div>
                  </div>

                  {/* SKU ID PREVIEW */}
                  <div className="ZENVE-sku-preview-row">
                    <span className="ZENVE-preview-text">SKU ID preview:</span>
                    <span className="ZENVE-sku-mono">{skuPreview}</span>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="ZENVE-form-actions">
                    <button
                      type="submit"
                      className="ZENVE-btn-primary"
                      disabled={submittingSku || !activeDesigner}
                    >
                      {submittingSku ? "Submitting..." : "Submit to QA"}
                    </button>
                  </div>
                </form>
              </section>

              {/* ===================================================
              SECTION 5: MY SKUS & STOCK (LIVE BACKEND DATA)
          =================================================== */}
              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">My SKUs &amp; stock</h2>
                    <p className="ZENVE-card-description">
                      Live availability the storefront can sell, with cover in days.
                    </p>
                  </div>
                </div>

                {skus.length === 0 ? (
                  <div className="ZENVE-item-empty">No SKUs uploaded yet.</div>
                ) : (
                  <div className="ZENVE-table-responsive">
                    <table className="ZENVE-table">
                      <thead>
                        <tr>
                          <th className="ZENVE-label-caps">SKU</th>
                          <th className="ZENVE-label-caps">Price</th>
                          <th className="ZENVE-label-caps">QA</th>
                          <th className="ZENVE-label-caps">Available</th>
                          <th className="ZENVE-label-caps">Reserved</th>
                          <th className="ZENVE-label-caps">Sold</th>
                          <th className="ZENVE-label-caps">Days of cover</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skus.map((skuItem) => {
                          const qaStatus = skuItem.status || "PENDING_QA";
                          const qaClass = qaStatus.toLowerCase();
                          return (
                            <tr key={skuItem.id}>
                              <td>
                                <div className="ZENVE-sku-name">{skuItem.product_name}</div>
                                <div className="ZENVE-sku-id-mono">{skuItem.sku}</div>
                              </td>
                              <td>{formatInr(skuItem.selling_price)}</td>
                              <td>
                                <span className={`ZENVE-qa-badge tone-${qaClass}`}>
                                  {qaStatus}
                                </span>
                              </td>
                              <td>{skuItem.inventory_quantity ?? 0}</td>
                              <td>{skuItem.reserved_quantity ?? 0}</td>
                              <td>{skuItem.units_sold ?? 0}</td>
                              <td>
                                {skuItem.days_of_stock ? `${skuItem.days_of_stock} d` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ===================================================
              SECTION 6: MY ORDERS & SETTLEMENTS
          =================================================== */}
              <section className="ZENVE-portal-card">
                <div className="ZENVE-card-header">
                  <div>
                    <h2 className="ZENVE-card-title">My orders &amp; settlements</h2>
                  </div>
                </div>

                {/* ORDERS */}
                <div className="ZENVE-orders-block">
                  {orders.length === 0 ? (
                    <div className="ZENVE-item-empty">
                      No orders yet — sell something from the Storefront layer.
                    </div>
                  ) : (
                    <div className="ZENVE-orders-list">
                      {orders.map((ord) => (
                        <div key={ord.id} className="ZENVE-order-row">
                          <span className="ZENVE-order-id">{ord.id}</span>
                          <span className="ZENVE-order-customer">{ord.customer}</span>
                          <span className="ZENVE-order-amt">{formatInr(ord.amount)}</span>
                          <span className={`ZENVE-order-badge tone-${ord.status.toLowerCase()}`}>
                            {ord.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SETTLEMENTS */}
                {settlements.length > 0 && (
                  <div className="ZENVE-settlements-block">
                    <div className="ZENVE-settlements-list">
                      {settlements.map((stl) => (
                        <div key={stl.id} className="ZENVE-settlement-row">
                          <span className="ZENVE-stl-id">{stl.id}</span>
                          <span className="ZENVE-stl-breakdown">
                            GMV {formatInr(stl.gmv)} − commission {formatInr(stl.commission)}
                          </span>
                          <span className="ZENVE-stl-net">{formatInr(stl.net)}</span>
                          <span className={`ZENVE-order-badge tone-${stl.status.toLowerCase()}`}>
                            {stl.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      )}

      {/* =====================================================
          NOTIFICATION SIDEBAR POPUP (DRAWER)
      ===================================================== */}
      {notifSidebarOpen && (
        <div
          className="ZENVE-notif-backdrop"
          onClick={() => setNotifSidebarOpen(false)}
          aria-hidden="true"
        >
          <div
            className="ZENVE-notif-sidebar"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-sidebar-title"
          >
            {/* SIDEBAR HEADER */}
            <div className="ZENVE-notif-sidebar-header">
              <div className="ZENVE-notif-sidebar-title-wrap">
                <div className="ZENVE-notif-sidebar-title-row">
                  <h2 id="notif-sidebar-title" className="ZENVE-notif-sidebar-title">
                    Notifications
                  </h2>
                  {unreadNotifications > 0 ? (
                    <span className="ZENVE-notif-count-pill">
                      {unreadNotifications} unread
                    </span>
                  ) : (
                    <span className="ZENVE-notif-count-pill subtle">
                      All caught up
                    </span>
                  )}
                </div>
                <p className="ZENVE-notif-sidebar-sub">
                  QA outcomes, orders, low stock, returns, payouts and campaigns.
                </p>
              </div>

              <button
                type="button"
                className="ZENVE-notif-sidebar-close"
                onClick={() => setNotifSidebarOpen(false)}
                aria-label="Close notifications sidebar"
              >
                ×
              </button>
            </div>

            {/* SIDEBAR ACTIONS BAR */}
            <div className="ZENVE-notif-sidebar-actions">
              <span className="ZENVE-label-caps">
                {notifications.length} {notifications.length === 1 ? "Update" : "Updates"}
              </span>

              {unreadNotifications > 0 && (
                <button
                  type="button"
                  className="ZENVE-btn-outline-sm"
                  onClick={handleMarkNotificationsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* SIDEBAR BODY */}
            <div className="ZENVE-notif-sidebar-body">
              {notifications.length === 0 ? (
                <div className="ZENVE-item-empty">No notifications yet.</div>
              ) : (
                <div className="ZENVE-notifications-list">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`ZENVE-notification-row ${!n.read ? "unread" : ""}`}
                    >
                      <div className="ZENVE-notif-left">
                        {!n.read && <span className="ZENVE-unread-dot" />}
                        <span className="ZENVE-notif-msg">{n.message}</span>
                      </div>

                      <div className="ZENVE-notif-right">
                        <span className="ZENVE-tone-badge info">
                          {n.kind.replaceAll("_", " ")}
                        </span>
                        <span className="ZENVE-notif-date">
                          {new Date(n.at).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SIDEBAR FOOTER */}
            <div className="ZENVE-notif-sidebar-footer">
              <button
                type="button"
                className="ZENVE-btn-outline-sm"
                onClick={() => setNotifSidebarOpen(false)}
              >
                Close Side Bar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}