# SmartLamppost v5.0 - User Manual

**Version:** 5.0.0
**Last Updated:** February 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Key Features](#key-features)
3. [Getting Started](#getting-started)
4. [Dashboard](#dashboard)
5. [Assets Management](#assets-management)
6. [QR/RFID Scanner](#qrrfid-scanner)
7. [GPS Map](#gps-map)
8. [Interventions](#interventions)
9. [Product Catalog](#product-catalog)
10. [Technicians](#technicians)
11. [Reports](#reports)
12. [Analytics & KPIs](#analytics--kpis)
13. [User Management](#user-management)
14. [Multi-Tenant Management](#multi-tenant-management)
15. [Settings](#settings)
16. [Mobile Usage](#mobile-usage)

---

## Introduction

SmartLamppost v5.0 is a comprehensive multi-tenant infrastructure management system designed for managing street lighting assets, RFID-tagged equipment, and maintenance operations. The platform provides real-time tracking, predictive maintenance analytics, and complete lifecycle management for urban infrastructure.

### System Requirements

- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS 14+, Android 10+
- **Screen Resolution:** Minimum 1024x768 (responsive design supports all sizes)

---

## Key Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Tenant Architecture** | Isolated data and branding for each organization |
| **RFID/QR Asset Tracking** | Scan and locate assets using smartphone camera |
| **GPS Mapping** | Real-time geographic visualization of all assets |
| **Predictive Maintenance** | ML-powered failure prediction and scheduling |
| **Weather Integration** | OpenWeatherMap integration for maintenance planning |
| **Custom Reports** | Build and export custom data reports |
| **Offline Support** | PWA with offline data caching |
| **Multi-Language** | English, Portuguese, French, German |

### Plan-Based Features

| Plan | Features |
|------|----------|
| **Free** | Up to 50 assets, basic reports |
| **Professional** | Up to 500 assets, custom reports, API access |
| **Enterprise** | Unlimited assets, ML predictions, weather, white-label |

---

## Getting Started

### First Login

1. Navigate to your SmartLamppost instance URL
2. Enter your email and password
3. If 2FA is enabled, enter the verification code sent to your email/phone
4. On first login, you may be prompted to change your password

### Default Credentials (Development)

- **Email:** admin@smartlamppost.com
- **Password:** Admin123!

> **Important:** Change default credentials immediately in production environments.

### Interface Overview

The interface consists of:
- **Sidebar (Left):** Navigation menu with all modules
- **Header (Top):** Language selector, theme toggle, notifications, user menu
- **Main Content (Center):** Active module content
- **Footer (Sidebar):** "Solution by SmartLamppost" branding

---

## Dashboard

The Dashboard provides a quick overview of your system status.

### Dashboard Components

1. **Summary Cards**
   - Total Assets
   - Assets This Month
   - Active Users
   - Pending Interventions

2. **Assets by Status Chart**
   - Pie chart showing operational, maintenance needed, in repair, deactivated

3. **Quick Actions**
   - New Asset
   - New Intervention
   - GPS Map
   - Reports

### Using the Dashboard

- Click on any summary card to navigate to the detailed view
- Use Quick Actions for common tasks
- The dashboard auto-refreshes every 5 minutes

---

## Assets Management

The Assets module is the core of SmartLamppost, managing all your infrastructure items.

### Asset List View

- **Search:** Find assets by serial number, RFID tag, or reference
- **Filters:** Filter by status, location, or custom fields
- **Columns:** Serial Number, Reference, Location, Status, Created Date
- **Actions:** View, Edit, Delete

### Creating a New Asset

1. Click **"+ New Asset"** button
2. Fill in required fields:
   - **Serial Number:** Auto-generated (configurable prefix)
   - **Product Reference:** Select from catalog
   - **RFID Tag:** Scan or enter manually
   - **GPS Coordinates:** Enter or capture from device
3. Add optional fields based on your catalog configuration
4. Click **Save**

### Asset Details

Each asset page shows:
- Basic information (serial, reference, status)
- GPS location with map preview
- Intervention history
- Attached documents/photos
- Custom fields from catalog
- QR code for mobile scanning

### Bulk Operations

- **Import:** Upload CSV file with asset data
- **Export:** Download all assets as CSV/Excel
- **Bulk Edit:** Select multiple assets and edit common fields

---

## QR/RFID Scanner

The Scanner module allows you to quickly locate assets using your device's camera.

### Scan Modes

1. **All Codes:** Scans both QR codes and barcodes
2. **QR Code Only:** Optimized for QR codes
3. **Barcode:** Supports Code128, EAN, UPC formats

### How to Scan

1. Navigate to **Scan QR/RFID** in the sidebar
2. Select your preferred scan mode
3. Click the scan button to open the camera
4. Point camera at the QR code or barcode
5. The system automatically searches for the asset

### Manual Entry

If scanning isn't possible:
1. Enter the code in the "Manual Entry" field
2. Click **Search**
3. Results show matching assets

### Scan History

- Recent scans are saved locally
- Click any history item to view the asset
- Green = Asset found, Gray = Not found

---

## GPS Map

The GPS Map provides geographic visualization of all assets.

### Map Features

- **Asset Markers:** Color-coded by status
  - 🟢 Green: Operational
  - 🟡 Yellow: Maintenance Needed
  - 🟠 Orange: In Repair
  - 🔴 Red: Deactivated

- **Filters:**
  - By Status
  - By Municipality/Region

- **Layers:**
  - Assets layer (toggleable)
  - Interventions layer (toggleable)

### Interacting with the Map

1. **Click a marker** to see asset quick info
2. **Click "View Details"** to open full asset page
3. **Use zoom controls** or pinch-to-zoom on mobile
4. **Click "Plan Route"** to optimize technician routes

### Statistics Panel

Shows:
- Assets with GPS coordinates
- Open interventions
- Legend for marker colors

---

## Interventions

Manage all maintenance work orders and service requests.

### Intervention Types

| Type | Description |
|------|-------------|
| **Preventive** | Scheduled maintenance |
| **Corrective** | Repair after failure |
| **Replacement** | Asset replacement |
| **Inspection** | Routine inspection |

### Creating an Intervention

1. Click **"+ New Intervention"**
2. Select the **Asset** (or scan QR code)
3. Choose **Type** (preventive, corrective, etc.)
4. Set **Priority** (low, medium, high, critical)
5. Assign **Technician** (internal or external)
6. Add **Description** and **Notes**
7. Set **Scheduled Date** if planned
8. Click **Save**

### Intervention Workflow

```
Pending → In Progress → Completed
                    ↘ Cancelled
```

### Completing an Intervention

1. Open the intervention
2. Click **"Mark Complete"**
3. Fill in completion details:
   - Actual duration
   - Parts used
   - Labor cost
   - Materials cost
   - Notes/observations
4. Optionally attach photos
5. Click **Complete**

---

## Product Catalog

The Catalog defines product references, specifications, and configurable fields.

### Catalog Sections

1. **References:** Product models with specifications
2. **Columns:** Custom data fields for assets
3. **Packs:** Groupings of columns
4. **Values:** Predefined values for dropdown fields

### Managing References

Each reference includes:
- Product code
- Description
- Pack (column group)
- Height specifications
- Number of arms
- Fixing type
- Associated modules/equipment

### Custom Fields (Columns)

Create custom data fields:
- **Text:** Free text input
- **Number:** Numeric values
- **Date:** Date picker
- **Select:** Dropdown with predefined values
- **Boolean:** Yes/No toggle

### Import/Export

- Export catalog to CSV for backup
- Import catalog from CSV to bulk update

---

## Technicians

Manage internal and external maintenance personnel.

### Technician Types

- **Internal:** Company employees
- **External:** Third-party contractors

### Technician Profile

- Name and contact information
- Company (for external)
- Specializations
- Status (Active/Inactive)
- Assigned interventions history

### Creating a Technician

1. Click **"+ New Technician"**
2. Fill in details:
   - Name
   - Type (Internal/External)
   - Company (if external)
   - Email
   - Phone
   - Specializations
3. Click **Save**

---

## Reports

Generate and export system reports.

### Report Tabs

1. **Overview:** General statistics and charts
2. **Interventions:** Detailed intervention reports
3. **Assets:** Asset-specific reports
4. **Technicians:** Technician performance reports

### Overview Statistics

- Total Assets
- Total Interventions
- Active Technicians
- Activity last 30 days

### Charts

- Assets by Status (Pie chart)
- Interventions by Status (Pie chart)
- Interventions by Type (Bar chart)
- User activity

### Exporting Reports

1. Select date range (for intervention reports)
2. Apply filters as needed
3. Click **Export** button
4. Choose format (CSV, Excel, PDF)

---

## Analytics & KPIs

Advanced analytics with predictive maintenance capabilities.

### KPI Metrics

| Metric | Description |
|--------|-------------|
| **MTBF** | Mean Time Between Failures (days/hours) |
| **MTTR** | Mean Time To Repair (hours) |
| **Availability** | Percentage of operational assets |
| **Total Costs** | Maintenance costs in period |

### Efficiency Metrics

- Completion Rate (%)
- Completed vs Pending interventions
- Average Completion Time

### Asset Health

- Assets by status
- Warranty expiring (30 days)
- Warranty expired
- Maintenance due (7 days)

### ML Predictions Tab

Predictive maintenance powered by machine learning:

- **Risk Score:** 0-100% probability of failure
- **Priority:** Low, Medium, High, Critical
- **Factors:** Contributing risk factors
- **Recommendation:** Suggested action

### Weather Tab

Integration with OpenWeatherMap:

1. **Configure API Key:**
   - Get free key from openweathermap.org
   - Enter in Weather configuration

2. **Features:**
   - Current weather at asset locations
   - 5-day forecast
   - Weather alerts
   - Optimal maintenance windows

---

## User Management

Manage system users and their permissions.

### User Roles

| Role | Permissions |
|------|-------------|
| **Viewer** | Read-only access |
| **Operator** | Create/edit assets and interventions |
| **Admin** | Full access except tenant management |
| **Super Admin** | Full system access including tenants |

### Creating a User

1. Go to **Users** in sidebar
2. Click **"+ New User"**
3. Enter:
   - Email (used for login)
   - First/Last Name
   - Role
   - Phone (optional, for 2FA SMS)
4. User receives email with temporary password

### Two-Factor Authentication (2FA)

- Enable per-user in user settings
- Methods: Email or SMS
- Required for admin accounts (configurable)

---

## Multi-Tenant Management

For Super Admins managing multiple organizations.

### Tenant Overview

- Total tenants
- Active tenants
- Total users across tenants

### Creating a Tenant

1. Go to **Tenants** in sidebar
2. Click **"+ New Tenant"**
3. Configure:
   - Tenant ID (unique identifier)
   - Organization name
   - Plan (Free, Professional, Enterprise)
   - Admin email
4. Click **Create**

### Tenant Settings

- **Logo:** Upload PNG/JPG for branding
- **Plan:** Change subscription plan
- **Status:** Activate/Deactivate
- **Users:** Manage tenant users

### Plan Configuration

Click **"Configure Plans"** to:
- Edit plan features
- Set asset limits
- Enable/disable modules

---

## Settings

System-wide configuration options.

### Settings Tabs

1. **Prefixes:** Configure serial number formats
2. **Favorites:** Set default values for forms
3. **Colors:** Customize status colors
4. **Counters:** Reset serial number counters
5. **Field Catalog:** Configure custom fields
6. **Asset Fields:** Enable/disable asset form fields
7. **Notifications:** Email notification settings
8. **Privacy & Data:** GDPR compliance settings
9. **Backup:** Data backup and restore
10. **Audit Log:** System activity history

### Prefix Configuration

| Setting | Example | Description |
|---------|---------|-------------|
| Asset Prefix | SLP | Serial number prefix |
| Asset Digits | 9 | Number of digits (SLP000000001) |
| Preventive Prefix | INTP | Preventive intervention prefix |
| Corrective Prefix | INTC | Corrective intervention prefix |

### Favorites (Defaults)

Set default values that auto-fill in forms:
- Default status for new assets
- Default intervention type
- Default priority
- Default assigned technician

---

## Mobile Usage

SmartLamppost is a Progressive Web App (PWA) optimized for mobile devices.

### Installing as App

**iOS (Safari):**
1. Open SmartLamppost in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Name the app and tap Add

**Android (Chrome):**
1. Open SmartLamppost in Chrome
2. Tap menu (three dots)
3. Select "Add to Home Screen"
4. Confirm installation

### Mobile-Optimized Features

- **Scanner:** Full camera access for QR/barcode scanning
- **GPS:** Capture current location for assets
- **Offline Mode:** Access recent data without internet
- **Push Notifications:** Receive alerts (when enabled)

### Touch Gestures

- **Swipe left:** Delete item (with confirmation)
- **Pull down:** Refresh current view
- **Pinch:** Zoom on maps

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + N` | New item (context-dependent) |
| `Ctrl/Cmd + S` | Save current form |
| `Esc` | Close modal/cancel |
| `?` | Show keyboard shortcuts |

---

## Troubleshooting

### Common Issues

**Cannot login:**
- Check email/password
- Clear browser cache
- Contact admin if account is locked

**Scanner not working:**
- Allow camera permissions
- Ensure good lighting
- Clean camera lens
- Try manual entry

**Map not loading:**
- Check internet connection
- Allow location permissions
- Refresh the page

**Data not saving:**
- Check required fields
- Verify network connection
- Check user permissions

### Support

For technical support:
- Email: support@smartlamppost.com
- Documentation: docs.smartlamppost.com

---

## Appendix

### API Documentation

SmartLamppost provides a REST API for integrations:

**Base URL:** `https://your-instance.com/api`

**Authentication:** Bearer token in Authorization header

**Key Endpoints:**
- `GET /assets` - List assets
- `POST /assets` - Create asset
- `GET /interventions` - List interventions
- `POST /scan/lookup` - Lookup by QR/RFID

Full API documentation available at `/api/docs`

### Data Export Formats

| Format | Use Case |
|--------|----------|
| CSV | Spreadsheet import, data analysis |
| Excel | Formatted reports with charts |
| PDF | Printable reports |
| JSON | API integrations |

---

**SmartLamppost v5.0** - Intelligent Infrastructure Management

© 2026 SmartLamppost. All rights reserved.
