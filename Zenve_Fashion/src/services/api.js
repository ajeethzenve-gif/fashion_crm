const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

export { API_BASE_URL };

/* =========================================================
   DESIGNERS API
========================================================= */

export async function getDesigners() {
  const response = await fetch(`${API_BASE_URL}/designers/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch designers: ${response.status}`);
  }

  return response.json();
}

export async function getDesigner(id) {
  const response = await fetch(`${API_BASE_URL}/designers/${id}/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch designer: ${response.status}`);
  }

  return response.json();
}

export async function createDesigner(designerData) {
  const response = await fetch(`${API_BASE_URL}/designers/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(designerData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      typeof data === "object"
        ? Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ")
        : "Failed to create designer";
    throw new Error(errorMsg || `Server error: ${response.status}`);
  }

  return data;
}

export async function updateDesigner(id, designerData) {
  const response = await fetch(`${API_BASE_URL}/designers/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(designerData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to update designer: ${response.status}`);
  }

  return data;
}

/* =========================================================
   PRODUCTS API
========================================================= */

export async function getProducts(params = {}) {
  const query = new URLSearchParams();
  if (params.designer) query.set("designer", params.designer);
  if (params.category) query.set("category", params.category);
  if (params.status) query.set("status", params.status);

  const url = `${API_BASE_URL}/products/${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }

  return response.json();
}

export async function createProduct(productData) {
  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      typeof data === "object"
        ? Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        : "Failed to create product";
    throw new Error(errorMsg || `Server error: ${response.status}`);
  }

  return data;
}

export async function updateProduct(id, productData) {
  const response = await fetch(`${API_BASE_URL}/products/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to update product: ${response.status}`);
  }

  return data;
}

export async function deleteProduct(id) {
  const response = await fetch(`${API_BASE_URL}/products/${id}/`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete product: ${response.status}`);
  }

  return true;
}

export async function adjustProductStock(id, action, quantity) {
  const response = await fetch(`${API_BASE_URL}/products/${id}/adjust_stock/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ action, quantity: Number(quantity) }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || `Failed to adjust stock: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/* =========================================================
   ORDERS API
========================================================= */

export async function getOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  const url = `${API_BASE_URL}/orders/${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }

  return response.json();
}

export async function getOrderStats() {
  const response = await fetch(`${API_BASE_URL}/orders/stats/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch order stats: ${response.status}`);
  }

  return response.json();
}

export async function createOrder(orderData) {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      typeof data === "object"
        ? Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        : "Failed to create order";
    throw new Error(errorMsg || `Server error: ${response.status}`);
  }

  return data;
}

export async function transitionOrder(id, status = null) {
  const body = status ? JSON.stringify({ status }) : "{}";
  const response = await fetch(`${API_BASE_URL}/orders/${id}/transition/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || `Failed to transition order: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function cancelOrder(id) {
  return transitionOrder(id, "CANCELLED");
}

/* =========================================================
   RETURNS API (LAYER 09)
========================================================= */

export async function getReturns(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.order_id) query.set("order_id", params.order_id);

  const url = `${API_BASE_URL}/returns/${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch returns: ${response.status}`);
  }

  return response.json();
}

export async function getReturnStats() {
  const response = await fetch(`${API_BASE_URL}/returns/stats/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch return stats: ${response.status}`);
  }

  return response.json();
}

export async function createReturn(returnData) {
  const response = await fetch(`${API_BASE_URL}/returns/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(returnData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      typeof data === "object"
        ? Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        : "Failed to create return request";
    throw new Error(errorMsg || `Server error: ${response.status}`);
  }

  return data;
}

export async function transitionReturn(id, status = null, notes = null) {
  const payload = {};
  if (status) payload.status = status;
  if (notes) payload.inspection_notes = notes;

  const response = await fetch(`${API_BASE_URL}/returns/${id}/transition/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || `Failed to transition return: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function updateReturn(id, returnData) {
  const response = await fetch(`${API_BASE_URL}/returns/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(returnData),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to update return: ${response.status}`);
  }

  return data;
}

/* =========================================================
   SETTLEMENT API (LAYER 10)
========================================================= */

export async function getSettlements(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.designer_id) query.set("designer_id", params.designer_id);
  if (params.is_reversal !== undefined) query.set("is_reversal", params.is_reversal);
  if (params.search) query.set("search", params.search);

  const url = `${API_BASE_URL}/settlements/${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch settlements: ${response.status}`);
  }

  return response.json();
}

export async function getSettlementStats() {
  const response = await fetch(`${API_BASE_URL}/settlements/stats/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch settlement stats: ${response.status}`);
  }

  return response.json();
}

export async function generateSettlements() {
  const response = await fetch(`${API_BASE_URL}/settlements/generate/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Failed to generate settlements: ${response.status}`);
  }

  return data;
}

export async function transitionSettlement(id, status = null, payload = {}) {
  const body = { ...payload };
  if (status) body.status = status;

  const response = await fetch(`${API_BASE_URL}/settlements/${id}/transition/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || `Failed to transition settlement: ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export async function updateSettlement(id, data) {
  const response = await fetch(`${API_BASE_URL}/settlements/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Failed to update settlement: ${response.status}`);
  }

  return resData;
}

/* =========================================================
   ANALYTICS & BI API (LAYER 11)
========================================================= */

export async function getAnalyticsOverview() {
  const response = await fetch(`${API_BASE_URL}/analytics/overview/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics overview: ${response.status}`);
  }

  return response.json();
}

export function exportAnalyticsReport(reportType = "full") {
  const downloadUrl = `${API_BASE_URL}/analytics/export/?report=${encodeURIComponent(reportType)}`;
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute("download", `zenve_${reportType}_report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* =========================================================
   COMMAND CENTRE API (LAYER 12)
========================================================= */

export async function getCommandCentreOverview() {
  const response = await fetch(`${API_BASE_URL}/command-centre/overview/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch command centre overview: ${response.status}`);
  }

  return response.json();
}

/* =========================================================
   DESIGNER PORTAL API (LAYER 02)
========================================================= */

export async function getDesignerPortalDashboard(designerId) {
  const response = await fetch(`${API_BASE_URL}/designers/${designerId}/portal-dashboard/`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch designer portal dashboard: ${response.status}`);
  }

  return response.json();
}

export async function markDesignerNotificationsRead(designerId) {
  const response = await fetch(`${API_BASE_URL}/designers/${designerId}/portal-dashboard/mark-read/`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to mark notifications read: ${response.status}`);
  }

  return response.json();
}