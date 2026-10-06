import { layers } from "../data/layers";

/* =========================================================
   CONFIG  (change these 2 lines to match your Django backend)
========================================================= */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
export const LOGIN_URL = `${API_BASE}/api/login/`; // accounts.urls -> login/ (included under api/)

const ACCESS_KEY = "zenve_access";
const REFRESH_KEY = "zenve_refresh";

/* =========================================================
   TOKEN HELPERS
========================================================= */
export const getAccessToken = () => sessionStorage.getItem(ACCESS_KEY);

export function saveTokens({ access, refresh }) {
  try {
    if (access) sessionStorage.setItem(ACCESS_KEY, access);
    if (refresh) sessionStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // ignore
  }
}

export function clearTokens() {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

/* =========================================================
   LOGIN REQUEST  (username + password -> backend)
========================================================= */
export async function loginRequest(username, password) {
  let res;
  try {
    res = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("Cannot reach the server. Please try again.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new Error(data?.message || "Invalid username or password.");
    }
    throw new Error(data?.detail || data?.message || data?.error || "Login failed. Please try again.");
  }

  return data;
}

/* =========================================================
   MAP BACKEND RESPONSE -> APP USER
   The allowed layers come from the database (role -> layers).
   Accepts layer numbers ("01", 1), route paths ("/inventory"),
   layer names ("Inventory Engine"), or objects containing those.
========================================================= */
function toLayerNumber(item) {
  if (item === null || item === undefined) return null;

  if (typeof item === "object") {
    return toLayerNumber(
      item.n ??
        item.number ??
        item.layer_number ??
        item.layer ??
        item.code ??
        item.path ??
        item.name ??
        item.layer_name
    );
  }

  const s = String(item).trim();
  if (/^\d+$/.test(s)) return s.padStart(2, "0");

  const byPath = layers.find((l) => l.path === s);
  if (byPath) return byPath.n;

  const byName = layers.find((l) => l.name.toLowerCase() === s.toLowerCase());
  return byName ? byName.n : null;
}

export function normalizeSession(data) {
  const u = data?.user || data || {};
  const roleObj = u.role && typeof u.role === "object" ? u.role : null;

  const roleName =
    roleObj?.name ||
    roleObj?.role_name ||
    (typeof u.role === "string" ? u.role : "") ||
    u.role_name ||
    u.group ||
    "User";

  let raw =
    u.layers ??
    u.allowed_layers ??
    u.clearance ??
    u.permissions ??
    roleObj?.layers ??
    roleObj?.allowed_layers ??
    roleObj?.permissions ??
    data?.layers ??
    data?.permissions ??
    [];
  if (!Array.isArray(raw)) raw = [];

  let clearance = [...new Set(raw.map(toLayerNumber).filter(Boolean))].sort();

  // Django superuser with no layer list -> all layers
  if (u.is_superuser === true && clearance.length === 0) {
    clearance = layers.map((l) => l.n);
  }

  const firstLayer = layers.find((l) => l.n === clearance[0]);
  const fullName =
    u.full_name ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.username ||
    "User";

  return {
    user: {
      id: roleName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      username: u.username || "",
      user: fullName, // display name (used by Header)
      name: roleName,
      shortRole: roleName,
      email: u.email || "",
      department: u.department || "",
      description: "",
      badgeClass: roleName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      landingPath: firstLayer?.path || "/",
      clearance,
    },
    tokens: {
      access: data?.access ?? data?.token ?? data?.access_token ?? null,
      refresh: data?.refresh ?? data?.refresh_token ?? null,
    },
  };
}