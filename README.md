# Family Investment Dashboard

A comprehensive asset management system and interactive dashboard for family wealth tracking. This system monitors growth, analyzes performance across various asset classes, and simulates retirement scenarios.

## Project Overview
The project is built around a hybrid architecture using Google Sheets as the primary data engine and a modern web frontend for visualization.

- **Data Engine**: Powered by Google Sheets for transaction inputs and real-time valuations.
- **Price Engine**: Automated price fetching via Google Apps Script (SEC Thailand, Yahoo Finance).
- **Backend API**: Secure REST API built with Google Apps Script for data delivery to the frontend.
- **Frontend**: A responsive Single Page Application (SPA) featuring:
    - Overview Dashboard
    - Asset Allocation Analysis
    - Owner Breakdown (PP & JJ)
    - Financial Independence (FIRE) Simulator

## Directory Structure
```
/
├── dashboard/              # Web Frontend Source Code
│   ├── index.html          # Main SPA Entry Point
│   ├── css/                # Stylesheets (Glassmorphism design)
│   └── js/                 # JavaScript Logic
│       ├── views/          # Specific Dashboard View Logic
│       ├── api.js          # API Communication Layer
│       ├── app.js          # Main Application Controller
│       ├── auth.js         # Google OAuth Logic
│       ├── config.js       # Dashboard Configurations
│       └── state.js        # Frontend State Management
└── .gitignore              # Git ignore file
```

## Tech Stack
- **Languages**: JavaScript (ES6+), HTML5, CSS3.
- **Visualization**: Chart.js.
- **Backend**: Google Sheets, Google Apps Script.
- **Security**: Google Identity Services (OAuth 2.0).

## Version Log
- **Version 3.2.3**: Accounting Logic Fix & True Principal Cost Tracking (`Net_Capital_Deposit` & `Net_Gain`).
  - Separated external net cash injected (`Net_Capital_Deposit`) from compounded gains (`Cost_Current_Asset`) to resolve reinvestment calculation distortion.
  - **View 1 (Overview)**:
    - Updated *Capital Deposited* KPI to use `Net_Capital_Deposit` (reflecting true principal).
    - Updated *Wealth Growth History* chart dashed line to track `Total_Net_Capital_Deposit` (solid line remains `Total_Ondate_Amount`).
  - **View 3 (Owner Race)**:
    - Replaced *Unrealized P&L* card metric with *Net Gain* (`PP_Net_Gain` and `JJ_Net_Gain` = Unrealized + Realized + Dividends).
    - Updated *Capital Deposited* card metric to `PP_Net_Capital_Deposit` and `JJ_Net_Capital_Deposit`.
    - Updated *PP vs JJ Growth Race* chart dashed lines to track `PP_Net_Capital_Deposit` and `JJ_Net_Capital_Deposit` respectively (solid lines remain `Ondate_Amount`).
  - **API & Data Engine**:
    - Expanded API normalization layer for 26-column schema (`Daily Snapshort_V3`) and `Master_Asset` summary matrix (Q3:V5).
    - Synced demo mock data generators and documentation files across `/docs`.
- **Version 3.2.2**: UI/UX Contrast enhancements, theme toggle redesign, and interactive component fixes.
  - Replaced theme toggle icons with clean minimalist SVGs and standardized height matching the Sign In button.
  - Fixed Google Auth button and user badge border radius (8px) and ensured black text visibility for user email in Light theme.
  - Fixed filter button jumping layout shift by enforcing static dimensions with seamless hover state.
  - Resolved missing/washed-out text across Light mode views (headers, parameter cards, table cells).
  - Enhanced Pie chart layout with 5-6px inset padding to prevent hover clipping, and dynamic slice border colors.
  - Added 80% opacity with backdrop blur on sticky Holdings summary row for both Light and Dark themes.
  - Refined PP (deep blue) and JJ (deep amber) color palettes in Owner Race and Simulator views.
- **Version 3.2.1**: UI Refinements, theme stabilization, and layout optimizations.
  - Standardized Light/Dark theme variables with enhanced contrast.
  - Replaced theme toggle with a monochrome sleek grayscale design.
  - Optimized KPI headers with start-aligned icons for better readability.
  - Enhanced Owner Race view with custom badges and optimized subgrid layouts.
  - Fixed sticky header overlap and renamed summary labels in the Holdings table.
  - Implemented persistent theme state defaulting to Light mode.
- **Version 3.2**: Dual-theme support, UI modernization, and independent view states.
  - Implemented Light & Dark Mode system with a global theme switcher.
  - Relocated Holdings table summary row to the top for better visibility.
  - Modernized Owner Breakdown toggle controls with segmented UI and micro-interactions.
  - Isolated filter states between views to prevent global state conflicts.
  - Standardized code documentation with Version 3.2 Patch annotations.
- **Version 3.1**: UI bug fixes, default parameter updates, and API latency optimization.
  - Scaled down demo mode mock data to realistic ~1M THB portfolio base.
  - Fixed mobile overflow for retirement year selector.
  - Added dynamic footer summary row for Holdings table with auto-calculating totals.
  - Updated default FIRE target metrics and retirement simulator parameters.
  - Implemented timestamp cache busters and `no-store` fetch options for real-time data accuracy.
- **Version 3.0**: Initial dashboard structure and core features implementation.

## Security & Privacy
This repository contains the application structure and logic. No private financial data, API keys, or personal credentials should be committed to this repository. All sensitive configuration is handled via environment-specific setup or local configuration files excluded from version control.

---
*Last Updated: August 18, 2026*
