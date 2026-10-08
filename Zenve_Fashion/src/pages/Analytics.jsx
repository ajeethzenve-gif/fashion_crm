import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import "../styles/Analytics.css";
import bannerImg from "../assest/bi-dashboard-banner.jpg";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getOrders,
  getProducts,
  getDesigners,
  getReturns,
  getSettlements,
  getAccountingStats,
} from "../services/api";

const STATUS_COLORS = {
  Delivered: "#10B981",
  Shipped: "#3B82F6",
  Processing: "#F59E0B",
  Pending: "#F97316",
  Cancelled: "#EF4444",
  Returned: "#8B5CF6",
};

const CHANNEL_COLORS = {
  Website: "#965B1C",
  "Mobile App": "#D97706",
  Marketplace: "#F59E0B",
  "Offline Store": "#38BDF8",
  "Social Media": "#C084FC",
};

const DESIGNER_PALETTE = [
  { bg: "#E0E7FF", text: "#4338CA" },
  { bg: "#FCE7F3", text: "#BE185D" },
  { bg: "#FEF3C7", text: "#B45309" },
  { bg: "#DCFCE7", text: "#15803D" },
  { bg: "#EDE9FE", text: "#6D28D9" },
  { bg: "#FFEDD5", text: "#C2410C" },
];

function getDesignerAvatar(name) {
  if (!name) return "Z";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getCategoryIcon(catName) {
  const name = (catName || "").toLowerCase();
  if (name.includes("lehenga")) return "👗";
  if (name.includes("saree")) return "🥻";
  if (name.includes("gown") || name.includes("dress")) return "✨";
  if (name.includes("kurti") || name.includes("suit")) return "👘";
  if (name.includes("men") || name.includes("sherwani") || name.includes("kurta") || name.includes("shirt") || name.includes("pant")) return "🧥";
  if (name.includes("foot") || name.includes("jutti") || name.includes("shoe")) return "👠";
  return "🏷️";
}

function createSparkline(dataPoints, isUp = true) {
  if (!dataPoints || dataPoints.length < 2) {
    return isUp ? "M1 14 L10 11 L19 13 L28 7 L37 3" : "M1 4 L10 7 L19 9 L28 12 L37 15";
  }
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;
  const width = 36;
  const height = 14;
  const step = width / (dataPoints.length - 1);

  return dataPoints
    .map((val, idx) => {
      const x = 1 + idx * step;
      const y = height + 2 - ((val - min) / range) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States - Default to "All Time" so all database records appear immediately
  const [dateRange, setDateRange] = useState("All Time");
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [channelTrendPeriod, setChannelTrendPeriod] = useState("Monthly");
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  // Modals
  const [isDesignersModalOpen, setIsDesignersModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Live Backend Database States
  const [liveOrders, setLiveOrders] = useState([]);
  const [liveProducts, setLiveProducts] = useState([]);
  const [liveDesigners, setLiveDesigners] = useState([]);
  const [liveReturns, setLiveReturns] = useState([]);
  const [liveSettlements, setLiveSettlements] = useState([]);
  const [accountingStats, setAccountingStats] = useState(null);

  /* ---------------------------------------------------------
     FETCH LIVE DATA FROM DJANGO BACKEND ENDPOINTS
  --------------------------------------------------------- */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, prodsRes, desRes, retRes, stlRes, statsRes] =
        await Promise.all([
          getOrders().catch((err) => {
            console.error("Orders fetch failed:", err);
            return [];
          }),
          getProducts().catch((err) => {
            console.error("Products fetch failed:", err);
            return [];
          }),
          getDesigners().catch((err) => {
            console.error("Designers fetch failed:", err);
            return [];
          }),
          getReturns().catch((err) => {
            console.error("Returns fetch failed:", err);
            return [];
          }),
          getSettlements().catch((err) => {
            console.error("Settlements fetch failed:", err);
            return [];
          }),
          getAccountingStats().catch((err) => {
            console.error("Accounting stats fetch failed:", err);
            return null;
          }),
        ]);

      setLiveOrders(Array.isArray(ordersRes) ? ordersRes : ordersRes?.results || []);
      setLiveProducts(Array.isArray(prodsRes) ? prodsRes : prodsRes?.results || []);
      setLiveDesigners(Array.isArray(desRes) ? desRes : desRes?.results || []);
      setLiveReturns(Array.isArray(retRes) ? retRes : retRes?.results || []);
      setLiveSettlements(Array.isArray(stlRes) ? stlRes : stlRes?.results || []);
      setAccountingStats(statsRes);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Failed to load analytics from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Dropdown dismissal on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest(".bi-date-picker-wrap")) {
        setIsDateOpen(false);
      }
      if (!e.target.closest(".bi-period-picker-wrap")) {
        setIsPeriodOpen(false);
      }
    };
    document.addEventListener("click", handleOutside);
    return () => document.removeEventListener("click", handleOutside);
  }, []);

  /* ---------------------------------------------------------
     DATE FILTERING LOGIC ON LIVE ORDERS
  --------------------------------------------------------- */
  const filteredOrders = useMemo(() => {
    if (!liveOrders || liveOrders.length === 0) return [];
    if (dateRange === "All Time") {
      return liveOrders;
    }
    const now = Date.now();
    return liveOrders.filter((o) => {
      if (!o.created_at) return true;
      const orderDate = new Date(o.created_at).getTime();
      if (dateRange === "Today") {
        return now - orderDate <= 86400000;
      }
      if (dateRange === "Last 7 Days") {
        return now - orderDate <= 7 * 86400000;
      }
      if (dateRange === "October 2026") {
        const d = new Date(o.created_at);
        return d.getMonth() === 9 && d.getFullYear() === 2026;
      }
      if (dateRange === "September 2026") {
        const d = new Date(o.created_at);
        return d.getMonth() === 8 && d.getFullYear() === 2026;
      }
      if (dateRange === "Last 30 Days") {
        return now - orderDate <= 30 * 86400000;
      }
      if (dateRange === "This Quarter") {
        return now - orderDate <= 90 * 86400000;
      }
      return true;
    });
  }, [liveOrders, dateRange]);

  /* ---------------------------------------------------------
     1. TOP 6 FINANCIAL KPI CARDS COMPUTED FROM LIVE DATABASE
  --------------------------------------------------------- */
  const kpis = useMemo(() => {
    const totalOrderSales = filteredOrders.reduce((sum, o) => {
      const amt = Number(o.total || o.order_total || o.amount || 0);
      return sum + amt;
    }, 0);

    const totalOrdersCount = filteredOrders.length;
    const totalDesignersCount = liveDesigners.length;
    const totalProductsCount = liveProducts.length;
    const totalReturnsCount = liveReturns.length;

    const retRate =
      totalOrdersCount > 0
        ? ((totalReturnsCount / totalOrdersCount) * 100).toFixed(1)
        : "0.0";

    const stlPayouts =
      accountingStats?.total_disbursed ??
      accountingStats?.total_disbursed_inr ??
      liveSettlements.reduce((sum, s) => {
        return sum + Number(s.payout_amount || s.net_payable || s.amount || 0);
      }, 0);

    // Dynamic Sparkline data points from chronological orders
    const sortedOrders = [...filteredOrders].sort(
      (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );
    const salesSparklinePoints = sortedOrders.map((o) =>
      Number(o.total || o.order_total || o.amount || 0)
    );

    const sortedSettlements = [...liveSettlements].sort(
      (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );
    const settlementsSparklinePoints = sortedSettlements.map((s) =>
      Number(s.payout_amount || s.gmv || 0)
    );

    const activeDesignersCount = liveDesigners.filter((d) => d.is_active || Number(d.lifetime_gmv) > 0).length;

    const totalInventoryUnits = liveProducts.reduce((sum, p) => {
      return sum + Number(p.available_quantity || p.inventory_quantity || p.total_size_quantity || 0);
    }, 0);

    return {
      sales: `₹${Number(totalOrderSales).toLocaleString("en-IN")}`,
      salesTrend: totalOrderSales > 0 ? "↗ Live DB" : "0%",
      salesSparkline: createSparkline(salesSparklinePoints, true),

      orders: Number(totalOrdersCount).toLocaleString("en-IN"),
      ordersTrend: `${totalOrdersCount} Total`,
      ordersSparkline: createSparkline(sortedOrders.map((_, i) => i + 1), true),

      designers: Number(totalDesignersCount).toLocaleString("en-IN"),
      designersTrend: `${activeDesignersCount} Active`,
      designersSparkline: createSparkline(liveDesigners.map((_, i) => i + 1), true),

      products: Number(totalProductsCount).toLocaleString("en-IN"),
      productsTrend: `${totalInventoryUnits} Units`,
      productsSparkline: createSparkline(liveProducts.map((p) => Number(p.available_quantity || p.inventory_quantity || 1)), true),

      returnRate: `${retRate}%`,
      returnRateTrend: `${totalReturnsCount} Request`,
      returnRateSparkline: createSparkline(liveReturns.map((_, i) => i + 1), false),

      settlements: `₹${Math.round(Number(stlPayouts)).toLocaleString("en-IN")}`,
      settlementsTrend: `${liveSettlements.length} Ledger`,
      settlementsSparkline: createSparkline(settlementsSparklinePoints, true),
    };
  }, [filteredOrders, liveDesigners, liveProducts, liveReturns, liveSettlements, accountingStats]);

  /* ---------------------------------------------------------
     2. SALES OVERVIEW: DUAL BAR + LINE CHART (FROM LIVE ORDERS)
  --------------------------------------------------------- */
  const salesOverviewData = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return [];
    }

    // Extract real date points from database orders
    const dateMap = {};
    filteredOrders.forEach((o) => {
      const d = o.created_at ? new Date(o.created_at) : new Date();
      const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const amt = Number(o.total || o.order_total || o.amount || 0);

      if (!dateMap[label]) {
        dateMap[label] = { day: label, sales: 0, orders: 0, rawTimestamp: d.getTime() };
      }
      dateMap[label].sales += amt;
      dateMap[label].orders += 1;
    });

    const sorted = Object.values(dateMap).sort((a, b) => a.rawTimestamp - b.rawTimestamp);
    return sorted.map(({ day, sales, orders }) => ({ day, sales, orders }));
  }, [filteredOrders]);

  /* ---------------------------------------------------------
     3. ORDERS BY STATUS DONUT (FROM LIVE ORDERS IN DATABASE)
  --------------------------------------------------------- */
  const ordersByStatus = useMemo(() => {
    const counts = {
      Delivered: 0,
      Shipped: 0,
      Processing: 0,
      Pending: 0,
      Cancelled: 0,
      Returned: 0,
    };

    filteredOrders.forEach((o) => {
      const s = String(o.order_status || o.status || "").toLowerCase();
      if (s.includes("deliv")) counts.Delivered++;
      else if (s.includes("ship") || s.includes("dispatch") || s.includes("out")) counts.Shipped++;
      else if (s.includes("proc") || s.includes("confirm") || s.includes("place")) counts.Processing++;
      else if (s.includes("cancel")) counts.Cancelled++;
      else if (s.includes("return")) counts.Returned++;
      else counts.Pending++;
    });

    if (liveReturns.length > counts.Returned) {
      counts.Returned = liveReturns.length;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return [
      {
        name: "Delivered",
        count: counts.Delivered,
        pct: Number(((counts.Delivered / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Delivered,
      },
      {
        name: "Shipped",
        count: counts.Shipped,
        pct: Number(((counts.Shipped / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Shipped,
      },
      {
        name: "Processing",
        count: counts.Processing,
        pct: Number(((counts.Processing / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Processing,
      },
      {
        name: "Pending",
        count: counts.Pending,
        pct: Number(((counts.Pending / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Pending,
      },
      {
        name: "Cancelled",
        count: counts.Cancelled,
        pct: Number(((counts.Cancelled / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Cancelled,
      },
      {
        name: "Returned",
        count: counts.Returned,
        pct: Number(((counts.Returned / total) * 100).toFixed(1)),
        color: STATUS_COLORS.Returned,
      },
    ].filter((item) => item.count > 0 || item.name === "Delivered" || item.name === "Processing");
  }, [filteredOrders, liveReturns]);

  /* ---------------------------------------------------------
     4. TOP DESIGNERS BY SALES (FROM LIVE DATABASE DESIGNERS & ORDERS)
  --------------------------------------------------------- */
  const topDesignersList = useMemo(() => {
    if (!liveDesigners || liveDesigners.length === 0) return [];

    const designerMap = {};
    liveDesigners.forEach((d) => {
      const displayName = d.brand_name || d.designer_name || `Designer #${d.id}`;
      designerMap[d.id] = {
        id: d.id,
        name: displayName,
        brand_name: d.brand_name || displayName,
        designer_name: d.designer_name,
        code: d.designer_code,
        sales: 0,
        orders: 0,
      };
    });

    // Tally actual sales and orders from live order items
    filteredOrders.forEach((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item) => {
        const brand = (item.brand_name || item.brand || item.designer || "").toLowerCase();
        const matched = Object.values(designerMap).find(
          (dm) =>
            (dm.brand_name && dm.brand_name.toLowerCase() === brand) ||
            (dm.designer_name && dm.designer_name.toLowerCase() === brand)
        );
        if (matched) {
          const itemAmt = Number(item.total || item.total_price || item.price || 0) * (Number(item.quantity) || 1);
          matched.sales += itemAmt;
          matched.orders += 1;
        }
      });
    });

    // Check lifetime_gmv from database for designers where items weren't directly broken down
    Object.values(designerMap).forEach((dm) => {
      const rawDesigner = liveDesigners.find((d) => d.id === dm.id);
      if (dm.sales === 0 && rawDesigner && Number(rawDesigner.lifetime_gmv) > 0) {
        dm.sales = Number(rawDesigner.lifetime_gmv);
      }
    });

    const sorted = Object.values(designerMap).sort((a, b) => b.sales - a.sales);
    const totalGmv = sorted.reduce((sum, d) => sum + d.sales, 0) || 1;
    const maxSales = sorted[0]?.sales || 1;

    return sorted.map((d, idx) => ({
      rank: idx + 1,
      id: d.id,
      name: d.name,
      code: d.code,
      avatarBg: DESIGNER_PALETTE[idx % DESIGNER_PALETTE.length].bg,
      avatarColor: DESIGNER_PALETTE[idx % DESIGNER_PALETTE.length].text,
      sales: d.sales,
      orders: d.orders,
      pct: Number(((d.sales / totalGmv) * 100).toFixed(1)),
      barPct: Math.max(8, Math.round((d.sales / maxSales) * 100)),
    }));
  }, [liveDesigners, filteredOrders]);

  /* ---------------------------------------------------------
     5. TOP PRODUCT CATEGORIES (FROM LIVE DATABASE PRODUCTS)
  --------------------------------------------------------- */
  const topCategoriesList = useMemo(() => {
    if (!liveProducts || liveProducts.length === 0) return [];

    const catBuckets = {
      "Ready-to-Wear (Shirts & Tops)": {
        icon: "👗",
        units: 0,
        products: 0,
      },
      "Bottomwear (Pants & Demin)": {
        icon: "👖",
        units: 0,
        products: 0,
      },
      "Knitwear & Sweaters": {
        icon: "🧥",
        units: 0,
        products: 0,
      },
      "Festive & Atelier (Diwali Luxe)": {
        icon: "✨",
        units: 0,
        products: 0,
      },
      "Contemporary & Streetwear": {
        icon: "👘",
        units: 0,
        products: 0,
      },
      "Pet Haute Couture": {
        icon: "🐾",
        units: 0,
        products: 0,
      },
    };

    liveProducts.forEach((p) => {
      const name = (p.product_name || p.name || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      const qty = Number(p.inventory_quantity || p.available_quantity || p.total_size_quantity || 10);

      if (cat === "pet" || name.includes("pet")) {
        catBuckets["Pet Haute Couture"].units += qty;
        catBuckets["Pet Haute Couture"].products += 1;
      } else if (name.includes("sweater") || name.includes("sweat")) {
        catBuckets["Knitwear & Sweaters"].units += qty;
        catBuckets["Knitwear & Sweaters"].products += 1;
      } else if (name.includes("pant") || name.includes("demin") || name.includes("jean")) {
        catBuckets["Bottomwear (Pants & Demin)"].units += qty;
        catBuckets["Bottomwear (Pants & Demin)"].products += 1;
      } else if (name.includes("shirt") || name.includes("t-shirt") || name.includes("top")) {
        catBuckets["Ready-to-Wear (Shirts & Tops)"].units += qty;
        catBuckets["Ready-to-Wear (Shirts & Tops)"].products += 1;
      } else if (cat === "wear" || name.includes("trouser") || name.includes("korean")) {
        catBuckets["Contemporary & Streetwear"].units += qty;
        catBuckets["Contemporary & Streetwear"].products += 1;
      } else {
        catBuckets["Festive & Atelier (Diwali Luxe)"].units += qty;
        catBuckets["Festive & Atelier (Diwali Luxe)"].products += 1;
      }
    });

    const list = Object.entries(catBuckets)
      .map(([name, data]) => ({
        name,
        icon: data.icon,
        units: data.units,
        products: data.products,
      }))
      .filter((c) => c.units > 0);

    const totalUnits = list.reduce((sum, c) => sum + c.units, 0) || 1;
    const maxUnits = Math.max(...list.map((c) => c.units)) || 1;

    return list
      .sort((a, b) => b.units - a.units)
      .map((cat) => ({
        ...cat,
        pct: Math.round((cat.units / totalUnits) * 100),
        barPct: Math.max(12, Math.round((cat.units / maxUnits) * 100)),
      }));
  }, [liveProducts]);

  /* ---------------------------------------------------------
     6. REVENUE BY CHANNEL (FROM LIVE DATABASE PAYMENT METHODS)
  --------------------------------------------------------- */
  const revenueByChannel = useMemo(() => {
    const channelMap = {
      "Cash on Delivery (COD)": { sales: 0, orders: 0, color: "#38BDF8" },
      "UPI & Mobile Pay": { sales: 0, orders: 0, color: "#D97706" },
      "Razorpay Online": { sales: 0, orders: 0, color: "#965B1C" },
      "Credit / Debit Cards": { sales: 0, orders: 0, color: "#10B981" },
      "Net Banking & Escrow": { sales: 0, orders: 0, color: "#8B5CF6" },
    };

    filteredOrders.forEach((o) => {
      const pm = String(o.payment_method || "").toLowerCase();
      const amt = Number(o.total || o.order_total || o.amount || 0);

      if (pm.includes("cod") || pm.includes("cash")) {
        channelMap["Cash on Delivery (COD)"].sales += amt;
        channelMap["Cash on Delivery (COD)"].orders += 1;
      } else if (pm.includes("upi") || pm.includes("wallet") || pm.includes("phonepe") || pm.includes("gpay")) {
        channelMap["UPI & Mobile Pay"].sales += amt;
        channelMap["UPI & Mobile Pay"].orders += 1;
      } else if (pm.includes("razorpay")) {
        channelMap["Razorpay Online"].sales += amt;
        channelMap["Razorpay Online"].orders += 1;
      } else if (pm.includes("card") || pm.includes("visa") || pm.includes("mastercard")) {
        channelMap["Credit / Debit Cards"].sales += amt;
        channelMap["Credit / Debit Cards"].orders += 1;
      } else {
        channelMap["Net Banking & Escrow"].sales += amt;
        channelMap["Net Banking & Escrow"].orders += 1;
      }
    });

    const total = Object.values(channelMap).reduce((sum, v) => sum + v.sales, 0) || 1;
    return Object.entries(channelMap).map(([name, data]) => ({
      name,
      sales: data.sales,
      orders: data.orders,
      pct: Number(((data.sales / total) * 100).toFixed(1)),
      color: data.color,
    }));
  }, [filteredOrders]);

  /* ---------------------------------------------------------
     7. SALES TREND BY CHANNEL (FROM LIVE MONTHLY DATABASE ORDERS)
  --------------------------------------------------------- */
  const salesTrendByChannel = useMemo(() => {
    const activeMonths = ["Aug", "Sep", "Oct"];
    const monthBuckets = activeMonths.map((m) => ({
      month: m,
      website: 0,
      app: 0,
      marketplace: 0,
      offline: 0,
      social: 0,
    }));

    filteredOrders.forEach((o) => {
      if (!o.created_at) return;
      const d = new Date(o.created_at);
      const mIdx = d.getMonth();
      let targetMonth = "Sep";
      if (mIdx === 7) targetMonth = "Aug";
      else if (mIdx === 8) targetMonth = "Sep";
      else if (mIdx === 9) targetMonth = "Oct";

      const bucket = monthBuckets.find((b) => b.month === targetMonth);
      if (bucket) {
        const pm = String(o.payment_method || "").toLowerCase();
        const amt = Number(o.total || o.order_total || o.amount || 0);

        if (pm.includes("razorpay")) {
          bucket.website += amt;
        } else if (pm.includes("upi") || pm.includes("wallet")) {
          bucket.app += amt;
        } else if (pm.includes("net") || pm.includes("bank")) {
          bucket.marketplace += amt;
        } else if (pm.includes("cod") || pm.includes("cash")) {
          bucket.offline += amt;
        } else {
          bucket.social += amt;
        }
      }
    });

    return monthBuckets;
  }, [filteredOrders]);

  return (
    <div className="bi-dashboard-page">
      {/* =====================================================
          1. LUXURY HERO BANNER WITH MODEL & COUTURE ATELIER
      ===================================================== */}
      <section className="bi-hero-banner">
        <div className="bi-hero-content">
          <h1 className="bi-hero-title">BI Dashboards</h1>
          <p className="bi-hero-subtitle">
            Real-time business intelligence directly connected to live database
          </p>

          {/* All Options Date Filter Pills */}
          <div className="bi-period-pills-row">
            <span className="bi-pills-label">Period:</span>
            {[
              "All Time",
              "September 2026",
              "October 2026",
              "Last 7 Days",
              "Last 30 Days",
              "This Quarter",
            ].map((range) => (
              <button
                key={range}
                type="button"
                className={`bi-period-pill ${dateRange === range ? "active" : ""}`}
                onClick={() => setDateRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Fashion Showroom Background Artwork */}
        <div className="bi-hero-art-wrap">
          <img
            src={bannerImg}
            alt="Haute Couture Fashion Showroom and Golden Atelier"
            className="bi-hero-art-img"
          />
          <div className="bi-hero-glow-overlay" />
        </div>
      </section>

      {/* =====================================================
          DATABASE LIVE STATUS BAR
      ===================================================== */}
      <div className="bi-db-status-bar">
        <div className="bi-db-status-left">
          <span className="bi-db-pulse" />
          <span className="bi-db-status-text">
            <strong>Live Database Connected:</strong> {liveOrders.length} Orders ({kpis.sales} GMV) · {liveDesigners.length} Designers · {liveProducts.length} Catalog Products · {liveSettlements.length} Settlements
          </span>
        </div>
        <button
          type="button"
          className="bi-db-refresh-btn"
          onClick={fetchData}
          title="Refresh metrics from backend"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            className={loading ? "spin" : ""}
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{loading ? "Syncing..." : "Sync DB"}</span>
        </button>
      </div>

      {/* =====================================================
          2. TOP 6 FINANCIAL KPI CARDS (LIVE DATABASE)
      ===================================================== */}
      <section className="bi-kpi-grid">
        {/* Card 1: Total Sales */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge gold-bg">
              <span className="bi-icon-sym">₹</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.salesSparkline}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Total Sales</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.sales}</strong>
              <span className="bi-trend-pill up">{kpis.salesTrend}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge amber-bg">
              <span className="bi-icon-sym">🛒</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.ordersSparkline}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Total Orders</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.orders}</strong>
              <span className="bi-trend-pill up">{kpis.ordersTrend}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Designers */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge orange-bg">
              <span className="bi-icon-sym">👤</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.designersSparkline}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Total Designers</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.designers}</strong>
              <span className="bi-trend-pill up">{kpis.designersTrend}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Products */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge peach-bg">
              <span className="bi-icon-sym">📦</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.productsSparkline}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Total Products</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.products}</strong>
              <span className="bi-trend-pill up">{kpis.productsTrend}</span>
            </div>
          </div>
        </div>

        {/* Card 5: Return Rate */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge cream-bg">
              <span className="bi-icon-sym">↩</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.returnRateSparkline}
                fill="none"
                stroke="#DC2626"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Return Rate</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.returnRate}</strong>
              <span className="bi-trend-pill down">{kpis.returnRateTrend}</span>
            </div>
          </div>
        </div>

        {/* Card 6: Settlement Payouts */}
        <div className="bi-kpi-card">
          <div className="bi-kpi-top-row">
            <div className="bi-kpi-icon-badge gold-bg">
              <span className="bi-icon-sym">🪙</span>
            </div>
            <svg className="bi-kpi-sparkline" width="38" height="18" viewBox="0 0 38 18">
              <path
                d={kpis.settlementsSparkline}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="bi-kpi-meta">
            <span className="bi-kpi-label">Settlement Payouts</span>
            <div className="bi-kpi-val-row">
              <strong className="bi-kpi-value">{kpis.settlements}</strong>
              <span className="bi-trend-pill up">{kpis.settlementsTrend}</span>
            </div>
          </div>
        </div>
      </section>



      {/* =====================================================
          3. MIDDLE 3 CARDS: SALES OVERVIEW | ORDERS BY STATUS | TOP DESIGNERS
      ===================================================== */}
      <section className="bi-cards-tri-grid">
        {/* Card 1: Sales Overview (Dual Bar + Line Chart) */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Sales Overview</h2>
            <div className="bi-chart-legend">
              <span className="bi-legend-item">
                <span className="bi-legend-dot gold-dot" />
                <span>Sales (₹)</span>
              </span>
              <span className="bi-legend-item">
                <span className="bi-legend-dot brown-dot" />
                <span>Orders</span>
              </span>
            </div>
          </div>

          <div className="bi-chart-container" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={salesOverviewData}
                margin={{ top: 18, right: 10, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3EBDD"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: "#EAE0D0" }}
                  tick={{ fontSize: 11, fill: "#785A3C" }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "#8A6D4B" }}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  hide
                />
                <Tooltip
                  cursor={{ fill: "rgba(197, 147, 60, 0.08)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const salesVal = payload.find((p) => p.dataKey === "sales")?.value || 0;
                      const ordersVal = payload.find((p) => p.dataKey === "orders")?.value || 0;
                      return (
                        <div className="bi-custom-tooltip">
                          <p className="bi-tooltip-title">{label} 2026</p>
                          <p className="bi-tooltip-line gold-text">
                            Sales: <strong>₹{Number(salesVal).toLocaleString("en-IN")}</strong>
                          </p>
                          <p className="bi-tooltip-line brown-text">
                            Orders: <strong>{ordersVal}</strong>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="sales"
                  fill="#D4A24E"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#78350F"
                  strokeWidth={2.4}
                  dot={{ r: 3.5, fill: "#78350F", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                  activeDot={{ r: 5, fill: "#78350F" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Orders by Status (Donut Chart + Breakdown Table) */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Orders by Status</h2>
          </div>

          <div className="bi-donut-with-list">
            {/* Donut Chart with Center Text */}
            <div className="bi-donut-wrap">
              <ResponsiveContainer width={170} height={170}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="bi-donut-center-label">
                <strong className="bi-donut-main-num">{kpis.orders}</strong>
                <span className="bi-donut-sub-text">Total Orders</span>
              </div>
            </div>

            {/* Status Breakdown Table List */}
            <div className="bi-breakdown-list">
              {ordersByStatus.map((item) => (
                <div key={item.name} className="bi-breakdown-row">
                  <div className="bi-breakdown-name-wrap">
                    <span
                      className="bi-status-dot"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="bi-breakdown-name">{item.name}</span>
                  </div>
                  <strong className="bi-breakdown-count">
                    {Number(item.count).toLocaleString("en-IN")}
                  </strong>
                  <span className="bi-breakdown-pct">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Top Designers by Sales */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Top Designers by Sales</h2>
            {topDesignersList.length > 5 && (
              <button
                type="button"
                className="bi-view-all-btn"
                onClick={() => setIsDesignersModalOpen(true)}
              >
                View All
              </button>
            )}
          </div>

          <div className="bi-designers-list">
            {topDesignersList.length === 0 ? (
              <div style={{ padding: "30px 10px", textAlign: "center", color: "#94A3B8", fontSize: "12.5px" }}>
                No designer records found in database.
              </div>
            ) : (
              topDesignersList.slice(0, 5).map((d) => (
                <div key={d.id || d.name} className="bi-designer-row">
                  <span className="bi-rank-num">{d.rank}</span>
                  <div
                    className="bi-designer-avatar"
                    style={{
                      backgroundColor: d.avatarBg,
                      color: d.avatarColor,
                    }}
                    title={d.name}
                  >
                    {getDesignerAvatar(d.name)}
                  </div>
                  <div className="bi-designer-info">
                    <div className="bi-designer-name-row">
                      <span className="bi-designer-name">{d.name}</span>
                    </div>
                    {/* Relative Gold Progress Track */}
                    <div className="bi-progress-track">
                      <div
                        className="bi-progress-bar"
                        style={{ width: `${d.barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="bi-designer-figures">
                    <strong className="bi-designer-rev">
                      ₹{Number(d.sales).toLocaleString("en-IN")}
                    </strong>
                    <span className="bi-designer-pct">{d.pct}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          4. BOTTOM 3 CARDS: CATEGORIES | CHANNELS | SALES TREND BY CHANNEL
      ===================================================== */}
      <section className="bi-cards-tri-grid">
        {/* Card 1: Top Product Categories */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Top Product Categories</h2>
            {topCategoriesList.length > 7 && (
              <button
                type="button"
                className="bi-view-all-btn"
                onClick={() => setIsCategoriesModalOpen(true)}
              >
                View All
              </button>
            )}
          </div>

          <div className="bi-categories-list">
            {topCategoriesList.length === 0 ? (
              <div style={{ padding: "30px 10px", textAlign: "center", color: "#94A3B8", fontSize: "12.5px" }}>
                No product inventory recorded in database.
              </div>
            ) : (
              topCategoriesList.slice(0, 7).map((cat) => (
                <div key={cat.name} className="bi-cat-row">
                  <div className="bi-cat-icon-frame">
                    <span className="bi-cat-emoji">{cat.icon}</span>
                  </div>
                  <span className="bi-cat-name">{cat.name}</span>
                  <div className="bi-cat-bar-wrap">
                    <div
                      className="bi-cat-bar-fill"
                      style={{ width: `${cat.barPct}%` }}
                    />
                  </div>
                  <span className="bi-cat-units">
                    {Number(cat.units).toLocaleString("en-IN")}
                  </span>
                  <span className="bi-cat-pct">{cat.pct}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Revenue by Channel (Donut Chart) */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Revenue by Channel</h2>
          </div>

          <div className="bi-donut-with-list">
            {/* Donut Chart with Center Text */}
            <div className="bi-donut-wrap">
              <ResponsiveContainer width={170} height={170}>
                <PieChart>
                  <Pie
                    data={revenueByChannel}
                    dataKey="sales"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {revenueByChannel.map((entry, index) => (
                      <Cell key={`channel-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="bi-donut-center-label">
                <strong className="bi-donut-main-num small-font">{kpis.sales}</strong>
                <span className="bi-donut-sub-text">Total Revenue</span>
              </div>
            </div>

            {/* Channel Breakdown List on Right */}
            <div className="bi-breakdown-list">
              {revenueByChannel.map((ch) => (
                <div key={ch.name} className="bi-breakdown-row channel-row">
                  <div className="bi-breakdown-name-wrap">
                    <span
                      className="bi-status-dot"
                      style={{ backgroundColor: ch.color }}
                    />
                    <span className="bi-breakdown-name">{ch.name}</span>
                  </div>
                  <strong className="bi-breakdown-pct-bold">{ch.pct}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Sales Trend by Channel (Multi-Line Chart) */}
        <div className="bi-panel-card">
          <div className="bi-panel-header">
            <h2 className="bi-panel-title">Sales Trend by Channel</h2>
            <div className="bi-period-picker-wrap">
              <button
                type="button"
                className="bi-period-btn"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              >
                <span>{channelTrendPeriod}</span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isPeriodOpen && (
                <div className="bi-period-dropdown">
                  {["Monthly", "Weekly", "Daily"].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`bi-period-option ${channelTrendPeriod === p ? "active" : ""}`}
                      onClick={() => {
                        setChannelTrendPeriod(p);
                        setIsPeriodOpen(false);
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bi-chart-container" style={{ height: 215 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesTrendByChannel}
                margin={{ top: 12, right: 10, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F3EBDD"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "#EAE0D0" }}
                  tick={{ fontSize: 10.5, fill: "#785A3C" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10.5, fill: "#8A6D4B" }}
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bi-custom-tooltip multi-line">
                          <p className="bi-tooltip-title">{label} 2026</p>
                          {payload.map((item) => (
                            <div key={item.dataKey} className="bi-multi-tooltip-row">
                              <span
                                className="bi-multi-dot"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="bi-multi-name">
                                {item.name === "website"
                                  ? "Website"
                                  : item.name === "app"
                                  ? "Mobile App"
                                  : item.name === "marketplace"
                                  ? "Marketplace"
                                  : item.name === "offline"
                                  ? "Offline Store"
                                  : "Social Media"}
                                :
                              </span>
                              <strong className="bi-multi-val">
                                ₹{Number(item.value).toLocaleString("en-IN")}
                              </strong>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="website"
                  name="website"
                  stroke="#965B1C"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: "#965B1C" }}
                />
                <Line
                  type="monotone"
                  dataKey="app"
                  name="app"
                  stroke="#78350F"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: "#78350F" }}
                />
                <Line
                  type="monotone"
                  dataKey="marketplace"
                  name="marketplace"
                  stroke="#F59E0B"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: "#F59E0B" }}
                />
                <Line
                  type="monotone"
                  dataKey="offline"
                  name="offline"
                  stroke="#38BDF8"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: "#38BDF8" }}
                />
                <Line
                  type="monotone"
                  dataKey="social"
                  name="social"
                  stroke="#C084FC"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: "#C084FC" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Channel Legend */}
          <div className="bi-channel-legend-row">
            <span className="bi-channel-legend-item">
              <span className="bi-status-dot" style={{ backgroundColor: "#965B1C" }} />
              <span>Website</span>
            </span>
            <span className="bi-channel-legend-item">
              <span className="bi-status-dot" style={{ backgroundColor: "#78350F" }} />
              <span>Mobile App</span>
            </span>
            <span className="bi-channel-legend-item">
              <span className="bi-status-dot" style={{ backgroundColor: "#F59E0B" }} />
              <span>Marketplace</span>
            </span>
            <span className="bi-channel-legend-item">
              <span className="bi-status-dot" style={{ backgroundColor: "#38BDF8" }} />
              <span>Offline Store</span>
            </span>
            <span className="bi-channel-legend-item">
              <span className="bi-status-dot" style={{ backgroundColor: "#C084FC" }} />
              <span>Social Media</span>
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          5. MODAL: VIEW ALL DESIGNERS
      ===================================================== */}
      {isDesignersModalOpen && (
        <div className="bi-modal-backdrop" onClick={() => setIsDesignersModalOpen(false)}>
          <div className="bi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bi-modal-header">
              <div>
                <h3 className="bi-modal-title">All Designers by Sales</h3>
                <p className="bi-modal-desc">
                  Live database leaderboard of couturiers and designer revenue shares ({topDesignersList.length} designers)
                </p>
              </div>
              <button
                type="button"
                className="bi-modal-close"
                onClick={() => setIsDesignersModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="bi-modal-body">
              <table className="bi-modal-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Designer</th>
                    <th>Orders</th>
                    <th>Sales (₹)</th>
                    <th>Market Share</th>
                  </tr>
                </thead>
                <tbody>
                  {topDesignersList.map((d) => (
                    <tr key={d.id || d.name}>
                      <td className="bold-cell">#{d.rank}</td>
                      <td>
                        <div className="bi-modal-designer-cell">
                          <div
                            className="bi-designer-avatar small"
                            style={{ backgroundColor: d.avatarBg, color: d.avatarColor }}
                          >
                            {getDesignerAvatar(d.name)}
                          </div>
                          <span>{d.name}</span>
                        </div>
                      </td>
                      <td>{d.orders}</td>
                      <td className="gold-cell">₹{Number(d.sales).toLocaleString("en-IN")}</td>
                      <td>
                        <span className="bi-modal-pill">{d.pct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          6. MODAL: VIEW ALL CATEGORIES
      ===================================================== */}
      {isCategoriesModalOpen && (
        <div className="bi-modal-backdrop" onClick={() => setIsCategoriesModalOpen(false)}>
          <div className="bi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bi-modal-header">
              <div>
                <h3 className="bi-modal-title">All Product Categories</h3>
                <p className="bi-modal-desc">
                  Live database breakdown of units and percentage share across fashion merchandising ({topCategoriesList.length} categories)
                </p>
              </div>
              <button
                type="button"
                className="bi-modal-close"
                onClick={() => setIsCategoriesModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="bi-modal-body">
              <table className="bi-modal-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Units</th>
                    <th>Share %</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategoriesList.map((cat) => (
                    <tr key={cat.name}>
                      <td>
                        <span style={{ marginRight: 8 }}>{cat.icon}</span>
                        <strong>{cat.name}</strong>
                      </td>
                      <td>{Number(cat.units).toLocaleString("en-IN")} units</td>
                      <td>
                        <span className="bi-modal-pill">{cat.pct}%</span>
                      </td>
                      <td style={{ width: 180 }}>
                        <div className="bi-progress-track">
                          <div
                            className="bi-progress-bar"
                            style={{ width: `${cat.barPct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}