import React, { createContext, useContext, useState, useEffect } from "react";

export const ROLES = [
  {
    id: "admin",
    name: "Executive Admin",
    shortRole: "Admin",
    user: "Priya Raghavan",
    email: "priya.raghavan@zenve.in",
    department: "Executive & Governance",
    landingPath: "/command-centre",
    description: "Full clearance across all 12 operational layers, approvals, and system controls.",
    badgeClass: "admin",
    clearance: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
  },
  {
    id: "designer",
    name: "Brand Designer",
    shortRole: "Designer",
    user: "Aarav Mehta",
    brand: "Aarav Pet Atelier",
    email: "aarav@petatelier.in",
    department: "External Supply Partner",
    landingPath: "/designer-portal",
    description: "Supply layer partner portal, SKU uploads, live inventory, and settlements.",
    badgeClass: "designer",
    clearance: ["02", "03", "06"],
  },
  {
    id: "merchandiser",
    name: "Merchandising & CRM",
    shortRole: "Merchandiser",
    user: "Ananya Roy",
    email: "ananya.roy@zenve.in",
    department: "Supply & Brand Acquisition",
    landingPath: "/designer-crm",
    description: "Brand lead pipeline, designer onboarding, KYC review, and contracts.",
    badgeClass: "merchandiser",
    clearance: ["01", "03", "10"],
  },
  {
    id: "qa",
    name: "Catalogue QA Lead",
    shortRole: "Catalogue QA",
    user: "Rohan Varma",
    email: "rohan.varma@zenve.in",
    department: "Quality & Media Standards",
    landingPath: "/catalogueqa",
    description: "SKU specification validation, media quality checks, and approval audit trail.",
    badgeClass: "qa",
    clearance: ["03", "04"],
  },
  {
    id: "inventory",
    name: "Inventory & Logistics",
    shortRole: "Inventory Ops",
    user: "Vikram Singh",
    email: "vikram.singh@zenve.in",
    department: "Warehouse & Fulfillment",
    landingPath: "/inventory",
    description: "Stock receipts, physical vs reserved counts, damage quarantine, and returns.",
    badgeClass: "inventory",
    clearance: ["05", "07", "08", "09"],
  },
  {
    id: "finance",
    name: "Finance Controller",
    shortRole: "Finance",
    user: "Neha Kapoor",
    email: "neha.kapoor@zenve.in",
    department: "Settlement & Accounting",
    landingPath: "/settlement",
    description: "Take-rate calculation, designer payout reconciliation, and escrow management.",
    badgeClass: "finance",
    clearance: ["07", "10", "11"],
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("zenve_auth_user");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return ROLES[0]; // Default to Admin
  });

  useEffect(() => {
    try {
      localStorage.setItem("zenve_auth_user", JSON.stringify(currentUser));
    } catch (e) {
      console.error("Could not persist auth state", e);
    }
  }, [currentUser]);

  const loginWithRole = (roleId) => {
    const found = ROLES.find((r) => r.id === roleId) || ROLES[0];
    setCurrentUser(found);
    return found;
  };

  const loginCustom = (email, password, roleId) => {
    const roleObj = ROLES.find((r) => r.id === roleId) || ROLES[0];
    const updated = {
      ...roleObj,
      email: email || roleObj.email,
    };
    setCurrentUser(updated);
    return updated;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem("zenve_auth_user");
    } catch {
      // Ignore
    }
  };

  const hasAccess = (layerNum) => {
    if (!currentUser) return false;
    const numStr = String(layerNum).padStart(2, "0");
    return currentUser.clearance?.includes(numStr) ?? false;
  };

  const canAccessPath = (path) => {
    if (!currentUser) return false;
    const layerPathMap = {
      "/designer-crm": "01",
      "/designer-portal": "02",
      "/catalogue": "03",
      "/catalogueqa": "04",
      "/inventory": "05",
      "/storefront": "06",
      "/orders": "07",
      "/delivery": "08",
      "/returns": "09",
      "/settlement": "10",
      "/analytics": "11",
      "/command-centre": "12",
    };
    const layerNum = layerPathMap[path];
    if (!layerNum) return true; // public / unspecified
    return hasAccess(layerNum);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser: currentUser || ROLES[0],
        ROLES,
        loginWithRole,
        loginCustom,
        logout,
        hasAccess,
        canAccessPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
