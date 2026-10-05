import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import { API_BASE_URL, getDesigners } from "../services/api";
import "../styles/DesignerLogin.css";
import designerBg from "../assest/designer-bg.png";

import zenveLogo from "../assest/logo/zenve-logo-fashion.png";

/* =========================================================
   VECTOR ICONS & BOTANICAL FLOURISHES (EXACT TO IMAGE 2)
   ========================================================= */

// Corner Botanical Leaf Spray Watermark
// Corner Botanical Leaf Spray Watermark (Delicate Watercolor Branches)
function BotanicalLeaf({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M-5,-5 Q50,40 90,90 Q120,130 145,155"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path d="M25,12 C42,4 58,14 62,26 C54,32 36,28 25,12 Z" opacity="0.65" />
      <path d="M12,32 C26,20 40,28 44,38 C35,44 22,42 12,32 Z" opacity="0.6" />
      <path d="M48,28 C68,16 88,28 92,42 C82,48 62,45 48,28 Z" opacity="0.75" />
      <path d="M36,54 C52,40 68,48 72,60 C62,66 46,64 36,54 Z" opacity="0.65" />
      <path d="M72,52 C94,38 114,52 118,68 C106,74 84,72 72,52 Z" opacity="0.78" />
      <path d="M60,80 C78,64 96,74 98,88 C88,94 72,92 60,80 Z" opacity="0.7" />
      <path d="M96,76 C118,62 136,78 138,94 C126,100 106,96 96,76 Z" opacity="0.8" />
      <path d="M84,106 C102,90 120,100 122,114 C112,120 96,118 84,106 Z" opacity="0.7" />
      <path d="M118,106 C136,94 152,108 154,122 C144,128 128,126 118,106 Z" opacity="0.75" />
      <path d="M110,132 C124,122 138,130 140,140 C132,144 120,142 110,132 Z" opacity="0.65" />
    </svg>
  );
}

// 4 Feature Icons at the bottom of the card - Exact Solid Gold Silhouettes
function DressIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.5 2 C9.1 2 8.8 2.3 8.9 2.7 L9.6 7 C9.8 7.5 10.3 8 11 8.2 L8.2 14.5 L6.2 21.2 C6 21.7 6.4 22 6.9 22 L17.1 22 C17.6 22 18 21.7 17.8 21.2 L15.8 14.5 L13 8.2 C13.7 8 14.2 7.5 14.4 7 L15.1 2.7 C15.2 2.3 14.9 2 14.5 2 C13.8 3.5 10.2 3.5 9.5 2 Z" />
    </svg>
  );
}

function ClientsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function FashionBagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6h-2V5c0-1.65-1.35-3-3-3h-4C8.35 2 7 3.35 7 5v1H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10-1c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v1H9V5zm10 15H5V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h6v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
    </svg>
  );
}

function ChartGrowthIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="14" width="3.8" height="8" rx="1.2" />
      <rect x="10.1" y="9" width="3.8" height="13" rx="1.2" />
      <rect x="16.2" y="4" width="3.8" height="18" rx="1.2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* =========================================================
   EXCLUSIVE DESIGNER LOGIN PAGE COMPONENT
   ========================================================= */

export default function DesignerLogin() {
  const navigate = useNavigate();
  const { loginWithRole, ROLES } = useAuth();

  // Active Login Method: 'phone' or 'credentials'
  const [activeTab, setActiveTab] = useState("phone");

  // Method 1: Mobile Number & OTP
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [otpSent, setOtpSent] = useState(false);

  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Method 2: Username & Password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);

  // Feedback & Validation
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Registered Designers list from backend
  const [registeredDesigners, setRegisteredDesigners] = useState([]);
  const [showQuickDemo, setShowQuickDemo] = useState(false);

  // Refs for 6-digit OTP inputs
  const otpInputRefs = useRef([]);

  // Load Designers from Backend or Fallback
  useEffect(() => {
    let mounted = true;
    const fetchDesignersData = async () => {
      try {
        const data = await getDesigners();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (mounted && list.length > 0) {
          setRegisteredDesigners(list);
        }
      } catch (err) {
        // Fallback default designers in case backend is offline
        if (mounted) {
          setRegisteredDesigners([
            { id: 19, designer_code: "DSG-0001", designer_name: "Aarav Mehta", brand_name: "Aarav Pet Atelier", email: "aarav@petatelier.in", phone: "9820011223" },
            { id: 18, designer_code: "DSG-1117", designer_name: "Ashwin", brand_name: "Ashwin Couture", email: "ashwin@gmail.com", phone: "9876545321" },
            { id: 17, designer_code: "DSG-7003", designer_name: "Shankar", brand_name: "Shankar Pet Style", email: "kokarako@gmail.com", phone: "9876543210" },
          ]);
        }
      }
    };
    fetchDesignersData();
    return () => {
      mounted = false;
    };
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle OTP digit entry with auto-focus next
  const handleOtpChange = (index, value) => {
    const val = value.replace(/\D/g, ""); // digits only
    if (!val) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    const digit = val.slice(-1); // take the last entered char
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto focus next input if not at the end
    if (index < 5 && digit) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation across OTP boxes
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste of complete 6-digit OTP
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  /* =========================================================
     EXECUTE DESIGNER LOGIN (SETS SELECTED DESIGNER & ROLE)
     ========================================================= */

  const completeDesignerLogin = (designer) => {
    // Designer Role Clearance configuration
    const designerRoleTemplate = ROLES.find((r) => r.id === "designer") || {
      id: "designer",
      name: "Brand Designer",
      shortRole: "Designer",
      department: "External Supply Partner",
      landingPath: "/designer-portal",
      badgeClass: "designer",
      clearance: ["02", "03", "06", "14", "15"],
    };

    const targetDesignerId = designer?.id || 19;
    const targetName = designer?.designer_name || designer?.user || "Aarav Mehta";
    const targetBrand = designer?.brand_name || designer?.brand || "Aarav Pet Atelier";
    const targetEmail = designer?.email || "aarav@petatelier.in";
    const targetPhone = designer?.phone || "+91 98200 11223";

    const authenticatedDesigner = {
      ...designerRoleTemplate,
      id: "designer",
      designerId: targetDesignerId,
      user: targetName,
      name: targetName,
      brand: targetBrand,
      email: targetEmail,
      phone: targetPhone,
      clearance: ["02", "03", "06", "14", "15"],
    };

    // Store in LocalStorage for seamless DesignerPortal loading
    try {
      localStorage.setItem("zenve_selected_designer_id", String(targetDesignerId));
      localStorage.setItem("zenve_auth_user", JSON.stringify(authenticatedDesigner));
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    loginWithRole("designer", authenticatedDesigner);
    setSuccessMsg(`Welcome, ${targetName}! Redirecting to your Designer Studio...`);

    setTimeout(() => {
      navigate("/designer-portal");
    }, 1200);
  };

  /* =========================================================
     METHOD 1: SEND OTP HANDLER
     ========================================================= */

  const designerAuthRequest = async (action, payload) => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/designer/${action}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      throw new Error("Unable to connect to server. Please verify the backend is running.");
    }

    let data = {};
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      data = { detail: text || `Server error (${response.status})` };
    }

    if (!response.ok) throw new Error(data.detail || data.message || "Unable to sign in.");
    return data;
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!cleanPhone) {
      setErrorMsg("Please enter your mobile number first.");
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setErrorMsg(""); setSuccessMsg(""); setIsSendingOtp(true);
    try {
      const data = await designerAuthRequest("send-otp", { phone_number: `${countryCode}${cleanPhone}` });
      setOtpSent(true); setOtpDigits(["", "", "", "", "", ""]);
      setCountdown(data.retry_after || 30); setSuccessMsg(data.message || "OTP sent to your mobile number.");
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    } catch (err) { setErrorMsg(err.message); }
    finally { setIsSendingOtp(false); }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const enteredOtp = otpDigits.join("").trim();
    if (enteredOtp.length < 6) {
      setErrorMsg("Please enter the complete 6-digit OTP.");
      return;
    }
    setErrorMsg(""); setSuccessMsg(""); setIsVerifyingOtp(true);
    const cleanPhone = phone.trim().replace(/\D/g, "");
    try {
      const data = await designerAuthRequest("verify-otp", {
        phone_number: `${countryCode}${cleanPhone}`, otp: enteredOtp,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      completeDesignerLogin(data.designer);
    } catch (err) { setErrorMsg(err.message || "Invalid OTP. Please try again."); }
    finally { setIsVerifyingOtp(false); }
  };

  /* =========================================================
     METHOD 2: USERNAME & PASSWORD LOGIN
     ========================================================= */

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const term = username.trim().toLowerCase();
    if (!term) {
      setErrorMsg("Please enter your Designer username, email, or designer code.");
      return;
    }
    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setErrorMsg("Use mobile OTP login. Password login is unavailable for designer accounts.");
  };

  // Quick Demo Autofill Helper
  const fillDemoDesigner = (designer) => {
    setErrorMsg("");
    setSuccessMsg("");
    if (activeTab === "phone") {
      setPhone(designer.phone || "9820011223");
      setOtpSent(false);
      setOtpDigits(["", "", "", "", "", ""]);
      setSuccessMsg("Mobile number filled. Request an OTP to sign in.");
    } else {
      setUsername(designer.email || designer.designer_code || "aarav@petatelier.in");
      setPassword("ZenveDesigner@2026");
      setSuccessMsg(`Loaded demo for ${designer.designer_name}. Click 'Sign In as Designer' to log in!`);
    }
  };

  return (
    <div
      className="designer-login-page"
      style={{ backgroundImage: `url(${designerBg})` }}
    >
      {/* Studio Luxury Vignette Overlay */}
      <div className="designer-login-overlay" />

      {/* ===================================================
          LEFT AMBIENT EDITORIAL BRANDING (MATCHING IMAGE 2)
          =================================================== */}
      <div className="designer-ambient-brand" aria-hidden="true">
        <div className="ambient-script-slogan">
          <span className="ambient-script-word">Design</span>
          <span className="ambient-script-word">People</span>
          <span className="ambient-script-word">Couture</span>
          <span className="ambient-script-word">Business</span>
          <span className="ambient-script-word">
            Together <span className="ambient-heart-icon">♡</span>
          </span>
        </div>

        <div className="ambient-crest-box">
          <h1 className="ambient-title">ZENVE</h1>
          <div className="ambient-subtitle">FASHION CRM</div>
          <div className="ambient-strip">CREATORS | COUTURE | DESIGN | BUSINESS</div>
        </div>
      </div>

      {/* ===================================================
          RIGHT ELEVATED LOGIN CARD (EXACT IMAGE 2 REPLICA)
          =================================================== */}
      <div className="designer-card-wrapper">
        <div className="designer-login-card">
          {/* Subtle Golden Botanical Leaves Watermark in Top Corners */}
          <BotanicalLeaf className="botanical-leaf-left" />
          <BotanicalLeaf className="botanical-leaf-right" />

          {/* CARD HEADER */}
          <div className="designer-card-header">
            <img src={zenveLogo} alt="ZENVE Fashion" className="designer-card-logo-img" />
            <div className="designer-card-brand">ZENVE</div>
            <div className="designer-card-crm">FASHION CRM</div>

            <h2 className="designer-welcome-title">Welcome Back</h2>
            <p className="designer-welcome-sub">
              Login to your account and continue your journey with fashion, couture and business.
            </p>
          </div>

          {/* TWO LOGIN METHOD SWITCHER TABS */}
          <div className="designer-tabs-container" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "phone"}
              className={`designer-tab-btn ${activeTab === "phone" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("phone");
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              <PhoneIcon />
              <span>Mobile Number & OTP</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "credentials"}
              className={`designer-tab-btn ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("credentials");
                setErrorMsg("");
                setSuccessMsg("");
              }}
            >
              <UserIcon />
              <span>Username & Password</span>
            </button>
          </div>

          {/* ERROR & SUCCESS MESSAGES */}
          {errorMsg && (
            <div className="designer-error-alert" role="alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="designer-success-alert" role="status">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* ===============================================
              METHOD 1: MOBILE NUMBER & OTP FORM
              =============================================== */}
          {activeTab === "phone" && (
            <div className="designer-form-body">
              {/* Phone Input Row - Single Unified White Box Matching Reference Image */}
              <div className={`designer-phone-row ${otpSent ? "locked" : ""}`}>
                <div className="designer-country-pill">
                  <span className="designer-flag-icon">🇮🇳</span>
                  <span className="designer-code-text">{countryCode}</span>
                  <span className="designer-chevron-icon">
                    <ChevronDownIcon />
                  </span>
                </div>
                <div className="designer-phone-divider" />
                <div className="designer-phone-input-wrap">
                  <input
                    type="tel"
                    className="designer-phone-input"
                    placeholder="Enter your mobile number"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (otpSent) setOtpSent(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !otpSent) handleSendOtp(e);
                    }}
                    maxLength={14}
                    disabled={otpSent}
                  />
                </div>
                {otpSent && (
                  <button
                    type="button"
                    className="designer-phone-edit-btn"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpDigits(["", "", "", "", "", ""]);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    title="Change mobile number"
                  >
                    Change
                  </button>
                )}
              </div>

              {!otpSent ? (
                /* Step 1: Send OTP Button (Only visible before OTP is requested) */
                <button
                  type="button"
                  className="btn-designer-gold"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                >
                  <span>{isSendingOtp ? "Sending OTP..." : "Send OTP"}</span>
                  <ArrowRightIcon />
                </button>
              ) : (
                /* Step 2: OTP Div (Only shown after mobile number is inserted and Send OTP is clicked) */
                <div className="designer-otp-section">
                  <div className="designer-otp-sent-info">
                    Enter the 6-digit OTP sent to <strong>{countryCode} {phone}</strong>
                  </div>

                  {/* 6 OTP Boxes */}
                  <div className="designer-otp-grid" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        className={`designer-otp-cell ${digit ? "filled" : ""}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          handleOtpKeyDown(index, e);
                          if (e.key === "Enter" && otpDigits.every((d) => d !== "")) {
                            handleVerifyOtp(e);
                          }
                        }}
                      />
                    ))}
                  </div>

                  {/* OTP Helper / Resend Timer */}
                  <div className="designer-otp-helper">
                    <span>
                      {countdown > 0 ? (
                        `Resend OTP in ${countdown}s`
                      ) : (
                        <button
                          type="button"
                          className="btn-resend-otp"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                        >
                          {isSendingOtp ? "Resending..." : "Resend OTP"}
                        </button>
                      )}
                    </span>
                    <button
                      type="button"
                      className="btn-resend-otp change-link"
                      onClick={() => {
                        setOtpSent(false);
                        setOtpDigits(["", "", "", "", "", ""]);
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                    >
                      Change Number
                    </button>
                  </div>

                  {/* Verify OTP Button */}
                  <button
                    type="button"
                    className="btn-designer-gold"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp}
                  >
                    <span>{isVerifyingOtp ? "Verifying..." : "Verify OTP"}</span>
                    <ArrowRightIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===============================================
              METHOD 2: USERNAME & PASSWORD FORM
              =============================================== */}
          {activeTab === "credentials" && (
            <form onSubmit={handleCredentialsSubmit} className="designer-form-body">
              {/* Username Input */}
              <div className="designer-input-group">
                <label className="designer-input-label">
                  <span>Designer Username or Email</span>
                </label>
                <div className="designer-input-box">
                  <span className="designer-input-icon">
                    <UserIcon />
                  </span>
                  <input
                    type="text"
                    className="designer-text-input"
                    placeholder="Enter email or code (e.g. DSG-0001)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="designer-input-group">
                <label className="designer-input-label">
                  <span>Password</span>
                </label>
                <div className="designer-input-box">
                  <span className="designer-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="designer-text-input"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="designer-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>

              {/* Remember Me & Help */}
              <div className="designer-options-row">
                <label className="designer-remember-wrap">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <a
                  href="#help"
                  className="designer-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Designer Portal Support:\nFor password reset or brand credentials, please contact your Zenve Merchandiser partner (crm@zenve.in).");
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="btn-designer-gold"
                disabled={isSubmittingCredentials}
              >
                <span>{isSubmittingCredentials ? "Signing In..." : "Sign In as Designer"}</span>
                <ArrowRightIcon />
              </button>
            </form>
          )}

          {/* ===============================================
              FOUR CARD FOOTER FEATURES (EXACT IMAGE 2 REPLICA)
              =============================================== */}
          <div className="designer-features-footer">
            <div className="designer-feature-item">
              <div className="feature-icon-badge">
                <DressIcon />
              </div>
              <span className="feature-label">Design Collections</span>
            </div>

            <div className="designer-feature-item">
              <div className="feature-icon-badge">
                <ClientsIcon />
              </div>
              <span className="feature-label">Manage Clients</span>
            </div>

            <div className="designer-feature-item">
              <div className="feature-icon-badge">
                <FashionBagIcon />
              </div>
              <span className="feature-label">Fashion Collections</span>
            </div>

            <div className="designer-feature-item">
              <div className="feature-icon-badge">
                <ChartGrowthIcon />
              </div>
              <span className="feature-label">Grow Your Business</span>
            </div>
          </div>
        </div>

        {/* Back to Home & Switch to Staff Login links outside the card */}
        <div className="designer-portal-switch">
          <Link to="/" className="designer-switch-link">
            ← Dashboard Home
          </Link>
          <button
            type="button"
            className="designer-demo-toggle-btn"
            onClick={() => setShowQuickDemo(!showQuickDemo)}
          >
            {showQuickDemo ? "Hide Quick Test" : "⚡ Quick Test"}
          </button>
          <Link to="/login" className="designer-switch-link">
            Staff & Admin Login →
          </Link>
        </div>

        {/* Optional Quick Demo Designer Selectors for instant pair testing */}
        {showQuickDemo && (
          <div className="designer-quick-demo">
            <div className="designer-quick-demo-head">
              <span>Quick Test Designer:</span>
              <span style={{ fontSize: "10px", color: "#a89785" }}>Click to autofill</span>
            </div>
            <div className="designer-quick-pills">
              {(registeredDesigners.length > 0 ? registeredDesigners.slice(0, 2) : [
                { id: 19, designer_name: "Aarav Mehta", brand_name: "Aarav Pet Atelier", email: "aarav@petatelier.in", phone: "9820011223", designer_code: "DSG-001" },
                { id: 18, designer_name: "Ashwin", brand_name: "Ashwin Couture", email: "ashwin@gmail.com", phone: "9876545321", designer_code: "DSG-002" },
              ]).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="demo-chip-btn"
                  onClick={() => fillDemoDesigner(d)}
                >
                  {d.designer_name} ({d.designer_code || "DSG"})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
