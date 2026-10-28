import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PortalTitle() {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();
  const path = pathname.replace(/\/+$/, "") || "/";
  useLayoutEffect(() => {
    if (path === "/designer-login" || path === "/") {
      document.title = "Zenve Fashion Designer";
    } else if (path === "/login" || path === "/crm") {
      document.title = "Zenve Fashion CRM";
    } else if (currentUser?.id === "designer" || path === "/designer-kyc-details" || path === "/designer-kyc-submit") {
      document.title = "Zenve Fashion Designer Portal";
    } else {
      document.title = "Zenve Fashion CRM";
    }
  }, [path, currentUser?.id]);
  return null;
}
