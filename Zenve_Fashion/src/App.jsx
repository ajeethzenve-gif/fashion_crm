import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";

import Home from "./pages/Home.jsx";
import MediaStudio from "./pages/MediaStudio.jsx";
import LayerPage from "./pages/LayerPage.jsx";
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
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Role-Based Login */}
        <Route path="/login" element={<Login />} />
        <Route path="/media" element={<ProtectedRoute layer="13"><MediaStudio /></ProtectedRoute>} />

        {/* Operational Layers (Role Clearance Protected) */}
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
      </Routes>
    </AuthProvider>
  );
}
