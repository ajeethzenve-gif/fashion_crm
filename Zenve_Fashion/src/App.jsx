import PortalTitle from "./components/PortalTitle.jsx";
import DesignerKYCDetails from "./pages/DesignerKYCDetails.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Home from "./pages/Home.jsx";
import MediaStudio from "./pages/MediaStudio.jsx";
import DesignerCRM from "./pages/DesignerCrm.jsx";
import DesignerPortal from "./pages/DesignerPortal.jsx";
import Catalogue from "./pages/Catalogue.jsx";
import Orders from "./pages/Orders.jsx";
import CatalogueQA from "./pages/CatalogueQa.jsx";
import Inventory from "./pages/Inventory.jsx";
import Storefront from "./pages/Storefront.jsx";
import DeliveryEngine from "./pages/Delivery.jsx";
import Returns from "./pages/Returns.jsx";
import Settlement from "./pages/Settlement.jsx";
import Analytics from "./pages/Analytics.jsx";
import CommandCentre from "./pages/CommandCentre.jsx";
import Accounting from "./pages/Accounting.jsx";
import SocialMedia from "./pages/SocialMedia.jsx";
import Login from "./pages/Login.jsx";
import DesignerLogin from "./pages/DesignerLogin.jsx";
import RequestsNotifications from "./pages/RequestsNotifications.jsx";
import DesignerKYC from "./pages/DesignerKYC.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

function PortalEntry() {
  const { currentUser, isLoggedIn } = useAuth();
  if (isLoggedIn) {
    return <Navigate to={currentUser?.id === "designer" ? "/designer-portal" : "/home"} replace />;
  }
  return <DesignerLogin />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PortalTitle />
        <Routes>
          <Route path="/designer-kyc-submit" element={<RequireAuth><DesignerKYCDetails authenticated /></RequireAuth>} />
          <Route path="/designer-kyc-details" element={<DesignerKYCDetails />} />
          {/* Role-Based Staff Login */}
          <Route path="/crm" element={<Login />} />
          <Route path="/login" element={<Login />} />

        {/* Exclusive Brand Designer Login */}
        <Route path="/designer-login" element={<DesignerLogin />}  name="vendor login"/>
          <Route path="/" element={<PortalEntry />} />
        <Route element={<AppLayout />}>
          {/* Main (layers) page — only after login */}
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />

          {/* Operational Layers (Role Clearance Protected) */}
          <Route path="/designer-kyc" element={<ProtectedRoute layer="17"><DesignerKYC /></ProtectedRoute>} />
          <Route path="/requests-notifications" element={<ProtectedRoute layer="16"><RequestsNotifications /></ProtectedRoute>} />
          <Route path="/media" element={<ProtectedRoute layer="13"><MediaStudio /></ProtectedRoute>} />
          <Route path="/designer-crm" element={<ProtectedRoute layer="01"><DesignerCRM /></ProtectedRoute>} />
          <Route path="/designer-portal" element={<ProtectedRoute layer="02"><DesignerPortal /></ProtectedRoute>} />
          <Route path="/catalogue" element={<ProtectedRoute layer="03"><Catalogue /></ProtectedRoute>} />
          <Route path="/catalogueqa" element={<ProtectedRoute layer="04"><CatalogueQA /></ProtectedRoute>} />
          <Route path="/catalogue-qa" element={<ProtectedRoute layer="04"><CatalogueQA /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute layer="05"><Inventory /></ProtectedRoute>} />
          <Route path="/storefront" element={<ProtectedRoute layer="06"><Storefront /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute layer="07"><Orders /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute layer="08"><DeliveryEngine /></ProtectedRoute>} />
          <Route path="/returns" element={<ProtectedRoute layer="09"><Returns /></ProtectedRoute>} />
          <Route path="/settlement" element={<ProtectedRoute layer="10"><Settlement /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute layer="11"><Analytics /></ProtectedRoute>} />
          <Route path="/command-centre" element={<ProtectedRoute layer="12"><CommandCentre /></ProtectedRoute>} />
          <Route path="/social-media" element={<ProtectedRoute layer="14"><SocialMedia /></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute layer="15"><Accounting /></ProtectedRoute>} />
        </Route>

        {/* Any unknown URL -> "/" (which sends to /login if not signed in) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </ErrorBoundary>
  );
}
