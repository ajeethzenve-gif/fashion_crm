# Zenve Fashion Operations & CRM System

A full-stack fashion operations platform with 13 modular layers spanning Designer Onboarding, Catalogue QA, Inventory Engine, Commerce Storefront, Order Management (OMS), Delivery Logistics, Reverse Logistics (Returns Engine), Financial Settlements, Executive Analytics, and Media Studio.

---

## 🏛️ Architecture Overview

The system consists of two primary services:

1. **Frontend (`Zenve_Fashion`)**:
   - Built with **React 18** and **Vite**.
   - Modular CSS architecture with multi-screen responsive design across all viewports (Mobile 320px–640px, Tablet 641px–1024px, Laptop 1025px–1440px, Desktop 1441px–1920px, and 4K Ultra HD 1921px–3840px+).
   - High-fidelity synchronization with operations blueprint.
   - Comprehensive state management, live API integrations, and omni-search navigation.

2. **Backend (`Zenve_Fashion_Backend`)**:
   - Built with **Django** & **Django REST Framework (DRF)**.
   - RESTful APIs powering Designers, Products & SKUs, Inventory ledgers, Orders, Delivery serviceability, Returns workflow, Financial settlements, and Command Centre analytics.
   - CORS-enabled for seamless frontend-backend integration.

---

## 🚀 Quick Start

### 1. Backend Setup (Django)

```bash
cd Zenve_Fashion_Backend

# Activate virtual environment
# Windows:
..\.venv\Scripts\activate
# macOS/Linux:
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django development server (runs on http://127.0.0.1:8000/)
python manage.py runserver 8000
```

### 2. Frontend Setup (React + Vite)

```bash
cd Zenve_Fashion

# Install dependencies
npm install

# Start Vite dev server (runs on http://localhost:5174/ or http://localhost:5173/)
npm run dev

# Build for production
npm run build
```

---

## 📦 Operational Layers

- **01 Designer CRM** (`/designer-crm`) — Lead pipeline, onboarding stages, commission terms.
- **02 Designer Portal** (`/designer-portal`) — Designer dashboard, SKU submission, active listings.
- **03 Product / SKU Catalogue** (`/catalogue`) — Master SKU catalogue, pricing, merchandising.
- **04 Catalogue QA** (`/catalogueqa`) — 10 weighted quality dimensions, reviewer workflows.
- **05 Inventory Engine** (`/inventory`) — Physical vs available stock, reorder forecast, dead stock alerts.
- **06 Storefront** (`/storefront`) — B2C commerce, real-time cart, checkout, delivery eligibility.
- **07 OMS / Orders** (`/orders`) — Multi-state order lifecycle, dispatch, transit, delivery.
- **08 Delivery Engine** (`/delivery`) — Pincode serviceability, 60-min fast delivery eligibility, SLAs.
- **09 Returns Engine** (`/returns`) — RMA creation, pickup, inspection QC, instant refunds.
- **10 Settlement** (`/settlement`) — Auditable designer payouts, take rates, commission tracking.
- **11 Analytics & Intelligence** (`/analytics`) — GMV, margins, take rates, return ratios, designer leaderboard.
- **12 Command Centre** (`/command-centre`) — System-wide operations hub with real-time sync.
- **13 Media Studio** (`/media`) — Four designer originals, Figma links, generated image uploads, and designer review.

### Media workflow

1. Upload a product with four original images in Designer Portal. Existing products with four images also appear in Media Studio.
2. Open Media Studio as Admin or switch to the Media Team persona. Search or filter the product queue.
3. Create the creatives in Figma, save the Figma file link, and upload the exported JPG, PNG, or WebP images (up to 12, 10 MB each). Save work or send the images to the designer.
4. In Designer Portal, select the matching designer and use **Images from the media team** to approve the delivery or request changes with feedback. Use Refresh to check for new deliveries.
5. A delivery is locked while awaiting review or after approval. Requested changes allow the media team to replace the generated set and send it again. Original product images remain unchanged.

Figma creation/export is manual; sending delivers images inside the portal. The social layer is not included. Apply `python manage.py migrate` when installing this update. Media follows the existing demo persona and public API access model; production authentication and designer ownership enforcement are not provided by this workflow.

---

## 📄 License

Proprietary © Zenve Fashion. All rights reserved.
