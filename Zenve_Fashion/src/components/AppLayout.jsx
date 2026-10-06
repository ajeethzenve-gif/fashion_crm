import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function AppLayout({ children }) {
  return (
    <div className="zenve-app-layout">
      <Sidebar />
      <div className="zenve-main-content">
        <div className="zenve-page-scroll">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
}
