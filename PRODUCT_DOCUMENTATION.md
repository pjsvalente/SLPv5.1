# SmartLamppost Asset Management System
## Product Documentation & Feature Overview

---

# Executive Summary

**SmartLamppost AMS** is an enterprise-grade intelligent asset management platform designed for urban infrastructure management. The system combines IoT tracking, predictive maintenance, and advanced analytics to optimize asset lifecycle management, reduce operational costs, and improve service delivery.

---

# Table of Contents

1. [Platform Overview](#platform-overview)
2. [Core Modules](#core-modules)
3. [Key Features](#key-features)
4. [Technical Specifications](#technical-specifications)
5. [User Roles & Permissions](#user-roles--permissions)
6. [One-Pager Summary](#one-pager-summary)

---

# Platform Overview

## Vision
Transform urban infrastructure management through intelligent asset tracking, predictive maintenance, and data-driven decision making.

## Key Benefits
- **Reduce Downtime**: Predictive maintenance reduces unplanned failures by up to 40%
- **Cut Costs**: Optimized routes and preventive maintenance lower operational costs
- **Improve Efficiency**: Real-time tracking and automated workflows increase team productivity
- **Data-Driven Decisions**: Advanced analytics and KPIs enable informed decision-making
- **Scalable**: Multi-tenant architecture supports organizations of any size

---

# Core Modules

## 1. Dashboard & Analytics

### Real-Time Overview
- Total assets count with status breakdown
- Active interventions and pending work orders
- Team activity and assignments
- Quick action buttons for common tasks

### Visual Analytics
- Asset status distribution (Pie Chart)
- Intervention types breakdown (Bar Chart)
- Monthly trends and patterns
- Status change indicators

---

## 2. Asset Management

### Complete Asset Lifecycle
| Feature | Description |
|---------|-------------|
| **Asset Registry** | Centralized database of all assets with unique serial numbers |
| **Auto Serial Generation** | Automatic serial number generation with collision detection |
| **Dynamic Fields** | Customizable attributes (product reference, location, condition) |
| **Status Tracking** | Operacional, Manutenção Necessária, Em Reparação, Avariado, Desativado |
| **History Tracking** | Complete audit trail of all asset changes |
| **Bulk Operations** | Batch updates and mass import/export |

### Asset Information
- Serial Number (auto-generated)
- Product Reference & Model
- Manufacturer & Specifications
- Installation Date & Warranty
- GPS Coordinates (Latitude/Longitude)
- Street Address & Municipality
- Current Status & Condition
- Associated Interventions

---

## 3. GPS & Interactive Maps

### Map Features
| Feature | Description |
|---------|-------------|
| **Interactive Visualization** | Leaflet-based maps with OpenStreetMap |
| **Asset Markers** | Color-coded markers by operational status |
| **Intervention Markers** | Visual indication of active work orders |
| **Clustering** | Automatic grouping of nearby assets |
| **Filtering** | Filter by status, municipality, type |
| **Popups** | Click for detailed information |

### Status Color Coding
- 🟢 **Green**: Operational
- 🟡 **Yellow**: Maintenance Needed
- 🟠 **Orange**: Under Repair
- 🔴 **Red**: Failed/Broken
- ⚫ **Gray**: Deactivated

---

## 4. Intervention Management

### Intervention Types
| Type | Description | Use Case |
|------|-------------|----------|
| **Preventiva** | Scheduled preventive maintenance | Regular inspections, cleaning |
| **Corretiva** | Corrective repairs | Fix failures and malfunctions |
| **Substituição** | Replacement/Installation | New installations, replacements |
| **Inspeção** | Inspection only | Safety checks, assessments |

### Intervention Workflow
```
Created → Assigned → In Progress → Completed
                  ↓
              Cancelled
```

### Intervention Features
- **Problem & Solution Documentation**: Detailed issue tracking
- **Technician Assignment**: Multiple technicians per job
- **Time Logging**: Work hours with descriptions
- **Cost Tracking**: Total cost per intervention
- **File Attachments**: Documents, photos (before/after), reports
- **Notes & Comments**: Team communication
- **Status History**: Complete status change log

---

## 5. Route Planning & Optimization

### Intelligent Route Planning
| Feature | Description |
|---------|-------------|
| **Starting Point Selection** | Click on map to set departure |
| **Intervention Selection** | Select multiple interventions for route |
| **Route Optimization** | OSRM-powered optimal path calculation |
| **Distance Calculation** | Total kilometers displayed |
| **Time Estimation** | Estimated travel time |
| **Visual Route** | Route drawn on map |

### Benefits
- Reduce travel time between jobs
- Optimize fuel consumption
- Increase daily job completion rate
- Plan efficient multi-stop routes

---

## 6. Advanced Analytics & KPIs

### Key Performance Indicators

| KPI | Description | Formula |
|-----|-------------|---------|
| **MTBF** | Mean Time Between Failures | Total operational time / Number of failures |
| **MTTR** | Mean Time To Repair | Total repair time / Number of repairs |
| **Availability** | System availability percentage | (MTBF / (MTBF + MTTR)) × 100 |
| **Completion Rate** | Intervention completion rate | Completed / Total × 100 |

### Analytics Features
- **Cost Analysis**: Total costs, cost per asset, monthly trends
- **Cost Breakdown**: By intervention type
- **Monthly Trends**: Historical cost and intervention analysis
- **Asset Health**: Distribution by operational status
- **Warranty Tracking**: Expiring and expired warranties
- **Maintenance Alerts**: 7-day maintenance window tracking

---

## 7. Predictive Maintenance

### AI-Powered Predictions
| Feature | Description |
|---------|-------------|
| **Risk Score** | 0-100 calculated risk based on multiple factors |
| **Failure Probability** | Estimated failure chance in next 30 days |
| **Maintenance Prediction** | Days until next recommended maintenance |
| **Priority Levels** | Low, Medium, High, Critical |

### Predictive Features
- High-risk asset identification
- Upcoming maintenance alerts
- Overdue inspection detection
- Asset age analysis
- Replacement recommendations
- Failure pattern analysis

### Failure Pattern Analysis
- Monthly failure patterns (seasonal trends)
- Daily failure patterns (weekday analysis)
- Common issue keyword extraction
- Product-type failure rates

---

## 8. Weather Integration

### Real-Time Weather Data
| Data Point | Description |
|------------|-------------|
| **Current Conditions** | Temperature, humidity, wind, pressure |
| **5-Day Forecast** | Weather prediction for planning |
| **Maintenance Windows** | Identify optimal weather for outdoor work |
| **Safety Alerts** | Wind, rain, temperature warnings |

### Weather Alerts
- 🌬️ High wind speed warnings
- 🌧️ Heavy rain alerts
- 🌡️ Temperature extreme warnings
- ✅ Good maintenance window notifications

---

## 9. Technician Management

### Features
| Feature | Description |
|---------|-------------|
| **Technician Database** | Complete technician registry |
| **Contact Information** | Name, phone, email |
| **Assignment Tracking** | Current and past assignments |
| **Workload Monitoring** | Track technician activity |
| **Status Management** | Active/inactive toggle |

---

## 10. User Management & Security

### Role-Based Access Control
| Role | Permissions |
|------|-------------|
| **Viewer** | Read-only access to assets and maps |
| **Technician** | Create/edit interventions, update assets |
| **Admin** | Full access except system settings |
| **Super Admin** | Complete system control |

### Security Features
- Two-Factor Authentication (2FA)
- Password policies and reset
- Session management
- Audit logging of all actions
- Account lockout protection
- JWT token authentication

---

## 11. Reports & Export

### Report Types
| Report | Content |
|--------|---------|
| **Overview Report** | Summary statistics across all modules |
| **Intervention Report** | Detailed intervention analysis |
| **Asset Distribution** | Asset status breakdown |
| **Technician Report** | Team activity statistics |
| **Cost Report** | Financial analysis |

### Export Options
- CSV export for all data types
- Custom date range filtering
- On-demand report generation
- Scheduled automated reports

---

## 12. Scanner Module

### QR Code & Barcode Support
- Real-time QR code scanning
- Barcode/serial number recognition
- Instant asset lookup
- Quick navigation to scanned asset
- Mobile-optimized interface

---

## 13. Settings & Configuration

### Customization Options
| Setting | Description |
|---------|-------------|
| **Field Configuration** | Customize asset data fields |
| **Field Catalog** | Manage available attributes |
| **Privacy Settings** | Data privacy and retention |
| **Notification Settings** | Alert preferences |
| **Backup Settings** | Automatic backup configuration |
| **Audit Log Viewer** | Review system action logs |

---

## 14. Multi-Tenant Architecture

### Enterprise Features
- Multiple organization support
- Data isolation between tenants
- Custom settings per organization
- Plan-based feature access
- Usage tracking and limits
- Tenant admin panel

---

## 15. Internationalization

### Supported Languages
- 🇵🇹 Portuguese (Portugal)
- 🇬🇧 English
- 🇫🇷 French
- 🇩🇪 German

### Localization Features
- User-selectable language
- Date/time formatting
- Number formatting
- Currency display
- RTL language ready

---

# Technical Specifications

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  TypeScript │ Tailwind CSS │ Leaflet │ Recharts │ i18n │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   REST API (Flask)                       │
│   Authentication │ Authorization │ Business Logic        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Database (SQLite)                     │
│        Assets │ Interventions │ Users │ Tenants          │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Leaflet | Maps |
| Recharts | Charts |
| React Router | Navigation |
| i18next | Internationalization |
| Axios | HTTP Client |

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Runtime |
| Flask | Web Framework |
| SQLite | Database |
| JWT | Authentication |
| Bcrypt | Password Hashing |
| Gunicorn | Production Server |

### Integrations
| Service | Purpose |
|---------|---------|
| OSRM | Route Optimization |
| OpenWeatherMap | Weather Data |
| OpenStreetMap | Map Tiles |

## Deployment

- **Hosting**: Railway (Cloud PaaS)
- **CI/CD**: GitHub Actions
- **SSL**: Automatic HTTPS
- **Scaling**: Horizontal scaling ready

---

# User Roles & Permissions

## Permission Matrix

| Feature | Viewer | Technician | Admin | Super Admin |
|---------|--------|------------|-------|-------------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Assets | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Assets | ❌ | ✅ | ✅ | ✅ |
| Delete Assets | ❌ | ❌ | ✅ | ✅ |
| View Interventions | ✅ | ✅ | ✅ | ✅ |
| Create/Edit Interventions | ❌ | ✅ | ✅ | ✅ |
| Delete Interventions | ❌ | ❌ | ✅ | ✅ |
| View Maps | ✅ | ✅ | ✅ | ✅ |
| Route Planning | ❌ | ✅ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Export Data | ❌ | ✅ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ✅ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ✅ |
| Tenant Management | ❌ | ❌ | ❌ | ✅ |

---

# One-Pager Summary

## SmartLamppost Asset Management System

### What It Is
An intelligent platform for managing urban infrastructure assets with GPS tracking, predictive maintenance, and advanced analytics.

### Key Differentiators

| Feature | Benefit |
|---------|---------|
| 🗺️ **GPS Tracking** | Real-time location of all assets on interactive maps |
| 🔮 **Predictive Maintenance** | AI-powered failure prediction reduces downtime |
| 📊 **Advanced KPIs** | MTBF, MTTR, availability metrics for informed decisions |
| 🛣️ **Route Optimization** | Intelligent route planning saves time and fuel |
| ⛅ **Weather Integration** | Plan maintenance around weather conditions |
| 🔐 **Enterprise Security** | Role-based access, 2FA, full audit trail |
| 🌍 **Multi-Language** | Portuguese, English, French, German |
| 📱 **Mobile Ready** | Responsive design works on any device |

### Core Workflows

```
Asset Registration → GPS Mapping → Status Monitoring
         ↓                              ↓
  Predictive Alerts    ←    Failure Detection
         ↓                              ↓
Intervention Created → Technician Assigned → Route Planned
         ↓                              ↓
   Work Completed    →    Asset Updated   →   KPIs Updated
```

### Target Users
- **Municipalities**: Street lighting, urban furniture management
- **Utilities**: Infrastructure maintenance and tracking
- **Telecom**: Tower and equipment management
- **Transportation**: Traffic systems, signage management

### Quick Stats
- ✅ 26 Core Modules
- ✅ 4 User Roles
- ✅ 5 Asset Statuses
- ✅ 4 Intervention Types
- ✅ 4 Languages
- ✅ Real-time Weather
- ✅ Route Optimization
- ✅ Predictive Analytics

---

## Contact & Demo

**Request a Demo**: Visit our landing page and click "Request Demo"

**Credentials for Demo**:
- URL: https://slp-ams.up.railway.app
- Email: admin@smartlamppost.com
- Password: Admin12345

---

*Document Version: 1.0*
*Last Updated: February 2025*
*© 2025 Smartlamppost. All rights reserved.*
