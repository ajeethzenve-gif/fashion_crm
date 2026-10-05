import React, { createContext, useContext, useState, useEffect } from "react";
import { loginRequest, normalizeSession, saveTokens, clearTokens } from "../services/authApi";


const SESSION_KEY = "zenve_session";
const LEGACY_KEY = "zenve_auth_user";

// Kept empty only so old imports do not break. Roles now come from the database.
export const ROLES = [];

const LAYER_PATH_MAP = {
  "/designer-crm": "01",
  "/designer-portal": "02",
  "/catalogue": "03",
  "/catalogueqa": "04",
  "/catalogue-qa": "04",
  "/inventory": "05",
  "/storefront": "06",
  "/orders": "07",
  "/delivery": "08",
  "/returns": "09",
  "/settlement": "10",
  "/analytics": "11",
  "/command-centre": "12",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      localStorage.removeItem(LEGACY_KEY); // remove old mock session
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.clearance)) return parsed;
      }
    } catch {
      // ignore
    }
    return null; // nobody logged in
  });

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error("Could not persist auth state", e);
    }
  }, [currentUser]);

  // Real login: username + password are checked by the backend.
  // The role and allowed layers come back from the database.
  const login = async (username, password) => {
    try {
      const data = await loginRequest(username.trim(), password);
      const { user, tokens } = normalizeSession(data);

      if (user.clearance.length === 0) {
        return { ok: false, error: "No layers are assigned to your role. Please contact the admin." };
      }

      saveTokens(tokens);
      setCurrentUser(user);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err.message || "Login failed." };
    }
  };

  const logout = () => {
    clearTokens();
    setCurrentUser(null);
  };

  const hasAccess = (layerNum) => {
    if (!currentUser) return false;
    const numStr = String(layerNum).padStart(2, "0");
    return currentUser.clearance?.includes(numStr) ?? false;
  };

  const canAccessPath = (path) => {
    if (!currentUser) return false;
    const layerNum = LAYER_PATH_MAP[path];
    if (!layerNum) return true;
    return hasAccess(layerNum);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        ROLES,
        login,
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