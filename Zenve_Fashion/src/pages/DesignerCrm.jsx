import React, { useState, useEffect, useMemo, useRef } from "react";
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

import { maskGstNumber } from "../utils/gstUtils.js";
import { showSuccessToast, showErrorToast, showWarningToast } from "../utils/zenveToast";

/* =========================================================
   CONSTANTS & BLUEPRINT SEQUENCE
========================================================= */

export const COMPANY_GST_INFO = {
  name: "ZENVE FASHION PRIVATE LIMITED",
  gstNumber: "29AABCZ1234F1Z8",
  state: "Karnataka (All-India E-Commerce Coverage)",
  type: "E-Commerce Marketplace Operator & Master Platform GSTIN",
  section: "Section 9(5) & Section 52 CGST Act",
  hsnSac: "998311 / 998439 (Fashion Marketplace & Creator Supply Services)",
};

function WhatsAppIcon({ size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

export const FASHION_CREDIT_PLANS = [
  {
    id: "Silver",
    name: "Silver",
    catalogue: 50,
    products: 50,
    points: "1,00,000",
    pointsNum: 100000,
    catalogueCharges: 500,
    minDays: 200,
  },
  {
    id: "Gold",
    name: "Gold",
    catalogue: 200,
    products: 200,
    points: "3,00,000",
    pointsNum: 300000,
    catalogueCharges: 500,
    minDays: 200,
  },
  {
    id: "Platinum",
    name: "Platinum",
    catalogue: 300,
    products: 300,
    points: "4,50,000",
    pointsNum: 450000,
    catalogueCharges: 500,
    minDays: 200,
  },
  {
    id: "Palladium",
    name: "Palladium",
    catalogue: 999,
    products: 999,
    points: "7,00,000",
    pointsNum: 700000,
    catalogueCharges: 500,
    minDays: 200,
  },
];

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

  // Add lead form state (clean initial state)
  const [newLead, setNewLead] = useState({
    name: "",
    brand: "",
    email: "",
    phone: "",
    city: "",
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

  // Search, filter, and view mode states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'
  const [showCreditsCard, setShowCreditsCard] = useState(false);
  const [freezingDesignerId, setFreezingDesignerId] = useState(null);

  // Edit Designer Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState(null);
  const [showModalEditForm, setShowModalEditForm] = useState(true);
  const [editForm, setEditForm] = useState({
    designer_name: "",
    brand_name: "",
    owner_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    primary_category: "",
    tier: "Emerging",
    stage: "LEAD",
    kyc_status: "PENDING",
    take_rate: 0,
    gst_number: "",
    online_membership_plan: "",
    credit_points: 0,
    contract_end_date: "",
    sales_owner: "Nisha Kapoor",
    lead_source: "Referral",
    fulfillment: "BOTH",
    next_followup_date: "",
    renewal_likelihood: 50,
    lost_reason: "",
  });

  // Fresh Designer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
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
    fulfillment: "BOTH",
    nextFollowUp: "",
    renewalProbability: "50",
  });

  // GST Modal & Company GST State
  const [showGstModal, setShowGstModal] = useState(false);
  const [useCompanyGst, setUseCompanyGst] = useState(false);
  const [gstModalTarget, setGstModalTarget] = useState("newLead"); // 'newLead' | 'modalLead' | designer object

  // Inline Add Designer Lead Section (Down Div Structure)
  const [showAddLeadSection, setShowAddLeadSection] = useState(false);
  const addLeadSectionRef = useRef(null);

  const handleToggleAddLead = () => {
    setShowAddLeadSection((prev) => {
      const nextState = !prev;
      if (nextState) {
        setTimeout(() => {
          addLeadSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 80);
      }
      return nextState;
    });
  };

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    if (isError) {
      showErrorToast(msg);
    } else {
      showSuccessToast(msg);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmCompanyGst = async () => {
    const masked = maskGstNumber(COMPANY_GST_INFO.gstNumber);
    if (gstModalTarget === "newLead") {
      setNewLead((prev) => ({ ...prev, gst: COMPANY_GST_INFO.gstNumber }));
      setUseCompanyGst(true);
      showToast(`Applied ZENVE Company GST (${masked})`);
    } else if (gstModalTarget && typeof gstModalTarget === "object") {
      try {
        await handleUpdateField(gstModalTarget.id, {
          gst_number: COMPANY_GST_INFO.gstNumber,
        });
        showToast(
          `Applied Company GST (${masked}) to ${gstModalTarget.brand_name || gstModalTarget.designer_name || "designer"
          }`
        );
      } catch (err) {
        console.error("Failed to update designer GST:", err);
      }
    }
    setShowGstModal(false);
  };

  const handleRequestCompanyGstCreation = async () => {
    const targetName =
      gstModalTarget === "newLead"
        ? newLead.brand || newLead.name || "New Designer Lead"
        : gstModalTarget?.brand_name ||
        gstModalTarget?.designer_name ||
        "Designer";

    const targetCity =
      gstModalTarget === "newLead"
        ? newLead.city || "Regional Hub"
        : gstModalTarget?.city || gstModalTarget?.state || "Regional Hub";

    if (gstModalTarget === "newLead") {
      setNewLead((prev) => ({ ...prev, gst: "COMPANY_GST_REQUESTED" }));
      setUseCompanyGst(true);
      showToast(
        `Requested company-side GST creation for ${targetName}! Company will create a new GST number.`
      );
    } else if (gstModalTarget && typeof gstModalTarget === "object") {
      try {
        const existingTasks = gstModalTarget.follow_up_tasks || [];
        const newTask = {
          id: Date.now(),
          text: `Company Tax Team: Create dedicated company GST number for ${targetName} (${targetCity})`,
          due_date: new Date().toISOString().split("T")[0],
          completed: false,
        };

        await handleUpdateField(gstModalTarget.id, {
          gst_number: "COMPANY_GST_REQUESTED",
          follow_up_tasks: [...existingTasks, newTask],
        });

        showToast(
          `Requested! Company side will create a new GST number for ${targetName}.`
        );
      } catch (err) {
        console.error("Failed to request company GST creation:", err);
      }
    }
    setShowGstModal(false);
  };

  const handleCloseGstModal = () => {
    setShowGstModal(false);
    if (
      gstModalTarget === "newLead" &&
      newLead.gst.trim().toUpperCase() !== COMPANY_GST_INFO.gstNumber &&
      newLead.gst !== "COMPANY_GST_REQUESTED"
    ) {
      setUseCompanyGst(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showGstModal) {
        handleCloseGstModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGstModal, newLead.gst, gstModalTarget]);

  const canShareDesignerLogin = (designer) => {
    return designer?.is_active !== false &&
      ["APPROVED", "CONTRACT", "SIGNED", "LIVE", "ACTIVE"].includes(designer?.stage);
  };

  const designerLoginUrl = () => `${window.location.origin}/designer-login`;

  const handleSendWhatsAppPortalLink = (designer) => {
    if (!canShareDesignerLogin(designer)) {
      showErrorToast("Approve this designer before sharing the login link.");
      return;
    }
    let phone = String(designer.phone || "").replace(/[^0-9]/g, "");
    if (phone.length === 10) phone = `91${phone}`;
    if (phone.length < 10 || phone.length > 15) {
      showErrorToast("Add a valid registered mobile number before sharing the login link.");
      return;
    }
    const name = designer.owner_name || designer.designer_name || "Designer";
    const message = `Hello ${name}, your ${designer.brand_name || "designer"} account has been approved on ZENVE Fashion.

Designer login: ${designerLoginUrl()}

Sign in using your registered mobile number and the OTP sent to it. KYC verification is required before dashboard access.

Team ZENVE Fashion`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    showToast("WhatsApp message opened. Send it to share the designer login link.");
  };

  const handleCopyPortalLoginLink = async (designer) => {
    if (!canShareDesignerLogin(designer)) {
      showErrorToast("Approve this designer before sharing the login link.");
      return;
    }
    const url = designerLoginUrl();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Designer login link copied.");
    } catch {
      window.prompt("Copy designer login link:", url);
    }
  };

  // Freeze / Unfreeze designer (toggle active vs inactive)
  const handleFreezeDesigner = async (designer) => {
    if (!designer || freezingDesignerId) return;
    const unfreezing = designer.stage === "INACTIVE";
    setFreezingDesignerId(designer.id);
    try {
      const nextStage = unfreezing ? "ACTIVE" : "INACTIVE";
      const updated = await updateDesigner(designer.id, { stage: nextStage });
      setDesigners((items) =>
        items.map((item) =>
          item.id === designer.id ? { ...item, stage: nextStage, ...updated } : item
        )
      );
      showSuccessToast(
        unfreezing
          ? `${designer.brand_name || designer.designer_name || "Designer"} unfrozen. Status changed to Active.`
          : `${designer.brand_name || designer.designer_name || "Designer"} frozen. Status changed to Inactive.`
      );
    } catch (error) {
      showErrorToast(
        error.message ||
        (unfreezing ? "Could not unfreeze designer." : "Could not freeze designer.")
      );
    } finally {
      setFreezingDesignerId(null);
    }
  };

  // Fetch all live records
  const loadData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const designersRes = await getDesigners();
      const [
        ordersRes,
        productsRes,
        returnsRes,
        settlementsRes,
      ] = await Promise.all([
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
      setError(err.message || "Failed to connect to backend server.");
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

  const allSalesOwners = useMemo(() => {
    const list = new Set(SALES_OWNERS);
    designers.forEach((d) => {
      if (d.sales_owner) list.add(d.sales_owner);
    });
    return Array.from(list);
  }, [designers]);

  const allLeadSources = useMemo(() => {
    const list = new Set(LEAD_SOURCES);
    designers.forEach((d) => {
      if (d.lead_source) list.add(d.lead_source);
    });
    return Array.from(list);
  }, [designers]);

  const partnershipRevenue = useMemo(() => {
    return settlements
      .filter((s) => s.status !== "REVERSED" && !s.is_reversal)
      .reduce(
        (sum, s) => sum + (Number(s.commission || s.commission_amount) || 0),
        0
      );
  }, [settlements]);

  // Real-time Search & Filter across names, brands, contact details, and status
  const filteredDesigners = useMemo(() => {
    return designers.filter((d) => {
      // 1. Status Filter
      if (
        statusFilter !== "ALL" &&
        (d.stage || "LEAD").toUpperCase() !== statusFilter.toUpperCase()
      ) {
        return false;
      }

      // 2. Search Term Filter (names, brands, contact details, status)
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const nameMatch =
        (d.designer_name || "").toLowerCase().includes(term) ||
        (d.name || "").toLowerCase().includes(term) ||
        (d.owner_name || "").toLowerCase().includes(term);

      const brandMatch =
        (d.brand_name || "").toLowerCase().includes(term) ||
        (d.brand || "").toLowerCase().includes(term) ||
        (d.primary_category || "").toLowerCase().includes(term);

      const contactMatch =
        (d.email || "").toLowerCase().includes(term) ||
        (d.phone || "").toLowerCase().includes(term) ||
        (d.city || "").toLowerCase().includes(term) ||
        (d.state || "").toLowerCase().includes(term);

      const statusMatch =
        (d.stage || "LEAD").toLowerCase().includes(term) ||
        (d.tier || "").toLowerCase().includes(term) ||
        (d.designer_code || "").toLowerCase().includes(term) ||
        (d.sales_owner || "").toLowerCase().includes(term) ||
        (d.fulfillment || "").toLowerCase().includes(term);

      return nameMatch || brandMatch || contactMatch || statusMatch;
    });
  }, [designers, searchTerm, statusFilter]);

  // Open Edit Designer Modal (Direct popup to cards designer div)
  const handleOpenEditModal = (designer) => {
    setEditingDesigner(designer);
    setShowModalEditForm(true);
    setEditForm({
      designer_name: designer.designer_name || designer.name || "",
      brand_name: designer.brand_name || designer.brand || "",
      owner_name: designer.owner_name || designer.designer_name || "",
      email: designer.email || "",
      phone: designer.phone || "",
      city: designer.city || "",
      state: designer.state || "",
      primary_category: designer.primary_category || designer.category || "",
      tier: designer.tier || "Emerging",
      stage: designer.stage || "LEAD",
      kyc_status: designer.kyc_status || (designer.kyc_verified ? "VERIFIED" : "PENDING"),
      take_rate: designer.take_rate != null ? Number(designer.take_rate) : 0,
      gst_number: designer.gst_number || designer.gst || "",
      online_membership_plan: designer.online_membership_plan || "",
      credit_points: designer.credit_points != null ? Number(designer.credit_points) : 0,
      contract_end_date: designer.contract_end_date || "",
      sales_owner: designer.sales_owner || "Nisha Kapoor",
      lead_source: designer.lead_source || "Referral",
      fulfillment: designer.fulfillment || "BOTH",
      next_followup_date: designer.next_followup_date || "",
      renewal_likelihood: designer.renewal_likelihood != null ? designer.renewal_likelihood : 50,
      lost_reason: designer.lost_reason || "",
    });
    setShowEditModal(true);
  };

  // Save changes from Edit Designer Modal
  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingDesigner) return;

    if (!editForm.designer_name.trim() || !editForm.brand_name.trim()) {
      showWarningToast("Designer name and brand name are required.");
      return;
    }

    const payload = {
      designer_name: editForm.designer_name.trim(),
      brand_name: editForm.brand_name.trim(),
      owner_name: editForm.owner_name.trim() || editForm.designer_name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim() || null,
      primary_category: editForm.primary_category.trim(),
      tier: editForm.tier,
      stage: editForm.stage,
      kyc_status: editForm.kyc_status,
      kyc_verified: editForm.kyc_status === "VERIFIED",
      take_rate: Number(editForm.take_rate) || 0,
      gst_number: editForm.gst_number.trim()
        ? editForm.gst_number === "COMPANY_GST_REQUESTED"
          ? "COMPANY_GST_REQUESTED"
          : editForm.gst_number.trim().toUpperCase() === maskGstNumber(COMPANY_GST_INFO.gstNumber)
            ? COMPANY_GST_INFO.gstNumber
            : editForm.gst_number.trim().toUpperCase()
        : null,
      online_membership_plan: editForm.online_membership_plan ? editForm.online_membership_plan.toUpperCase() : null,
      credit_points: Number(editForm.credit_points) || 0,
      contract_end_date: editForm.contract_end_date || null,
      sales_owner: editForm.sales_owner,
      lead_source: editForm.lead_source,
      fulfillment: editForm.fulfillment || "BOTH",
      next_followup_date: editForm.next_followup_date || null,
      renewal_likelihood: Number(editForm.renewal_likelihood || 0),
      lost_reason: editForm.lost_reason || null,
    };

    try {
      const updated = await updateDesigner(editingDesigner.id, payload);
      setDesigners((list) =>
        list.map((d) => (d.id === editingDesigner.id ? { ...d, ...payload, ...updated } : d))
      );
      showToast(`Updated details for ${payload.brand_name}.`);
      setShowModalEditForm(false);
    } catch (err) {
      console.error("Failed to update designer:", err);
      showErrorToast(err.message || "Failed to update designer details.");
    }
  };

  // Create Fresh Designer from Modal
  const handleModalCreateLead = async (e) => {
    e.preventDefault();
    if (!modalNewLead.name.trim() || !modalNewLead.brand.trim()) {
      showWarningToast("Designer name and brand name are required.");
      return;
    }
    if (!modalNewLead.email.trim() && !modalNewLead.phone.trim()) {
      showWarningToast("Please provide at least an email address or mobile number.");
      return;
    }

    const designerCode = `DSG-${String(Date.now()).slice(-4)}`;

    const payload = {
      designer_code: designerCode,
      designer_name: modalNewLead.name.trim(),
      brand_name: modalNewLead.brand.trim(),
      owner_name: modalNewLead.name.trim(),
      email: modalNewLead.email.trim() || `${modalNewLead.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: modalNewLead.phone.trim(),
      city: modalNewLead.city.trim() || "",
      state: modalNewLead.state.trim() || null,
      primary_category: modalNewLead.category.trim() || "",
      tier: modalNewLead.tier.toUpperCase(),
      online_membership_plan: modalNewLead.fashionCreditPlan ? modalNewLead.fashionCreditPlan.toUpperCase() : null,
      credit_points: Number(modalNewLead.creditPoints) || (FASHION_CREDIT_PLANS.find((p) => p.id.toUpperCase() === (modalNewLead.fashionCreditPlan || "").toUpperCase())?.pointsNum || 0),
      take_rate: modalNewLead.takeRate !== "" ? Number(modalNewLead.takeRate) : 0,
      gst_number: modalNewLead.gst.trim()
        ? modalNewLead.gst === "COMPANY_GST_REQUESTED"
          ? "COMPANY_GST_REQUESTED"
          : modalNewLead.gst.trim().toUpperCase() === maskGstNumber(COMPANY_GST_INFO.gstNumber)
            ? COMPANY_GST_INFO.gstNumber
            : modalNewLead.gst.trim().toUpperCase()
        : null,
      contract_end_date: modalNewLead.contractEnds || null,
      lead_source: modalNewLead.source,
      sales_owner: modalNewLead.owner,
      fulfillment: modalNewLead.fulfillment || "BOTH",
      next_followup_date: modalNewLead.nextFollowUp || null,
      renewal_likelihood: Number(modalNewLead.renewalProbability || 50),
      stage: "LEAD",
      kyc_status: "PENDING",
      kyc_verified: false,
    };

    try {
      const created = await createDesigner(payload);
      setDesigners((prev) => [created, ...prev]);
      showToast(`${modalNewLead.brand} added successfully.`);
      setShowAddModal(false);
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
        fulfillment: "BOTH",
        nextFollowUp: "",
        renewalProbability: "50",
      });
    } catch (err) {
      console.error("Failed to create fresh designer:", err);
      showErrorToast(err.message || "Failed to create fresh designer.");
    }
  };

  // Designer Economics & Health Score calculation from live DB metrics
  const getDesignerEconomics = (designer) => {
    const isKyc =
      designer.is_kyc_verified ??
      (designer.kyc_verified || designer.kyc_status === "VERIFIED");

    // Match all products belonging to this designer
    const designerProducts = products.filter(
      (p) =>
        p.designer === designer.id ||
        p.designerId === designer.id ||
        p.designer_code === designer.designer_code ||
        p.designer_brand === designer.brand_name ||
        p.designer_name === designer.brand_name ||
        p.designer_name === designer.designer_name ||
        p.designer_name === designer.owner_name
    );
    const designerProductIds = designerProducts.map((p) => String(p.id));
    const designerSkus = designerProducts.map((p) => p.sku).filter(Boolean);

    // Calculate line-item totals from database orders
    let orderItemsSum = 0;
    let orderItemsMonthlySum = 0;
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;

    orders.forEach((o) => {
      const isCancelled =
        String(o.status || o.order_status || "").toUpperCase() === "CANCELLED";
      if (isCancelled) return;

      const orderTime = o.created_at ? new Date(o.created_at).getTime() : 0;
      const isRecent = orderTime >= monthAgo;

      const items = o.items || o.lines || [];
      items.forEach((item) => {
        const matches =
          (item.brand_name && item.brand_name === designer.brand_name) ||
          (item.brand && item.brand === designer.brand_name) ||
          (item.product_id && designerProductIds.includes(String(item.product_id))) ||
          (item.sku && designerSkus.includes(item.sku)) ||
          (item.skuId && designerSkus.includes(item.skuId));

        if (matches) {
          const itemTotal =
            Number(
              item.total ||
              item.total_price ||
              (Number(item.price || 0) * Number(item.quantity || item.qty || 1))
            ) || 0;
          orderItemsSum += itemTotal;
          if (isRecent) {
            orderItemsMonthlySum += itemTotal;
          }
        }
      });
    });

    // Prefer backend calculated DB metrics if available, fallback to computed items
    const gmv =
      designer.lifetime_gmv !== undefined && Number(designer.lifetime_gmv) > 0
        ? Number(designer.lifetime_gmv)
        : orderItemsSum;

    const monthlyGmv =
      designer.monthly_gmv !== undefined && Number(designer.monthly_gmv) > 0
        ? Number(designer.monthly_gmv)
        : (orderItemsMonthlySum > 0 ? orderItemsMonthlySum : gmv);

    const takeRatePct = Number(designer.take_rate) || 0;
    const ltv =
      designer.designer_ltv !== undefined && Number(designer.designer_ltv) > 0
        ? Number(designer.designer_ltv)
        : Math.round((gmv * takeRatePct) / 100);

    const cac = Number(designer.designer_cac ?? designer.acquisition_cost) || 0;
    const roi =
      designer.ltv_cac_ratio ||
      (cac > 0 && ltv > 0
        ? `${Math.round((ltv / cac) * 100) / 100}×`
        : "0×");

    const liveSkus = designerProducts.filter(
      (p) => p.status === "LIVE" || p.status === "APPROVED" || p.is_live
    ).length;

    const skuProductivity =
      designer.effective_sku_productivity !== undefined &&
        Number(designer.effective_sku_productivity) > 0
        ? Number(designer.effective_sku_productivity)
        : (liveSkus > 0 ? Math.round(gmv / liveSkus) : Math.round(gmv));

    // Health score from real DB data
    const totalProds = designerProducts.length;
    const qaApproved = designerProducts.filter(
      (p) =>
        p.status === "LIVE" ||
        p.status === "APPROVED" ||
        p.qa_status === "APPROVED"
    ).length;
    const qaRate = totalProds > 0 ? (qaApproved / totalProds) * 100 : 0;
    const inStock = designerProducts.filter(
      (p) => Number(p.available_quantity || p.inventory_quantity || 0) > 0
    ).length;
    const stockRate = totalProds > 0 ? (inStock / totalProds) * 100 : 0;
    const renewalProb = Number(designer.renewal_likelihood ?? 0);

    const health =
      designer.health_score !== undefined && Number(designer.health_score) > 0
        ? Number(designer.health_score)
        : totalProds > 0 || gmv > 0
          ? Math.max(
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
          )
          : Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (isKyc ? 100 : 0) * 0.3 +
                renewalProb * 0.4 +
                (designer.contract_signed ? 30 : 0)
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
      showErrorToast("Failed to update stage.");
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
      showErrorToast("Failed to update KYC status.");
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
      showWarningToast("Task title is required.");
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
    if (!newLead.name.trim() || !newLead.brand.trim()) {
      showWarningToast("Designer name and brand name are required.");
      return;
    }
    if (!newLead.email.trim() && !newLead.phone.trim()) {
      showWarningToast("Please provide at least an email address or mobile number.");
      return;
    }

    const designerCode = `DSG-${String(Date.now()).slice(-4)}`;

    const payload = {
      designer_code: designerCode,
      designer_name: newLead.name.trim(),
      brand_name: newLead.brand.trim(),
      owner_name: newLead.name.trim(),
      email: newLead.email.trim() || `${newLead.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: newLead.phone.trim(),
      city: newLead.city.trim() || "",
      primary_category: newLead.category.trim() || "",
      tier: newLead.tier.toUpperCase(),
      online_membership_plan: newLead.fashionCreditPlan ? newLead.fashionCreditPlan.toUpperCase() : null,
      credit_points: Number(newLead.creditPoints) || (FASHION_CREDIT_PLANS.find((p) => p.id.toUpperCase() === (newLead.fashionCreditPlan || "").toUpperCase())?.pointsNum || 0),
      take_rate: newLead.takeRate !== "" ? Number(newLead.takeRate) : 0,
      gst_number: newLead.gst.trim()
        ? newLead.gst === "COMPANY_GST_REQUESTED"
          ? "COMPANY_GST_REQUESTED"
          : newLead.gst.trim().toUpperCase() === maskGstNumber(COMPANY_GST_INFO.gstNumber)
            ? COMPANY_GST_INFO.gstNumber
            : newLead.gst.trim().toUpperCase()
        : null,
      contract_end_date: newLead.contractEnds || null,
      lead_source: newLead.source,
      sales_owner: newLead.owner,
      next_followup_date: newLead.nextFollowUp || null,
      acquisition_cost: newLead.cac !== "" ? Number(newLead.cac) : 0,
      renewal_likelihood: newLead.renewalProbability !== "" ? Number(newLead.renewalProbability) : 0,
      stage: "LEAD",
      kyc_status: "PENDING",
      kyc_verified: false,
      follow_up_tasks:
        newLead.gst === "COMPANY_GST_REQUESTED"
          ? [
            {
              id: Date.now(),
              text: `Company Tax Team: Create dedicated company GST for ${newLead.brand.trim()} (${newLead.city.trim() || "Regional Hub"})`,
              due_date: new Date().toISOString().split("T")[0],
              completed: false,
            },
          ]
          : [],
    };

    try {
      const created = await createDesigner(payload);
      setDesigners((prev) => [created, ...prev]);
      showToast(`${newLead.brand} added as a new lead.`);
      setNewLead({
        name: "",
        brand: "",
        email: "",
        phone: "",
        city: "",
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
      console.error("Failed to create designer lead:", err);
      showErrorToast(err.message || "Failed to create designer lead.");
    }
  };

  // Render full designer card div (used in both Cards View and Edit Modal popup)
  const renderDesignerCard = (designer, isModal = false) => {
    const econ = getDesignerEconomics(designer);
    const tasks = designer.follow_up_tasks || [];
    const currentInput = taskInputs[designer.id] || {
      text: "",
      due: "",
    };
    const isFrozen = designer.stage === "INACTIVE";
    const isFreezing = freezingDesignerId === designer.id;

    return (
      <article
        className={`designer-card ${isModal ? "designer-card-modal-view" : ""}`}
        key={designer.id}
      >
        {/* Top Row: Brand, Badges, Stage Actions */}
        <div className="designer-card-top">
          <div className="designer-info-left">
            <div className="designer-header-row">
              <h3 className="designer-brand-name">
                {designer.brand_name || designer.name || "Brand"}
              </h3>

              {!isModal ? (
                <button
                  type="button"
                  className="btn-table-edit"
                  onClick={() => handleOpenEditModal(designer)}
                  title="Edit designer details"
                  style={{ marginLeft: "4px" }}
                >
                  ✎ Edit
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn-table-edit ${showModalEditForm ? "active" : ""}`}
                  onClick={() => setShowModalEditForm((prev) => !prev)}
                  title="Toggle details editor"
                  style={{ marginLeft: "4px" }}
                >
                  {showModalEditForm ? "▲ Hide Form" : "✎ Edit Details"}
                </button>
              )}

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

              {designer.online_membership_plan && (
                <span
                  className="tone-badge"
                  style={{
                    background: "rgba(223, 177, 108, 0.15)",
                    color: "#dfb16c",
                    border: "1px solid rgba(223, 177, 108, 0.35)",
                    fontWeight: "600",
                  }}
                  title={`Credit Points: ${Number(designer.credit_points || 0).toLocaleString("en-IN")}`}
                >
                  ★ {designer.online_membership_plan} ({Number(designer.credit_points || 0).toLocaleString("en-IN")} Pts)
                </span>
              )}

              <span
                className={`tone-badge ${econ.isKyc ? "good" : "bad"
                  }`}
              >
                {econ.isKyc ? "KYC verified" : "KYC missing"}
              </span>

              <span
                className={`tone-badge ${econ.health >= 70
                  ? "good"
                  : econ.health >= 45
                    ? "warn"
                    : "bad"
                  }`}
              >
                Health {econ.health}/100
              </span>

              <span
                className={`tone-badge ${designer.gst_number || designer.gst ? "good" : "warn"
                  }`}
              >
                {designer.gst_number || designer.gst
                  ? (designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                    designer.gst === COMPANY_GST_INFO.gstNumber
                    ? "Company GST"
                    : (designer.gst_number === "COMPANY_GST_REQUESTED" ||
                      designer.gst === "COMPANY_GST_REQUESTED")
                      ? "GST Requested (Company)"
                      : "GST Verified")
                  : "No GST"}
              </span>
            </div>

            {/* Meta Line 1 */}
            <p className="designer-subtext-line">
              {designer.designer_code || `DSG-${designer.id}`} ·{" "}
              {designer.designer_name || designer.owner_name || "—"} ·{" "}
              {designer.email || designer.phone || "—"} ·{" "}
              {designer.city || "—"} ·{" "}
              {designer.primary_category || "—"} · take
              rate {designer.take_rate != null ? `${Number(designer.take_rate)}%` : "0%"}
              {designer.online_membership_plan
                ? ` · Credits: ${designer.online_membership_plan} (${Number(designer.credit_points || 0).toLocaleString("en-IN")} pts)`
                : ""}
              {designer.contract_end_date
                ? ` · contract ends ${designer.contract_end_date}`
                : ""} · GST:{" "}
              {designer.gst_number || designer.gst ? (
                <span className="designer-gst-code">
                  {designer.gst_number === "COMPANY_GST_REQUESTED" ||
                    designer.gst === "COMPANY_GST_REQUESTED" ? (
                    <span className="tone-badge warn" style={{ fontSize: "11px", padding: "2px 6px" }}>
                      Creation Requested (Company)
                    </span>
                  ) : (
                    <>
                      {(designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                        designer.gst === COMPANY_GST_INFO.gstNumber)
                        ? maskGstNumber(designer.gst_number || designer.gst)
                        : (designer.gst_number || designer.gst)}
                      {(designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                        designer.gst === COMPANY_GST_INFO.gstNumber) && (
                          <span className="designer-gst-corp-tag">ZENVE</span>
                        )}
                    </>
                  )}
                  <button
                    type="button"
                    className="crm-gst-switch-btn"
                    title="Change or request Company GST"
                    onClick={() => {
                      setGstModalTarget(designer);
                      setShowGstModal(true);
                    }}
                  >
                    ✎
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="crm-gst-assign-link"
                  onClick={() => {
                    setGstModalTarget(designer);
                    setShowGstModal(true);
                  }}
                >
                  + Assign Company GST
                </button>
              )}
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
              {designer.renewal_likelihood != null ? `${designer.renewal_likelihood}%` : "—"}
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

            <button
              type="button"
              className={`btn-crm-action outline ${designer.stage === "INACTIVE" ? "tone-badge bad" : ""}`}
              disabled={Boolean(freezingDesignerId)}
              onClick={() => handleFreezeDesigner(designer)}
              title={designer.stage === "INACTIVE" ? "Unfreeze designer to Active" : "Freeze designer to Inactive"}
            >
              {freezingDesignerId === designer.id
                ? (designer.stage === "INACTIVE" ? "Unfreezing…" : "Freezing…")
                : (designer.stage === "INACTIVE" ? "Unfreeze" : "Freeze")}
            </button>
          </div>
        </div>

        {/* INLINE DETAILS EDITOR (Visible in popup modal when toggled) */}
        {isModal && showModalEditForm && (
          <div className="card-inline-editor">
            <div className="card-inline-editor-header">
              <h4 className="card-inline-editor-title">
                <span>✏️ Edit Designer Details</span>
                <span className="card-inline-editor-badge">Live Profile Sync</span>
              </h4>
              <button
                type="button"
                className="crm-gst-switch-btn"
                onClick={() => setShowModalEditForm(false)}
                title="Collapse editor"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="card-inline-editor-form">
              <div className="card-inline-editor-grid">
                <div className="crm-form-group">
                  <label className="crm-form-label">Brand Name *</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.brand_name}
                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                    required
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Designer Name *</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.designer_name}
                    onChange={(e) => setEditForm({ ...editForm, designer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Owner / Contact</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.owner_name}
                    onChange={(e) => setEditForm({ ...editForm, owner_name: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Email Address *</label>
                  <input
                    type="email"
                    className="crm-form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="crm-form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">City</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">State / Region</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Primary Category</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.primary_category}
                    onChange={(e) => setEditForm({ ...editForm, primary_category: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Tier</label>
                  <select
                    className="crm-form-select"
                    value={editForm.tier}
                    onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                  >
                    <option value="Emerging">Emerging</option>
                    <option value="Core">Core</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Take Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="crm-form-input"
                    value={editForm.take_rate}
                    onChange={(e) => setEditForm({ ...editForm, take_rate: e.target.value })}
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">GST Number</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    value={editForm.gst_number}
                    onChange={(e) => setEditForm({ ...editForm, gst_number: e.target.value })}
                    placeholder="27AAAAA0000A1Z5 or Company GST"
                  />
                </div>
                <div className="crm-form-group">
                  <label className="crm-form-label">Contract End Date</label>
                  <input
                    type="date"
                    className="crm-form-input"
                    value={editForm.contract_end_date}
                    onChange={(e) => setEditForm({ ...editForm, contract_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="card-inline-editor-actions">
                <button type="submit" className="btn-modal-save">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowModalEditForm(false)}
                >
                  Collapse Editor
                </button>
              </div>
            </form>
          </div>
        )}

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

        {/* EXTRA DIV: WHATSAPP DIRECT PORTAL ACCESS NOTIFICATION */}
        <div className="crm-whatsapp-portal-card">
          <div className="whatsapp-card-badge-row">
            <span className="whatsapp-pill">
              <WhatsAppIcon size={13} /> WHATSAPP LOGIN INVITATION
            </span>
            <span className="whatsapp-status-tag">
              {canShareDesignerLogin(designer) ? "Approved · Login link ready" : "Approval required"}
            </span>
          </div>

          <div className="whatsapp-card-content">
            <div className="whatsapp-card-info">
              <h4 className="whatsapp-designer-title">
                {designer.brand_name || designer.designer_name} Company Access
              </h4>
              <p className="whatsapp-designer-desc">
                Company details confirmed: <strong>{COMPANY_GST_INFO.name}</strong> · GST: <strong>{maskGstNumber(designer.gst_number || designer.gst || COMPANY_GST_INFO.gstNumber)}</strong> · City: <strong>{designer.city || "Corporate Hub"}</strong>
              </p>
              <span className="whatsapp-phone-hint">
                📱 Registered contact: <strong>{designer.phone || designer.contact || designer.email || "No phone added"}</strong>
              </span>
            </div>

            <button
              type="button"
              className="btn-send-whatsapp-portal"
              onClick={() => handleSendWhatsAppPortalLink(designer)}
              disabled={!canShareDesignerLogin(designer) || !designer.phone}
              title="Share the approved designer login link via WhatsApp"
            >
              <WhatsAppIcon size={16} />
              <span>Send WhatsApp Login Link</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleCopyPortalLoginLink(designer)}
              disabled={!canShareDesignerLogin(designer)}
              title="Copy the designer login link"
            >
              Copy Login Link
            </button>
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
                        className={`task-title ${isDone ? "done" : ""
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
                {allSalesOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>

            <div className="crm-control-item">
              <span className="label-caps">Given credits plan</span>
              <select
                className="crm-select"
                value={designer.online_membership_plan || ""}
                onChange={(e) => {
                  const plan = FASHION_CREDIT_PLANS.find(
                    (p) => p.id.toUpperCase() === e.target.value.toUpperCase()
                  );
                  handleUpdateField(designer.id, {
                    online_membership_plan: e.target.value ? e.target.value.toUpperCase() : null,
                    credit_points: plan ? plan.pointsNum : 0,
                  });
                }}
              >
                <option value="">No Plan</option>
                <option value="SILVER">Silver (1,00,000 Pts)</option>
                <option value="GOLD">Gold (3,00,000 Pts)</option>
                <option value="PLATINUM">Platinum (4,50,000 Pts)</option>
                <option value="PALLADIUM">Palladium (7,00,000 Pts)</option>
              </select>
            </div>

            <div className="crm-control-item">
              <span className="label-caps">Renewal likelihood %</span>
              <input
                type="number"
                className="crm-input-num"
                min="0"
                max="100"
                value={designer.renewal_likelihood ?? ""}
                onChange={(e) =>
                  handleUpdateField(designer.id, {
                    renewal_likelihood: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="crm-control-item">
              <span className="label-caps">Fulfillment</span>
              <select
                aria-label="Fulfillment"
                className="crm-select"
                value={designer.fulfillment || ""}
                onChange={(e) =>
                  handleUpdateField(designer.id, {
                    fulfillment: e.target.value,
                  })
                }
              >
                <option value="">Select fulfillment</option>
                <option value="HUBSHIP">Hubship</option>
                <option value="DROPSHIP">Dropship</option>
                <option value="BOTH">Both</option>
              </select>
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

        {isModal && (
          <div className="card-modal-footer-bar">
            <span className="card-modal-footer-hint">
              Live interactive card: stages, KYC, tasks, and sales controls sync automatically.
            </span>
            <button
              type="button"
              className="btn-modal-done"
              onClick={() => {
                setShowEditModal(false);
                setEditingDesigner(null);
              }}
            >
              Done & Close
            </button>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="designer-crm-page">
      {/* HEADER */}
      <header className="ZENVE-header">
        <div className="ZENVE-header-inner">
          <div className="ZENVE-header-left">
            <div className="ZENVE-portal-logo">
              <img src={logo} alt="Zenve Fashion" />
            </div>

            <div className="ZENVE-header-title-block">
              <Link to="/command-centre" className="ZENVE-back-link">
                ← ALL 12 LAYERS
              </Link>

              <h1 className="ZENVE-portal-title">
                <span className="ZENVE-layer-num">01</span>
                <span>Designer CRM</span>
              </h1>

              <p className="ZENVE-portal-desc">
                Supply layer · Lead, qualification, approval, KYC, contract, status
              </p>
            </div>
          </div>

          <div className="ZENVE-header-right">
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

        {/* 2. DESIGNER DIRECTORY & PIPELINE */}
        <section className="crm-panel">
          <div className="crm-panel-header">
            <div className="crm-panel-title-block">
              <h2 className="crm-panel-title">Designer Directory & Pipeline</h2>
              <p className="crm-panel-desc">
                Comprehensive directory and status tracking of all registered designers.
                Stages follow the blueprint: lead → qualified → portfolio →
                review → approved → contract → signed → live → active.
              </p>
            </div>
          </div>

          {/* DEDICATED SEARCH BAR, STATUS FILTER, VIEW SWITCHER & FRESH DESIGNER BUTTON */}
          <div className="crm-toolbar">
            <div className="crm-search-box">
              <svg className="crm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="crm-search-input"
                placeholder="Search by name, brand, contact (email, phone, city), or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="crm-search-clear"
                  onClick={() => setSearchTerm("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="crm-toolbar-right">
              <select
                className="crm-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                title="Filter by status/stage"
              >
                <option value="ALL">All Statuses ({designers.length})</option>
                {STAGES_SEQUENCE.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage} ({designers.filter((d) => (d.stage || "LEAD") === stage).length})
                  </option>
                ))}
              </select>

              <div className="crm-view-switcher">
                <button
                  type="button"
                  className={`crm-view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  className={`crm-view-btn ${viewMode === "cards" ? "active" : ""}`}
                  onClick={() => setViewMode("cards")}
                  title="Cards View"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>Cards</span>
                </button>
              </div>

              <button
                type="button"
                className={`btn-fresh-designer ${showAddLeadSection ? "active" : ""}`}
                onClick={handleToggleAddLead}
                title="Add a designer lead"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add designers</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="crm-empty-state">Loading designer records...</div>
          ) : filteredDesigners.length === 0 ? (
            <div className="crm-empty-state">
              <p>
                {searchTerm || statusFilter !== "ALL"
                  ? "No designers match your search or filter."
                  : "No designers found. Click Add designers to get started."}
              </p>
              {(searchTerm || statusFilter !== "ALL") && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ marginTop: "10px" }}
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            <div className="crm-table-wrapper">
              <table className="crm-designers-table">
                <thead>
                  <tr>
                    <th>Code & Brand</th>
                    <th>Designer / Owner</th>
                    <th>Contact Details</th>
                    <th>City / State</th>
                    <th>Category & Tier</th>
                    <th>Status / Stage</th>
                    <th>KYC & GST</th>
                    <th>Plan & Credits</th>
                    <th>Sales Owner</th>
                    <th>Follow-up</th>
                    <th>Fulfillment</th>
                    <th>Contract Ends</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigners.map((designer) => {
                    const econ = getDesignerEconomics(designer);
                    const isFrozen = designer.stage === "INACTIVE";
                    const isFreezing = freezingDesignerId === designer.id;
                    return (
                      <tr key={designer.id}>
                        <td>
                          <div className="table-brand-cell">
                            <span className="table-designer-code">
                              {designer.designer_code || `DSG-${designer.id}`}
                            </span>
                            <span className="table-brand-name">
                              {designer.brand_name || designer.name || "Brand"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="table-person-cell">
                            <span className="table-person-name">
                              {designer.designer_name || designer.owner_name || "—"}
                            </span>
                            {designer.owner_name && designer.owner_name !== designer.designer_name && (
                              <span className="table-person-owner">
                                Legal: {designer.owner_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-contact-cell">
                            {designer.email && (
                              <span className="table-contact-email" title={designer.email}>
                                ✉ {designer.email}
                              </span>
                            )}
                            <div className="table-contact-phone-row">
                              {designer.phone && <span>📞 {designer.phone}</span>}
                              {designer.phone && (
                                <button
                                  type="button"
                                  className="table-wa-icon-btn"
                                  onClick={() => handleSendWhatsAppPortalLink(designer)}
                                  title="Send WhatsApp portal link"
                                >
                                  <WhatsAppIcon size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="table-location-cell">
                            {[designer.city, designer.state].filter(Boolean).join(", ") || "—"}
                          </div>
                        </td>
                        <td>
                          <div className="table-category-cell">
                            <span className="table-cat-text">
                              {designer.primary_category || "Fashion"}
                            </span>
                            <span className="tone-badge info table-tier-badge">
                              {designer.tier || "Emerging"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="table-stage-cell">
                            <span className={`tone-badge ${getStageTone(designer.stage)}`}>
                              {designer.stage || "LEAD"}
                            </span>
                            {!isFrozen && (
                              <button
                                type="button"
                                className="table-advance-btn"
                                onClick={() => handleAdvanceStage(designer)}
                                title="Advance to next stage"
                              >
                                Advance →
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="table-compliance-cell">
                            <button
                              type="button"
                              className={`table-kyc-btn ${econ.isKyc ? "good" : "bad"}`}
                              onClick={() => handleToggleKyc(designer)}
                              title="Click to toggle KYC status"
                            >
                              {econ.isKyc ? "✓ KYC" : "⚠ Pending"}
                            </button>
                            <span className="table-gst-tag">
                              {designer.gst_number || designer.gst
                                ? designer.gst_number === COMPANY_GST_INFO.gstNumber ||
                                  designer.gst === COMPANY_GST_INFO.gstNumber
                                  ? "Company GST"
                                  : designer.gst_number === "COMPANY_GST_REQUESTED"
                                    ? "GST Req"
                                    : maskGstNumber(designer.gst_number || designer.gst)
                                : "No GST"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="table-commercials-cell">
                            {designer.online_membership_plan ? (
                              <span className="table-plan-badge">
                                ★ {designer.online_membership_plan}
                              </span>
                            ) : (
                              <span className="table-take-rate">
                                Take rate: {designer.take_rate != null ? `${Number(designer.take_rate)}%` : "0%"}
                              </span>
                            )}
                            <span className="table-health-mini">
                              {Number(designer.credit_points || 0).toLocaleString("en-IN")} Pts
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--ZENVE-ink)" }}>
                            {designer.sales_owner || "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "11.5px", color: "var(--ZENVE-muted)", whiteSpace: "nowrap" }}>
                            {designer.next_followup_date || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`tone-badge ${designer.fulfillment ? "info" : "neutral"}`}>
                            {designer.fulfillment || "BOTH"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "11.5px", color: "var(--ZENVE-muted)", whiteSpace: "nowrap" }}>
                            {designer.contract_end_date || "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="table-actions-cell">
                            <button
                              type="button"
                              className="btn-table-edit"
                              onClick={() => handleOpenEditModal(designer)}
                              title="Edit designer details"
                            >
                              ✎ Edit
                            </button>
                            <button
                              type="button"
                              className={`btn-table-freeze ${isFrozen ? "frozen" : ""}`}
                              disabled={Boolean(freezingDesignerId)}
                              onClick={() => handleFreezeDesigner(designer)}
                              title={isFrozen ? "Unfreeze designer" : "Freeze designer"}
                            >
                              {isFreezing
                                ? (isFrozen ? "Unfreezing…" : "Freezing…")
                                : (isFrozen ? "Unfreeze" : "Freeze")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="designer-cards-list">
              {filteredDesigners.map((designer) => renderDesignerCard(designer, false))}
            </div>
          )}
        </section>

        {/* 3. ADD A DESIGNER LEAD (15 Fields) - INLINE DOWN DIV STRUCTURE */}
        {showAddLeadSection && (
          <section
            ref={addLeadSectionRef}
            className="crm-panel add-designer-lead-panel"
            id="add-designer-lead-section"
            style={{ marginTop: "24px" }}
          >
            <div className="crm-panel-header">
              <div className="crm-panel-title-block">
                <h2 className="crm-panel-title">Add a designer lead</h2>
                <p className="crm-panel-desc">
                  Creates the designer record used by every other layer.
                </p>
              </div>
              <button
                type="button"
                className="crm-search-clear"
                onClick={() => setShowAddLeadSection(false)}
                title="Hide form"
                style={{
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "var(--ZENVE-muted)",
                  background: "none",
                  border: "none",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="lead-form-grid">
              {/* Row 1 */}
              <div className="lead-form-field">
                <label className="label-caps">DESIGNER NAME</label>
                <input
                  type="text"
                  className="lead-input"
                  placeholder="e.g. Rohini Sharma"
                  value={newLead.name}
                  onChange={(e) =>
                    setNewLead({ ...newLead, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="lead-form-field">
                <label className="label-caps">BRAND</label>
                <input
                  type="text"
                  className="lead-input"
                  placeholder="e.g. Velvet Canine"
                  value={newLead.brand}
                  onChange={(e) =>
                    setNewLead({ ...newLead, brand: e.target.value })
                  }
                  required
                />
              </div>

              <div className="lead-form-field">
                <label className="label-caps">EMAIL ADDRESS</label>
                <input
                  type="email"
                  className="lead-input"
                  placeholder="e.g. designer@brand.com"
                  value={newLead.email}
                  onChange={(e) =>
                    setNewLead({ ...newLead, email: e.target.value })
                  }
                />
              </div>

              {/* Row 2 */}
              <div className="lead-form-field">
                <label className="label-caps">MOBILE NUMBER</label>
                <input
                  type="tel"
                  className="lead-input"
                  placeholder="e.g. 9876543210"
                  value={newLead.phone}
                  onChange={(e) =>
                    setNewLead({ ...newLead, phone: e.target.value })
                  }
                />
              </div>

              <div className="lead-form-field">
                <label className="label-caps">LEAD SOURCE</label>
                <select
                  className="lead-select"
                  value={newLead.source}
                  onChange={(e) =>
                    setNewLead({ ...newLead, source: e.target.value })
                  }
                >
                  {allLeadSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lead-form-field">
                <label className="label-caps">SALES OWNER</label>
                <select
                  className="lead-select"
                  value={newLead.owner}
                  onChange={(e) =>
                    setNewLead({ ...newLead, owner: e.target.value })
                  }
                >
                  {allSalesOwners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3 */}
              <div className="lead-form-field">
                <label className="label-caps">NEXT FOLLOW-UP DATE</label>
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
                <label className="label-caps">CITY</label>
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
                <label className="label-caps">PRIMARY CATEGORY</label>
                <input
                  type="text"
                  className="lead-input"
                  value={newLead.category}
                  onChange={(e) =>
                    setNewLead({ ...newLead, category: e.target.value })
                  }
                />
              </div>

              {/* Row 4 */}
              <div className="lead-form-field">
                <label className="label-caps">TIER</label>
                <select
                  className="lead-select"
                  value={newLead.tier}
                  onChange={(e) =>
                    setNewLead({ ...newLead, tier: e.target.value })
                  }
                >
                  <option value="Emerging">Emerging</option>
                  <option value="Core">Core</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>

              <div className="lead-form-field">
                <label className="label-caps">GIVEN CREDITS (POINTS)</label>
                <select
                  className="lead-select"
                  value={newLead.fashionCreditPlan}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    const plan = FASHION_CREDIT_PLANS.find(
                      (p) => p.id === selectedVal
                    );
                    setNewLead({
                      ...newLead,
                      fashionCreditPlan: selectedVal,
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

              <div className="lead-form-field">
                <label className="label-caps">TAKE RATE %</label>
                <input
                  type="number"
                  className="lead-input"
                  min="0"
                  max="100"
                  value={newLead.takeRate}
                  onChange={(e) =>
                    setNewLead({ ...newLead, takeRate: e.target.value })
                  }
                />
              </div>

              {/* Row 5 */}
              <div className="lead-form-field">
                <label className="label-caps">ACQUISITION COST (CAC)</label>
                <input
                  type="number"
                  className="lead-input"
                  value={newLead.cac}
                  onChange={(e) =>
                    setNewLead({ ...newLead, cac: e.target.value })
                  }
                />
              </div>

              <div className="lead-form-field">
                <label className="label-caps">RENEWAL LIKELIHOOD %</label>
                <input
                  type="number"
                  className="lead-input"
                  min="0"
                  max="100"
                  value={newLead.renewalProbability}
                  onChange={(e) =>
                    setNewLead({
                      ...newLead,
                      renewalProbability: e.target.value,
                    })
                  }
                />
              </div>

              <div className="lead-form-field">
                <label className="label-caps">CONTRACT END DATE</label>
                <input
                  type="date"
                  className="lead-input"
                  value={newLead.contractEnds}
                  onChange={(e) =>
                    setNewLead({ ...newLead, contractEnds: e.target.value })
                  }
                />
              </div>

              {/* Row 6 */}
              <div className="lead-form-field lead-form-field-gst">
                <div className="lead-field-header-row">
                  <label className="label-caps">
                    GST NUMBER <span className="optional-tag">(Optional)</span>
                  </label>
                  {useCompanyGst && (
                    <span className="lead-company-gst-badge">
                      <span className="badge-dot"></span>{" "}
                      {newLead.gst === "COMPANY_GST_REQUESTED"
                        ? "Creation Requested (Company Side)"
                        : "Company GST Applied"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className={`lead-input ${useCompanyGst ? "input-company-gst" : ""}`}
                  placeholder="27AAAAA0000A1Z5 (or use company GST)"
                  value={
                    newLead.gst === COMPANY_GST_INFO.gstNumber
                      ? maskGstNumber(newLead.gst)
                      : newLead.gst === "COMPANY_GST_REQUESTED"
                        ? "Creation Requested (Company creating GST)"
                        : newLead.gst
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewLead({ ...newLead, gst: val });
                    if (val.trim().toUpperCase() === COMPANY_GST_INFO.gstNumber) {
                      setUseCompanyGst(true);
                    } else if (val !== "COMPANY_GST_REQUESTED") {
                      setUseCompanyGst(false);
                    }
                  }}
                />
                <div className="lead-gst-checkbox-row">
                  <label className="lead-gst-checkbox-label">
                    <input
                      type="checkbox"
                      checked={useCompanyGst}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGstModalTarget("newLead");
                          setShowGstModal(true);
                        } else {
                          setUseCompanyGst(false);
                          if (
                            newLead.gst.trim().toUpperCase() === COMPANY_GST_INFO.gstNumber ||
                            newLead.gst === "COMPANY_GST_REQUESTED"
                          ) {
                            setNewLead({ ...newLead, gst: "" });
                          }
                        }
                      }}
                    />
                    <span>Designer doesn't have a GST number? (Use / Request Company GST)</span>
                  </label>
                  {useCompanyGst && (
                    <button
                      type="button"
                      className="lead-gst-change-btn"
                      onClick={() => {
                        setGstModalTarget("newLead");
                        setShowGstModal(true);
                      }}
                      style={{
                        marginLeft: "10px",
                        fontSize: "11px",
                        color: "var(--ZENVE-gold)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Change / Request GST
                    </button>
                  )}
                </div>
              </div>

              {/* Row 7: Submit button */}
              <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                <button type="submit" className="btn-create-lead">
                  Create lead
                </button>
              </div>
            </form>
          </section>
        )}
      </main >

      {/* COMPANY GST INFORMATION & CONFIRMATION MODAL */}
      {
        showGstModal && (
          <div className="gst-modal-overlay" onClick={handleCloseGstModal}>
            <div className="gst-modal" onClick={(e) => e.stopPropagation()}>
              <div className="gst-modal-header">
                <div className="gst-modal-icon-badge">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="gst-modal-title-wrap">
                  <span className="gst-modal-badge">PLATFORM TAX COMPLIANCE</span>
                  <h3 className="gst-modal-title">Company GST Coverage & Creation</h3>
                  <p className="gst-modal-desc">
                    Assign our master company GST number or request our company to create a new dedicated GST number for this designer.
                  </p>
                </div>
                <button
                  type="button"
                  className="gst-modal-close-btn"
                  onClick={handleCloseGstModal}
                  aria-label="Close dialog"
                >
                  &times;
                </button>
              </div>

              <div className="gst-modal-body">
                {/* Option 1: Master Company GSTIN (Masked for Security) */}
                <div className="gst-company-card">
                  <div className="gst-company-row">
                    <span className="gst-field-label">Master Legal Entity</span>
                    <span className="gst-field-val strong">{COMPANY_GST_INFO.name}</span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Company GSTIN</span>
                    <span className="gst-field-val gst-code-val">
                      <code>{maskGstNumber(COMPANY_GST_INFO.gstNumber)}</code>
                      <span className="gst-active-pill">ACTIVE · VERIFIED</span>
                    </span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Security Mask</span>
                    <span className="gst-field-val" style={{ color: "#786d5e", fontSize: "12px" }}>
                      Protected for security (Only last 4 digits shown)
                    </span>
                  </div>
                  <div className="gst-company-row">
                    <span className="gst-field-label">Jurisdiction</span>
                    <span className="gst-field-val">{COMPANY_GST_INFO.state}</span>
                  </div>
                </div>

                {/* Option 2: Request Company-Side Creation for this Designer */}
                <div className="gst-request-box">
                  <div className="gst-request-box-header">
                    <span className="gst-request-badge">CREATE NEW GST</span>
                    <h4 className="gst-request-title">Request Company to Create New GST for Designer</h4>
                  </div>
                  <p className="gst-request-desc">
                    Does this designer need their own dedicated company-developed GST number? Submit a request and our company tax team will register a new compliant GSTIN for this designer.
                  </p>
                  <button
                    type="button"
                    className="btn-request-company-gst"
                    onClick={handleRequestCompanyGstCreation}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Request Company to Create New GST for This Designer
                  </button>
                </div>

                {/* Confirmation Question */}
                <div className="gst-confirm-box">
                  <p className="gst-confirm-question">
                    Or apply our existing company master GST (<strong>{maskGstNumber(COMPANY_GST_INFO.gstNumber)}</strong>) for{" "}
                    <strong>
                      {gstModalTarget === "newLead"
                        ? newLead.brand || newLead.name || "this new designer lead"
                        : gstModalTarget?.brand_name ||
                        gstModalTarget?.designer_name ||
                        "this designer"}
                    </strong> immediately?
                  </p>
                </div>
              </div>

              {/* Modal Actions: Apply Existing / Request New / Cancel */}
              <div className="gst-modal-actions">
                <button
                  type="button"
                  className="btn-modal-yes"
                  onClick={handleConfirmCompanyGst}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Yes, Use Company GST ({COMPANY_GST_INFO.gstNumber.slice(-4)})
                </button>
                <button
                  type="button"
                  className="btn-modal-request"
                  onClick={handleRequestCompanyGstCreation}
                >
                  + Request New Company GST
                </button>
                <button
                  type="button"
                  className="btn-modal-no"
                  onClick={handleCloseGstModal}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* EDIT DESIGNER POPUP MODAL (DIRECT POPUP TO SELECTED DESIGNER CARD) */}
      {showEditModal && editingDesigner && (() => {
        const activeModalDesigner =
          designers.find((d) => d.id === editingDesigner.id) || editingDesigner;
        return (
          <div
            className="crm-modal-overlay"
            onClick={() => {
              setShowEditModal(false);
              setEditingDesigner(null);
            }}
          >
            <div
              className="crm-modal-card crm-modal-card-designer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="crm-modal-header">
                <div className="crm-modal-title-wrap">
                  <span className="crm-modal-kicker">SELECTED DESIGNER CARD</span>
                  <h3 className="crm-modal-title">
                    {activeModalDesigner.brand_name || activeModalDesigner.designer_name || "Designer Profile"}
                  </h3>
                  <p className="crm-modal-desc">
                    Code: <code>{activeModalDesigner.designer_code || `DSG-${activeModalDesigner.id}`}</code> · Stage: <strong>{activeModalDesigner.stage || "LEAD"}</strong> · Live interactive designer card popup
                  </p>
                </div>
                <button
                  type="button"
                  className="crm-modal-close"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingDesigner(null);
                  }}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="crm-modal-designer-body">
                {renderDesignerCard(activeModalDesigner, true)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* FRESH DESIGNER MODAL */}
      {showAddModal && (
        <div className="crm-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="crm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="crm-modal-header">
              <div className="crm-modal-title-wrap">
                <span className="crm-modal-kicker">SUPPLY ONBOARDING</span>
                <h3 className="crm-modal-title">Add Designers</h3>
                <p className="crm-modal-desc">
                  Register a designer partner with complete brand, contact, and contract terms.
                </p>
              </div>
              <button
                type="button"
                className="crm-modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleModalCreateLead} className="crm-modal-form">
              <div className="crm-modal-grid">
                <div className="crm-form-group">
                  <label className="crm-form-label">Designer Name *</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="e.g. Rohini Sharma"
                    value={modalNewLead.name}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, name: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Brand Name *</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="e.g. Velvet Canine"
                    value={modalNewLead.brand}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, brand: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Email Address *</label>
                  <input
                    type="email"
                    className="crm-form-input"
                    placeholder="designer@brand.com"
                    value={modalNewLead.email}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, email: e.target.value })}
                    required
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="crm-form-input"
                    placeholder="9876543210"
                    value={modalNewLead.phone}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, phone: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">City</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="e.g. Mumbai"
                    value={modalNewLead.city}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, city: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">State / Region</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="e.g. Maharashtra, Karnataka"
                    value={modalNewLead.state}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, state: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Primary Category</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="e.g. Ethnic & Pet Couture"
                    value={modalNewLead.category}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, category: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Tier</label>
                  <select
                    className="crm-form-select"
                    value={modalNewLead.tier}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, tier: e.target.value })}
                  >
                    <option value="Emerging">Emerging</option>
                    <option value="Core">Core</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Lead Source</label>
                  <select
                    className="crm-form-select"
                    value={modalNewLead.source}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, source: e.target.value })}
                  >
                    {allLeadSources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Credit Plan</label>
                  <select
                    className="crm-form-select"
                    value={modalNewLead.fashionCreditPlan}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const plan = FASHION_CREDIT_PLANS.find((p) => p.id === selectedVal);
                      setModalNewLead({
                        ...modalNewLead,
                        fashionCreditPlan: selectedVal,
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

                <div className="crm-form-group">
                  <label className="crm-form-label">Take Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="crm-form-input"
                    placeholder="15"
                    value={modalNewLead.takeRate}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, takeRate: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Fulfillment Model</label>
                  <select
                    className="crm-form-select"
                    value={modalNewLead.fulfillment}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, fulfillment: e.target.value })}
                  >
                    <option value="BOTH">Both (Hub & Drop)</option>
                    <option value="HUBSHIP">Hubship</option>
                    <option value="DROPSHIP">Dropship</option>
                  </select>
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">GST Number</label>
                  <input
                    type="text"
                    className="crm-form-input"
                    placeholder="27AAAAA0000A1Z5"
                    value={modalNewLead.gst}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, gst: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Contract End Date</label>
                  <input
                    type="date"
                    className="crm-form-input"
                    value={modalNewLead.contractEnds}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, contractEnds: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Next Follow-up Date</label>
                  <input
                    type="date"
                    className="crm-form-input"
                    value={modalNewLead.nextFollowUp}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, nextFollowUp: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Renewal Likelihood %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="crm-form-input"
                    placeholder="50"
                    value={modalNewLead.renewalProbability}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, renewalProbability: e.target.value })}
                  />
                </div>

                <div className="crm-form-group">
                  <label className="crm-form-label">Sales Owner</label>
                  <select
                    className="crm-form-select"
                    value={modalNewLead.owner}
                    onChange={(e) => setModalNewLead({ ...modalNewLead, owner: e.target.value })}
                  >
                    {allSalesOwners.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="crm-modal-actions">
                <button type="submit" className="btn-modal-save">
                  + Add Designer
                </button>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
}