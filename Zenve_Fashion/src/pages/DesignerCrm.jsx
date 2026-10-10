import React, { useState, useEffect, useMemo, useRef } from "react";
import "../styles/DesignerCrm.css";
import bannerImg from "../assest/accounting-banner.jpg";
import {
  getDesigners,
  createDesigner,
  updateDesigner,
  getOrders,
  getProducts,
  getReturns,
  getSettlements,
} from "../services/api";
import { maskGstNumber } from "../utils/gstUtils.js";
import { showSuccessToast, showErrorToast, showWarningToast } from "../utils/zenveToast";

/* =========================================================
   CONSTANTS & BLUEPRINTS
========================================================= */

export const COMPANY_GST_INFO = {
  name: "ZENVE FASHION PRIVATE LIMITED",
  gstNumber: "29AABCZ1234F1Z8",
  state: "Karnataka (All-India E-Commerce Coverage)",
  type: "E-Commerce Marketplace Operator & Master Platform GSTIN",
  section: "Section 9(5) & Section 52 CGST Act",
  hsnSac: "998311 / 998439 (Fashion Marketplace & Creator Supply Services)",
};

export const FASHION_CREDIT_PLANS = [
  { id: "Silver", name: "Silver", catalogue: 50, products: 50, points: "1,00,000", pointsNum: 100000, catalogueCharges: 500, minDays: 200 },
  { id: "Gold", name: "Gold", catalogue: 200, products: 200, points: "3,00,000", pointsNum: 300000, catalogueCharges: 500, minDays: 200 },
  { id: "Platinum", name: "Platinum", catalogue: 300, products: 300, points: "4,50,000", pointsNum: 450000, catalogueCharges: 500, minDays: 200 },
  { id: "Palladium", name: "Palladium", catalogue: 999, products: 999, points: "7,00,000", pointsNum: 700000, catalogueCharges: 500, minDays: 200 },
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

/* =========================================================
   ICONS & SPARKLINES
========================================================= */

function Sparkline({ color = "#D97706" }) {
  return (
    <svg className="crm-sparkline-svg" viewBox="0 0 70 28" fill="none">
      <path
        d="M2 20C12 20 18 8 26 14C34 20 42 6 52 10C60 13 64 4 68 2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function getInitialsAvatar(name) {
  const clean = encodeURIComponent((name || "Designer").trim());
  return `https://ui-avatars.com/api/?name=${clean}&background=F5E6D3&color=6B4423&bold=true&rounded=true&size=80`;
}

/* =========================================================
   MAIN COMPONENT: DESIGNER CRM (100% REAL LIVE DATA)
========================================================= */

export default function DesignerCRM() {
  const [designers, setDesigners] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [kycFilter, setKycFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Add Designer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [useCompanyGst, setUseCompanyGst] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);
  const addSectionRef = useRef(null);

  const handleToggleAddSection = () => {
    setShowAddModal((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          addSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      return next;
    });
  };

  const [modalNewLead, setModalNewLead] = useState({
    name: "",
    brand: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    category: "",
    tier: "Emerging",
    fashionCreditPlan: "",
    creditPoints: 0,
    takeRate: "",
    gst: "",
    contractEnds: "",
    source: "Referral",
    owner: "Nisha Kapoor",
    nextFollowUp: "",
    cac: "",
    renewalProbability: "",
  });

  // Edit / View Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeDesigner, setActiveDesigner] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".crm-action-menu-wrap")) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Database Records
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        setLoading(true);
        const [dRes, oRes, pRes] = await Promise.all([
          getDesigners().catch(() => []),
          getOrders().catch(() => []),
          getProducts().catch(() => []),
        ]);
        if (mounted) {
          setDesigners(Array.isArray(dRes) ? dRes : []);
          setOrders(Array.isArray(oRes) ? oRes : []);
          setProducts(Array.isArray(pRes) ? pRes : []);
        }
      } catch (err) {
        console.error("Failed to fetch CRM data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // Real Database Metrics for Each Designer
  const getDesignerStats = (designer) => {
    const designerProds = products.filter(
      (p) =>
        p.designer === designer.id ||
        p.designerId === designer.id ||
        p.designer_code === designer.designer_code ||
        p.designer_brand === designer.brand_name ||
        p.brand === designer.brand_name ||
        p.brand_name === designer.brand_name ||
        p.designer_name === designer.designer_name
    );
    const prodCount = designer.products_count ?? designerProds.length;

    let sales = Number(designer.lifetime_gmv ?? designer.total_sales ?? 0);
    if (sales === 0 && orders.length > 0) {
      const prodIds = new Set(designerProds.map((p) => String(p.id)));
      orders.forEach((o) => {
        const isCancelled = String(o.status || o.order_status || "").toUpperCase() === "CANCELLED";
        if (isCancelled) return;
        const items = o.items || o.lines || [];
        items.forEach((item) => {
          if (
            (item.product_id && prodIds.has(String(item.product_id))) ||
            (item.brand_name && item.brand_name === designer.brand_name) ||
            (item.brand && item.brand === designer.brand_name)
          ) {
            sales +=
              Number(
                item.total ||
                item.total_price ||
                Number(item.price || 0) * Number(item.quantity || item.qty || 1)
              ) || 0;
          }
        });
      });
    }
    return { prodCount, sales };
  };

  // Real Dynamic KPI Calculations
  const totalDesignersCount = designers.length;

  const activeDesignersCount = useMemo(() => {
    return designers.filter(
      (d) =>
        d.stage === "ACTIVE" ||
        d.stage === "LIVE" ||
        d.status === "Active" ||
        d.is_active === true
    ).length;
  }, [designers]);

  const pendingApprovalCount = useMemo(() => {
    return designers.filter(
      (d) =>
        !d.kyc_verified &&
        d.kyc_status !== "VERIFIED"
    ).length;
  }, [designers]);

  const newThisMonthCount = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return designers.filter((d) => {
      if (!d.created_at) return false;
      return new Date(d.created_at) >= startOfMonth;
    }).length;
  }, [designers]);

  // Filtered Designers
  const filteredDesigners = useMemo(() => {
    return designers.filter((item) => {
      const dName = item.designer_name || item.name || item.owner_name || "";
      const bName = item.brand_name || item.brand || "";
      const email = item.email || "";
      const phone = item.phone || "";
      const cat = item.primary_category || item.category || "";
      const st = item.status || (item.stage === "INACTIVE" ? "Inactive" : "Active");
      const kyc = item.kyc_status === "VERIFIED" || item.kyc_verified ? "Verified" : "Pending";

      // Search term
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const matches =
          dName.toLowerCase().includes(t) ||
          bName.toLowerCase().includes(t) ||
          email.toLowerCase().includes(t) ||
          phone.toLowerCase().includes(t) ||
          cat.toLowerCase().includes(t);
        if (!matches) return false;
      }

      // Status Filter
      if (statusFilter !== "All") {
        if (st.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // KYC Filter
      if (kycFilter !== "All") {
        if (kyc.toLowerCase() !== kycFilter.toLowerCase()) return false;
      }

      // Category Filter
      if (categoryFilter !== "All") {
        if (!cat.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }

      return true;
    });
  }, [designers, searchTerm, statusFilter, kycFilter, categoryFilter]);

  // Dynamic Pagination
  const totalItems = filteredDesigners.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedDesigners = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDesigners.slice(start, start + pageSize);
  }, [filteredDesigners, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setKycFilter("All");
    setCategoryFilter("All");
    setCurrentPage(1);
    showSuccessToast("Filters reset to default.");
  };

  // Open Edit Modal
  const handleOpenEditModal = (designer) => {
    setActiveDesigner(designer);
    const { prodCount, sales } = getDesignerStats(designer);
    setEditForm({
      designer_name: designer.designer_name || designer.name || "",
      brand_name: designer.brand_name || designer.brand || "",
      email: designer.email || "",
      phone: designer.phone || "",
      primary_category: designer.primary_category || designer.category || "",
      kyc_status: designer.kyc_status || (designer.kyc_verified ? "VERIFIED" : "PENDING"),
      contract_status: designer.contract_status || (designer.stage === "CONTRACT" || designer.stage === "SIGNED" || designer.stage === "ACTIVE" ? "Active" : "Under Review"),
      products_count: prodCount,
      total_sales: sales,
      status: designer.status || (designer.stage === "INACTIVE" ? "Inactive" : "Active"),
      tier: designer.tier || "Emerging",
      city: designer.city || "",
    });
    setShowEditModal(true);
  };

  // Open View Modal
  const handleOpenViewModal = (designer) => {
    setActiveDesigner(designer);
    setShowViewModal(true);
  };

  // Save Edit to Backend
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!activeDesigner) return;
    try {
      const updated = {
        ...activeDesigner,
        ...editForm,
        designer_name: editForm.designer_name,
        brand_name: editForm.brand_name,
        email: editForm.email,
        phone: editForm.phone,
        primary_category: editForm.primary_category,
        kyc_status: editForm.kyc_status,
        kyc_verified: editForm.kyc_status === "VERIFIED",
        status: editForm.status,
        stage: editForm.status === "Inactive" ? "INACTIVE" : activeDesigner.stage || "ACTIVE",
      };

      setDesigners((list) =>
        list.map((d) => (d.id === activeDesigner.id ? updated : d))
      );

      await updateDesigner(activeDesigner.id, updated).catch(() => null);
      showSuccessToast(`Updated ${editForm.designer_name || "Designer"}`);
      setShowEditModal(false);
    } catch (err) {
      showErrorToast("Could not update designer.");
    }
  };

  // Create Lead in Backend
  const handleModalCreateLead = async (e) => {
    e.preventDefault();
    if (!modalNewLead.name.trim() || !modalNewLead.brand.trim()) {
      showWarningToast("Designer name and brand name are required.");
      return;
    }

    const newCode = `DGN-${String(Date.now()).slice(-4)}`;
    const payload = {
      designer_name: modalNewLead.name.trim(),
      brand_name: modalNewLead.brand.trim(),
      designer_code: newCode,
      owner_name: modalNewLead.name.trim(),
      phone: modalNewLead.phone.trim() || null,
      email: modalNewLead.email.trim() || `${modalNewLead.name.toLowerCase().replace(/\s+/g, "")}@zenve.com`,
      primary_category: modalNewLead.category.trim() || "Fashion",
      city: modalNewLead.city.trim() || "",
      state: modalNewLead.state.trim() || null,
      tier: modalNewLead.tier,
      stage: "LEAD",
      status: "Active",
      kyc_status: "PENDING",
      kyc_verified: false,
      sales_owner: modalNewLead.owner,
      lead_source: modalNewLead.source,
      online_membership_plan: modalNewLead.fashionCreditPlan ? modalNewLead.fashionCreditPlan.toUpperCase() : null,
      credit_points: Number(modalNewLead.creditPoints) || 0,
      take_rate: modalNewLead.takeRate ? Number(modalNewLead.takeRate) : 0,
      gst_number: useCompanyGst ? COMPANY_GST_INFO.gstNumber : (modalNewLead.gst || null),
      contract_end_date: modalNewLead.contractEnds || null,
      next_followup_date: modalNewLead.nextFollowUp || null,
      acquisition_cost: modalNewLead.cac ? Number(modalNewLead.cac) : 0,
      renewal_likelihood: modalNewLead.renewalProbability ? Number(modalNewLead.renewalProbability) : 0,
    };

    try {
      const created = await createDesigner(payload);
      setDesigners((prev) => [created, ...prev]);
      showSuccessToast(`${modalNewLead.name} (${modalNewLead.brand}) created successfully.`);
      setShowAddModal(false);

      // Reset Form
      setModalNewLead({
        name: "",
        brand: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        category: "",
        tier: "Emerging",
        fashionCreditPlan: "",
        creditPoints: 0,
        takeRate: "",
        gst: "",
        contractEnds: "",
        source: "Referral",
        owner: "Nisha Kapoor",
        nextFollowUp: "",
        cac: "",
        renewalProbability: "",
      });
      setUseCompanyGst(false);
    } catch (err) {
      showErrorToast(err.message || "Failed to create designer record on server.");
    }
  };

  // Toggle KYC
  const handleToggleKyc = async (designer) => {
    const isCurrentlyVerified = designer.kyc_status === "VERIFIED" || designer.kyc_verified;
    const nextStatus = isCurrentlyVerified ? "PENDING" : "VERIFIED";
    const nextVerified = !isCurrentlyVerified;

    setDesigners((list) =>
      list.map((d) =>
        d.id === designer.id
          ? { ...d, kyc_status: nextStatus, kyc_verified: nextVerified }
          : d
      )
    );
    showSuccessToast(
      nextVerified
        ? `${designer.designer_name} KYC Verified!`
        : `${designer.designer_name} KYC set to Pending.`
    );
    await updateDesigner(designer.id, { kyc_status: nextStatus, kyc_verified: nextVerified }).catch(() => null);
  };

  // Freeze / Unfreeze
  const handleFreezeDesigner = async (designer) => {
    const isCurrentlyInactive = designer.stage === "INACTIVE" || designer.status === "Inactive";
    const nextStatus = isCurrentlyInactive ? "Active" : "Inactive";
    const nextStage = isCurrentlyInactive ? "ACTIVE" : "INACTIVE";

    setDesigners((list) =>
      list.map((d) =>
        d.id === designer.id
          ? { ...d, status: nextStatus, stage: nextStage }
          : d
      )
    );
    showSuccessToast(
      isCurrentlyInactive
        ? `${designer.designer_name} unfreezed. Status is Active.`
        : `${designer.designer_name} freezed. Status is Inactive.`
    );
    await updateDesigner(designer.id, { stage: nextStage, status: nextStatus }).catch(() => null);
  };

  // WhatsApp Portal Invite
  const handleSendWhatsAppPortalLink = (designer) => {
    let phone = String(designer.phone || "").replace(/[^0-9]/g, "");
    if (phone.length === 10) phone = `91${phone}`;
    const name = designer.designer_name || designer.name || "Designer";
    const portalUrl = `${window.location.origin}/designer-login`;
    const message = `Hello ${name}, welcome to ZENVE Fashion.

Sign in to your Designer Portal:
${portalUrl}

Use your registered phone number and OTP to complete setup.`;

    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank");
    showSuccessToast("WhatsApp invitation opened!");
  };

  return (
    <div className="crm-page-wrapper">
      {/* =====================================================
          LUXURY HERO BANNER WITH FASHION ATELIER ARTWORK
      ===================================================== */}
      <main className="crm-main-container">
        <section className="crm-hero-banner">
          <div className="crm-banner-content">
            <h1 className="crm-hero-title">Designer CRM</h1>
            <p className="crm-hero-subtitle">
              Manage designers, approvals, KYC, contracts and performance
            </p>
          </div>
          <img src={bannerImg} alt="Zenve Fashion Designer CRM" className="crm-banner-bg-img" />
        </section>

        {/* =====================================================
            3. TOP 4 KPI CARDS & "+ ADD DESIGNER" BUTTON ROW
        ===================================================== */}
        <section className="crm-kpi-row">
          <div className="crm-kpi-cards-grid">
            {/* Card 1: Total Designers */}
            <div className="crm-kpi-card">
              <div className="crm-kpi-info-group">
                <div className="crm-kpi-icon-wrap users">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="crm-kpi-text-block">
                  <span className="crm-kpi-title">Total Designers</span>
                  <div className="crm-kpi-value-row">
                    <span className="crm-kpi-number">{loading ? "..." : totalDesignersCount}</span>
                    <span className="crm-kpi-trend green">Live</span>
                  </div>
                </div>
              </div>
              <Sparkline color="#D97706" />
            </div>

            {/* Card 2: Active Designers */}
            <div className="crm-kpi-card">
              <div className="crm-kpi-info-group">
                <div className="crm-kpi-icon-wrap active">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <div className="crm-kpi-text-block">
                  <span className="crm-kpi-title">Active Designers</span>
                  <div className="crm-kpi-value-row">
                    <span className="crm-kpi-number">{loading ? "..." : activeDesignersCount}</span>
                    <span className="crm-kpi-trend green">Live</span>
                  </div>
                </div>
              </div>
              <Sparkline color="#D97706" />
            </div>

            {/* Card 3: Pending Approval */}
            <div className="crm-kpi-card">
              <div className="crm-kpi-info-group">
                <div className="crm-kpi-icon-wrap pending">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="crm-kpi-text-block">
                  <span className="crm-kpi-title">Pending Approval</span>
                  <div className="crm-kpi-value-row">
                    <span className="crm-kpi-number">{loading ? "..." : pendingApprovalCount}</span>
                    <span className={`crm-kpi-trend ${pendingApprovalCount > 0 ? "red" : "green"}`}>
                      {pendingApprovalCount > 0 ? "Review" : "Clear"}
                    </span>
                  </div>
                </div>
              </div>
              <Sparkline color="#D97706" />
            </div>

            {/* Card 4: New This Month */}
            <div className="crm-kpi-card">
              <div className="crm-kpi-info-group">
                <div className="crm-kpi-icon-wrap new">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div className="crm-kpi-text-block">
                  <span className="crm-kpi-title">New This Month</span>
                  <div className="crm-kpi-value-row">
                    <span className="crm-kpi-number">{loading ? "..." : newThisMonthCount}</span>
                    <span className="crm-kpi-trend green">Growth</span>
                  </div>
                </div>
              </div>
              <Sparkline color="#D97706" />
            </div>
          </div>
        </section>

        {/* =====================================================
            4. FILTER TOOLBAR: SEARCH, STATUS, KYC, CATEGORY & RESET
        ===================================================== */}
        <section className="crm-filter-toolbar">
          <div className="crm-filter-search-box">
            <svg className="crm-filter-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="crm-filter-search-input"
              placeholder="Search designers by name, email, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="crm-filter-select-group">
            <label className="crm-filter-label">Status</label>
            <select
              className="crm-filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>

          <div className="crm-filter-select-group">
            <label className="crm-filter-label">KYC Status</label>
            <select
              className="crm-filter-select"
              value={kycFilter}
              onChange={(e) => {
                setKycFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="crm-filter-select-group">
            <label className="crm-filter-label">Category</label>
            <select
              className="crm-filter-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All</option>
              <option value="Women Wear">Women Wear</option>
              <option value="Men Wear">Men Wear</option>
              <option value="Ethnic Wear">Ethnic Wear</option>
              <option value="Fusion Wear">Fusion Wear</option>
              <option value="Kids Wear">Kids Wear</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Designer Studio">Designer Studio</option>
            </select>
          </div>

          <button
            type="button"
            className="crm-btn-reset"
            onClick={handleResetFilters}
            title="Reset Filters"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Reset</span>
          </button>

          {/* Action Button: + Add Designer (Toggles inline section) */}
          <button
            type="button"
            className={`crm-btn-add-designer ${showAddModal ? "active" : ""}`}
            onClick={handleToggleAddSection}
            title={showAddModal ? "Close Add Designer Form" : "Add a Designer Lead"}
          >
            <span className="crm-btn-plus">{showAddModal ? "✕" : "+"}</span>
            <span>{showAddModal ? "Close Form" : "Add Designer"}</span>
          </button>
        </section>

        {/* =====================================================
            5. DESIGNER DIRECTORY TABLE
        ===================================================== */}
        <section className="crm-table-container">
          <div className="crm-table-scroll">
            <table className="crm-exact-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>Designer</th>
                <th>Contact</th>
                <th>Category</th>
                <th>KYC Status</th>
                <th>Contract Status</th>
                <th>Products</th>
                <th>Total Sales</th>
                <th>Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="crm-table-empty">
                    Loading live designer records...
                  </td>
                </tr>
              ) : paginatedDesigners.length === 0 ? (
                <tr>
                  <td colSpan={10} className="crm-table-empty">
                    {searchTerm || statusFilter !== "All" || kycFilter !== "All" || categoryFilter !== "All"
                      ? "No designers match the selected filters."
                      : "No designers found in the database. Click \"+ Add Designer\" to onboard a designer."}
                  </td>
                </tr>
              ) : (
                paginatedDesigners.map((designer, idx) => {
                  const { prodCount, sales } = getDesignerStats(designer);
                  const isVerified = designer.kyc_status === "VERIFIED" || designer.kyc_verified;
                  const contractSt = designer.contract_status || (designer.stage === "CONTRACT" || designer.stage === "SIGNED" || designer.stage === "ACTIVE" ? "Active" : "Under Review");
                  const isActive = designer.stage !== "INACTIVE" && designer.status !== "Inactive";
                  const rowNum = String((currentPage - 1) * pageSize + idx + 1).padStart(2, "0");

                  return (
                    <tr key={designer.id}>
                      <td className="col-num">{rowNum}</td>
                      <td>
                        <div className="crm-designer-profile-cell">
                          <img
                            src={designer.avatar || getInitialsAvatar(designer.designer_name || designer.name || designer.owner_name)}
                            alt={designer.designer_name || "Designer"}
                            className="crm-table-avatar"
                          />
                          <div className="crm-designer-name-col">
                            <span className="crm-designer-name">
                              {designer.designer_name || designer.name || designer.owner_name || "—"}
                            </span>
                            <span className="crm-designer-code">
                              {designer.designer_code || `DGN-${designer.id}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="crm-contact-cell">
                          <div className="crm-contact-row">
                            <span className="crm-contact-icon">📞</span>
                            <span>{designer.phone || "—"}</span>
                          </div>
                          <div className="crm-contact-row">
                            <span className="crm-contact-icon">✉</span>
                            <span className="crm-contact-email">{designer.email || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="crm-category-text">
                          {designer.primary_category || designer.category || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-pill-badge ${isVerified ? "verified" : "pending"}`}>
                          {isVerified ? "✓ Verified" : "● Pending"}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-pill-badge contract-${String(contractSt).toLowerCase().replace(/\s+/g, "-")}`}>
                          {contractSt === "Expired"
                            ? "● Expired"
                            : contractSt === "Under Review"
                            ? "● Under Review"
                            : "✓ Active"}
                        </span>
                      </td>
                      <td>
                        <span className="crm-products-count">
                          {prodCount}
                        </span>
                      </td>
                      <td>
                        <span className="crm-sales-bold">
                          ₹{Number(sales).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td>
                        <span className={`crm-pill-badge status-${isActive ? "active" : "inactive"}`}>
                          {isActive ? "● Active" : "● Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="crm-actions-cell">
                          <button
                            type="button"
                            className="crm-action-icon-btn"
                            title="View Designer"
                            onClick={() => handleOpenViewModal(designer)}
                          >
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="crm-action-icon-btn"
                            title="Edit Designer"
                            onClick={() => handleOpenEditModal(designer)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>

                          <div className="crm-action-menu-wrap">
                            <button
                              type="button"
                              className="crm-action-icon-btn"
                              title="More Options"
                              onClick={() =>
                                setOpenActionMenuId(openActionMenuId === designer.id ? null : designer.id)
                              }
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>

                            {openActionMenuId === designer.id && (
                              <div className={`crm-dropdown-menu ${idx === 0 && paginatedDesigners.length > 2 ? "dropdown-down" : "dropdown-up"}`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSendWhatsAppPortalLink(designer);
                                    setOpenActionMenuId(null);
                                  }}
                                >
                                  <WhatsAppIcon size={14} /> Send WhatsApp Invite
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleKyc(designer);
                                    setOpenActionMenuId(null);
                                  }}
                                >
                                  Toggle KYC ({isVerified ? "Pending" : "Verified"})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFreezeDesigner(designer);
                                    setOpenActionMenuId(null);
                                  }}
                                >
                                  {isActive ? "Freeze (Inactive)" : "Unfreeze (Active)"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            6. DYNAMIC PAGINATION FOOTER
        ===================================================== */}
        {totalPages > 1 && (
          <div className="crm-pagination-bar" style={{ justifyContent: "flex-end" }}>
            <div className="crm-pagination-controls">
              <button
                type="button"
                className="crm-page-btn arrow"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`crm-page-btn ${currentPage === page ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="crm-page-btn arrow"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        )}
        </section>

        {/* =====================================================
            6. "ADD A DESIGNER LEAD" INLINE FORM SECTION (DOWN OF PAGE)
        ===================================================== */}
        {showAddModal && (
          <section className="crm-inline-form-card" ref={addSectionRef} id="crm-add-designer-section">
            <div className="crm-lead-modal-header">
              <div className="crm-lead-modal-title-wrap">
                <h2 className="crm-lead-modal-title">Add a designer lead</h2>
                <p className="crm-lead-modal-subtitle">
                  Creates the designer record used by every other layer.
                </p>
              </div>
              <button
                type="button"
                className="crm-lead-modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalCreateLead} className="crm-lead-form">
              <div className="crm-lead-grid-3">
                {/* Row 1 */}
                <div className="crm-lead-field">
                  <label className="crm-field-label">DESIGNER NAME</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    placeholder="e.g. Rohini Sharma"
                    value={modalNewLead.name}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, name: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">BRAND</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    placeholder="e.g. Velvet Canine"
                    value={modalNewLead.brand}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, brand: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    className="crm-lead-input"
                    placeholder="e.g. designer@brand.com"
                    value={modalNewLead.email}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, email: e.target.value })}
                  />
                </div>

                {/* Row 2 */}
                <div className="crm-lead-field">
                  <label className="crm-field-label">MOBILE NUMBER</label>
                  <input
                    type="tel"
                    className="crm-lead-input"
                    placeholder="e.g. 9876543210"
                    value={modalNewLead.phone}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, phone: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">LEAD SOURCE</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={modalNewLead.source}
                      onChange={(e) => setModalNewLead({ ...modalNewLead, source: e.target.value })}
                    >
                      {LEAD_SOURCES.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">SALES OWNER</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={modalNewLead.owner}
                      onChange={(e) => setModalNewLead({ ...modalNewLead, owner: e.target.value })}
                    >
                      {SALES_OWNERS.map((own) => (
                        <option key={own} value={own}>{own}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="crm-lead-field">
                  <label className="crm-field-label">NEXT FOLLOW-UP DATE</label>
                  <input
                    type="date"
                    className="crm-lead-input"
                    value={modalNewLead.nextFollowUp}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, nextFollowUp: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">CITY</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    value={modalNewLead.city}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, city: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">PRIMARY CATEGORY</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    value={modalNewLead.category}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, category: e.target.value })}
                  />
                </div>

                {/* Row 4 */}
                <div className="crm-lead-field">
                  <label className="crm-field-label">TIER</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={modalNewLead.tier}
                      onChange={(e) => setModalNewLead({ ...modalNewLead, tier: e.target.value })}
                    >
                      <option value="Emerging">Emerging</option>
                      <option value="Core">Core</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">GIVEN CREDITS (POINTS)</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={modalNewLead.fashionCreditPlan}
                      onChange={(e) => {
                        const val = e.target.value;
                        const plan = FASHION_CREDIT_PLANS.find((p) => p.id === val);
                        setModalNewLead({
                          ...modalNewLead,
                          fashionCreditPlan: val,
                          creditPoints: plan ? plan.pointsNum : 0,
                        });
                      }}
                    >
                      <option value="">Select a credit plan...</option>
                      <option value="Silver">Silver — 1,00,000 Points</option>
                      <option value="Gold">Gold — 3,00,000 Points</option>
                      <option value="Platinum">Platinum — 4,50,000 Points</option>
                      <option value="Palladium">Palladium — 7,00,000 Points</option>
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">TAKE RATE %</label>
                  <input
                    type="number"
                    className="crm-lead-input"
                    value={modalNewLead.takeRate}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, takeRate: e.target.value })}
                  />
                </div>

                {/* Row 5 */}
                <div className="crm-lead-field">
                  <label className="crm-field-label">ACQUISITION COST (CAC)</label>
                  <input
                    type="number"
                    className="crm-lead-input"
                    value={modalNewLead.cac}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, cac: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">RENEWAL LIKELIHOOD %</label>
                  <input
                    type="number"
                    className="crm-lead-input"
                    value={modalNewLead.renewalProbability}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, renewalProbability: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">CONTRACT END DATE</label>
                  <input
                    type="date"
                    className="crm-lead-input"
                    value={modalNewLead.contractEnds}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, contractEnds: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 6: GST Number & Checkbox */}
              <div className="crm-lead-gst-container">
                <div className="crm-lead-field crm-lead-field-gst">
                  <label className="crm-field-label">
                    GST NUMBER <span className="crm-optional-tag">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    placeholder="27AAAAA0000A1Z5 (or use company GST)"
                    value={useCompanyGst ? maskGstNumber(COMPANY_GST_INFO.gstNumber) : modalNewLead.gst}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, gst: e.target.value })}
                  />
                </div>

                <div className="crm-lead-checkbox-row">
                  <input
                    type="checkbox"
                    id="lead-company-gst-chk"
                    className="crm-custom-checkbox"
                    checked={useCompanyGst}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowGstModal(true);
                      } else {
                        setUseCompanyGst(false);
                        setModalNewLead((prev) => ({ ...prev, gst: "" }));
                      }
                    }}
                  />
                  <label htmlFor="lead-company-gst-chk" className="crm-checkbox-label">
                    Designer doesn't have a GST number? (Use / Request Company GST)
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="crm-lead-submit-row">
                <button type="submit" className="crm-btn-create-lead">
                  Create lead
                </button>
                <button
                  type="button"
                  className="crm-btn-cancel-lead"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* =====================================================
          8. EDIT DESIGNER MODAL
      ===================================================== */}
      {showEditModal && activeDesigner && (
        <div className="crm-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="crm-lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="crm-lead-modal-header">
              <div className="crm-lead-modal-title-wrap">
                <h2 className="crm-lead-modal-title">Edit Designer Details</h2>
                <p className="crm-lead-modal-subtitle">
                  Update live credentials, categories, tier and compliance status.
                </p>
              </div>
              <button
                type="button"
                className="crm-lead-modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="crm-lead-form">
              <div className="crm-lead-grid-3">
                <div className="crm-lead-field">
                  <label className="crm-field-label">DESIGNER NAME</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    value={editForm.designer_name}
                    onChange={(e) => setEditForm({ ...editForm, designer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">BRAND NAME</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    value={editForm.brand_name}
                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    className="crm-lead-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">MOBILE NUMBER</label>
                  <input
                    type="tel"
                    className="crm-lead-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">PRIMARY CATEGORY</label>
                  <input
                    type="text"
                    className="crm-lead-input"
                    value={editForm.primary_category}
                    onChange={(e) => setEditForm({ ...editForm, primary_category: e.target.value })}
                  />
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">KYC STATUS</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={editForm.kyc_status}
                      onChange={(e) => setEditForm({ ...editForm, kyc_status: e.target.value })}
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PENDING">PENDING</option>
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">CONTRACT STATUS</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={editForm.contract_status}
                      onChange={(e) => setEditForm({ ...editForm, contract_status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">STATUS</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="crm-lead-field">
                  <label className="crm-field-label">TIER</label>
                  <div className="crm-select-wrap">
                    <select
                      className="crm-lead-select"
                      value={editForm.tier}
                      onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                    >
                      <option value="Emerging">Emerging</option>
                      <option value="Core">Core</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="crm-lead-submit-row">
                <button type="submit" className="crm-btn-create-lead">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          9. VIEW DESIGNER DOSSIER MODAL
      ===================================================== */}
      {showViewModal && activeDesigner && (() => {
        const { prodCount, sales } = getDesignerStats(activeDesigner);
        return (
          <div className="crm-modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="crm-lead-modal-card crm-view-card" onClick={(e) => e.stopPropagation()}>
              <div className="crm-lead-modal-header">
                <div className="crm-lead-modal-title-wrap">
                  <h2 className="crm-lead-modal-title">
                    {activeDesigner.designer_name || activeDesigner.name || "Designer Profile"} ({activeDesigner.brand_name || activeDesigner.brand || "Brand"})
                  </h2>
                  <p className="crm-lead-modal-subtitle">
                    Designer Code: <code>{activeDesigner.designer_code || `DGN-${activeDesigner.id}`}</code> · Category: <strong>{activeDesigner.primary_category || "Fashion"}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="crm-lead-modal-close-btn"
                  onClick={() => setShowViewModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="crm-view-modal-body">
                <div className="crm-view-stats-row">
                  <div className="crm-view-stat-box">
                    <span className="label">Total Products</span>
                    <strong>{prodCount} SKUs</strong>
                  </div>
                  <div className="crm-view-stat-box">
                    <span className="label">Total Sales (GMV)</span>
                    <strong>₹{Number(sales).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="crm-view-stat-box">
                    <span className="label">KYC Status</span>
                    <span className={`crm-pill-badge ${activeDesigner.kyc_status === "VERIFIED" || activeDesigner.kyc_verified ? "verified" : "pending"}`}>
                      {activeDesigner.kyc_status === "VERIFIED" || activeDesigner.kyc_verified ? "✓ Verified" : "● Pending"}
                    </span>
                  </div>
                  <div className="crm-view-stat-box">
                    <span className="label">Contract Status</span>
                    <span className="crm-pill-badge contract-active">
                      {activeDesigner.contract_status || (activeDesigner.stage === "ACTIVE" ? "Active" : "Under Review")}
                    </span>
                  </div>
                </div>

                <div className="crm-view-contact-details">
                  <p><strong>Mobile:</strong> {activeDesigner.phone || "—"}</p>
                  <p><strong>Email:</strong> {activeDesigner.email || "—"}</p>
                  <p><strong>City:</strong> {activeDesigner.city || "—"}</p>
                  <p><strong>Sales Owner:</strong> {activeDesigner.sales_owner || "Nisha Kapoor"}</p>
                </div>

                <div className="crm-view-actions-footer">
                  <button
                    type="button"
                    className="crm-btn-wa"
                    onClick={() => handleSendWhatsAppPortalLink(activeDesigner)}
                  >
                    <WhatsAppIcon size={16} /> Send WhatsApp Login Invite
                  </button>
                  <button
                    type="button"
                    className="crm-btn-create-lead"
                    onClick={() => {
                      setShowViewModal(false);
                      handleOpenEditModal(activeDesigner);
                    }}
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================
          10. COMPANY GST MODAL
      ===================================================== */}
      {showGstModal && (
        <div className="crm-modal-overlay" onClick={() => setShowGstModal(false)}>
          <div className="crm-lead-modal-card crm-gst-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="crm-lead-modal-header">
              <div className="crm-lead-modal-title-wrap">
                <h3 className="crm-lead-modal-title">Company GST Coverage</h3>
                <p className="crm-lead-modal-subtitle">
                  Apply ZENVE Fashion's master GSTIN to this designer.
                </p>
              </div>
              <button
                type="button"
                className="crm-lead-modal-close-btn"
                onClick={() => setShowGstModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="crm-gst-modal-body">
              <div className="crm-gst-info-card">
                <p><strong>Legal Entity:</strong> {COMPANY_GST_INFO.name}</p>
                <p><strong>Master GSTIN:</strong> <code>{maskGstNumber(COMPANY_GST_INFO.gstNumber)}</code></p>
                <p><strong>Jurisdiction:</strong> {COMPANY_GST_INFO.state}</p>
              </div>

              <div className="crm-gst-modal-actions">
                <button
                  type="button"
                  className="crm-btn-create-lead"
                  onClick={() => {
                    setUseCompanyGst(true);
                    setModalNewLead((prev) => ({ ...prev, gst: COMPANY_GST_INFO.gstNumber }));
                    setShowGstModal(false);
                    showSuccessToast("Applied Company GSTIN!");
                  }}
                >
                  Apply Company GST
                </button>
                <button
                  type="button"
                  className="crm-btn-reset"
                  onClick={() => setShowGstModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}