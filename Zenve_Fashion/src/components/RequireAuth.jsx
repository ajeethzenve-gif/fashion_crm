import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ children }) {
  const { isLoggedIn, loginPath } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
}