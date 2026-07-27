# HADX LABS Owner App - Design Document

## Overview
A luxury cyber-themed mobile application for HADX LABS owners to manage their e-commerce store with real-time analytics, product management, order fulfillment, and customer CRM.

## Screen List

1. **Security Vault Screen** - One-time security key entry
2. **Dashboard (Home)** - Live store metrics and telemetry
3. **Products Screen** - Product catalog management with CRUD
4. **Orders Screen** - Order list and fulfillment management
5. **Customers Screen** - Customer CRM with contact actions
6. **Analytics Screen** - Revenue charts and store statistics
7. **Settings Screen** - Theme switcher, maintenance mode, key reset

## Primary Content and Functionality

### Security Vault Screen
- Displays a luxury "Cyber-Luxury Security Authorization Vault" interface
- Input field for Master Key (`HADX_SEC_9842_CYBER_SHIELD`)
- Validates key via API handshake with `x-admin-secret` header
- On success: Encrypts & saves key in SecureStore, unlocks dashboard
- On failure: Shows error message, allows retry

### Dashboard (Home)
- **Dynamic Background**: Touch-reactive Skia/Reanimated particle effects with luxury gold accents
- **Glass Telemetry Card** (center):
  - Revenue Today (from API)
  - Active Users (from API)
  - Server Status (from API)
  - Database Health (from API)
- **Floating Glass Bottom Navigation Bar** with 6 tabs: Dashboard, Products, Orders, Customers, Analytics, Settings
- Real-time data binding to API endpoints

### Products Screen
- Fetch real product catalog from `/api/admin/products`
- **Product List**: Displays all products with image, title, price, stock count
- **Add Product Button**: Opens product creation form
- **Product Card Actions**: Edit, Delete, View Details
- **Product Form Fields**:
  - Title, Description, Category
  - Stock Count, Sizes (multi-select), Colors (multi-select)
  - Image/Video URL input
  - Multi-Currency Pricing (PKR, USD, GBP, AED)
  - Toggle: Featured, Trending, Flash Sale
- **Full CRUD**: Create, Read, Update, Delete operations

### Orders Screen
- Fetch real order list from API
- **Order List**: Displays all orders with status, total, date
- **Order Details**: Address, Payment method, Tracking number
- **Quick Actions** (swipe gestures):
  - Swipe-to-Fulfill: Mark order as fulfilled
  - Dispatch: Update tracking status
  - Refund: Process refund
  - Cancel: Cancel order
- **Customer Contact**: Direct WhatsApp, Call, Email triggers

### Customers Screen
- Fetch customer list from API
- **Customer List**: Name, email, total orders, lifetime value
- **Customer Details**: Contact info, order history, notes
- **Quick Actions**:
  - WhatsApp: Open WhatsApp chat
  - Call: Initiate phone call
  - Email: Open email composer

### Analytics Screen
- **Revenue Charts**: Daily, Monthly, Yearly views (Skia/Reanimated)
- **Store Statistics**: Total revenue, average order value, conversion rate
- **Key Metrics**: Top products, top customers, sales trends

### Settings Screen
- **Theme Switcher**: Radio matrix with 5 theme options
  1. HADX Cyber-Luxury (Default)
  2. Bento Grid Telemetry
  3. VisionOS Spatial
  4. Cyberpunk Terminal
  5. Neumorphic Dark Luxe
- **Maintenance Mode Toggle**: Global website maintenance toggle
- **Reset Secret Key**: Option to reset and re-enter Master Key

## Key User Flows

### First Launch Flow
1. App opens → Check SecureStore for 'x-admin-secret'
2. If missing → Display Security Vault screen
3. User enters Master Key → API validation
4. On success → Save key, navigate to Dashboard
5. On failure → Show error, allow retry

### Subsequent Launch Flow
1. App opens → Read key from SecureStore
2. Inject `x-admin-secret` header into all API requests
3. Navigate directly to Dashboard

### Product Management Flow
1. Dashboard → Tap "Products" tab
2. View product list
3. Tap product to edit OR tap "+" to create new
4. Fill form with all details
5. Upload image/video via URL
6. Set multi-currency prices
7. Toggle featured/trending/flash sale
8. Save → API updates product
9. Return to product list

### Order Fulfillment Flow
1. Dashboard → Tap "Orders" tab
2. View order list with status
3. Tap order to view details
4. Swipe-to-Fulfill / Dispatch / Refund / Cancel
5. Confirm action → API processes
6. Show success/error message
7. Refresh order list

## Color Choices

### HADX Cyber-Luxury (Default Theme)
- **Deep Black**: #050505 (background)
- **Luxury Gold**: #D4AF37 (primary accent)
- **Dark Surface**: #1a1a1a (cards)
- **Gold Border**: #D4AF37 (glowing borders)
- **Text**: #FFFFFF (foreground)
- **Muted**: #999999 (secondary text)

### Bento Grid Telemetry
- **Obsidian Matte**: #0d0d0d (background)
- **Steel Gray**: #3a3a3a (cards)
- **Cyan Accent**: #00d9ff (highlights)
- **Text**: #e0e0e0

### VisionOS Spatial
- **Deep Navy**: #0a0e27 (background)
- **Frosted Glass**: rgba(255, 255, 255, 0.1) (cards)
- **Ambient Blue**: #4a9eff (highlights)
- **Text**: #ffffff

### Cyberpunk Terminal
- **Pitch Black**: #000000 (background)
- **Neon Green**: #00ff00 (primary)
- **Neon Gold**: #ffaa00 (secondary)
- **Monospace Font**: Courier New / Roboto Mono
- **Text**: #00ff00

### Neumorphic Dark Luxe
- **Dark Gray**: #1a1a1a (background)
- **Soft Gold**: #c9a961 (highlights)
- **Extruded Shadows**: rgba(0, 0, 0, 0.5) (depth)
- **Text**: #e8e8e8

## Technical Stack
- **Framework**: React Native (Expo SDK 54)
- **State Management**: Zustand (global theme engine)
- **Styling**: NativeWind (Tailwind CSS)
- **Animations**: React Native Reanimated 4.x
- **Security**: Expo SecureStore
- **API Client**: Axios with custom headers
- **Charts**: Skia/Reanimated for real-time rendering

## Design Principles
1. **Luxury First**: Every interaction feels premium and intentional
2. **Cyber-Aesthetic**: Dark, gold, glass effects dominate
3. **Real Data Only**: No hardcoded values; all metrics from live API
4. **Touch-Reactive**: Particle effects and haptic feedback on interactions
5. **One-Handed Usage**: All controls reachable from bottom half of screen
6. **Accessibility**: High contrast, readable fonts, clear hierarchy
