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
- **Version 3.4.2** *(September 1, 2026)*: View 5 Thai Stock Hub — Unrealized P&L % Precision Bug Fix & Historical Net Gain Column Integration.
  - **Unrealized P&L % Bug Fix**: Resolved decimal ratio scaling bug in View 5 table where percentages were rendered without scale conversion (displaying 100x smaller, e.g. +0.01% instead of +1.24%). All `% Unrealized P&L` values are now accurately computed directly against total cost or scaled from API data.
  - **Historical Net Gain & Net Gain % Column**: Added dedicated "Net Gain" column placed immediately to the right of Unrealized P&L in both PP and JJ Thai Stock Holdings tables (stacked 2-row layout with amount in ฿ and percentage in %, color-coded by positive/negative profit).
  - **Table Summary Aggregation**: Added Historical Net Gain totals in sticky summary header rows (`Total PP` and `Total JJ`).
  - **Interactive Sorting**: Added column sorting support for `historical_net_gain` across both dual tables.

- **Version 3.4.1** *(August 30, 2026)*: View 5 Thai Stock Hub — Visual Overhaul, Monotone Pie Charts, Dual-Table Sort, and Light Theme Restoration.
  - **Demo Data Privacy**: Replaced all Thai stock demo data in `state.js` with anonymized, randomized SET tickers (`MC`, `FTREIT`, `ICHI`, `KCG`, `BDMS`, `TISCO`, `KJL`, `HTC`, `SABINA`, etc.) and reduced total portfolio valuation to ~฿488K to prevent information leakage.
  - **Card Header Cleanup**: Removed all emoji icons from all Card headers in View 5 for a cleaner, professional typographic look.
  - **Card 1.1 (Thai Stock Amount) Restructure**: Streamlined to left/right split layout — Market Value (฿) large left block (emerald) + 3 compact right sub-boxes: Real Capital, Cost Amount, Total Net Gain. Removed the Portfolio Total badge and outer blue border.
  - **Card 1.2 (Annual Dividend Yield) Restructure**: Streamlined to left/right split — Expected Dividend (฿) large left block (emerald) + 2 compact right sub-boxes: YoC % (emerald) and Market Yield (neutral). Removed description text and orange outer border.
  - **Card 2.1 & 2.2 (PP & JJ Owner Hub) Restructure**: Market Value occupies left 50%; right 50% shows Cost Amount and Exp. Div/Yr. Pie chart sized equally for both sides.
  - **Monotone Pie Chart Color Palettes**: Replaced multi-hue rainbow pie slices with cohesive monotone palettes — PP uses Shades of Blue/Cyan (`#0284C7` → `#1E3A8A`); JJ uses Shades of Amber/Bronze/Warm Gold (`#D97706` → `#713F12`).
  - **Pie Chart Tooltip Layer Fix**: Changed in-slice ticker label drawing from `afterDraw` to `afterDatasetsDraw` hook, ensuring Chart.js renders hover tooltips above canvas text at all times.
  - **Dual Holdings Tables (PP & JJ)**: Split single combined table into two independent tables — PP Thai Stock Holdings and JJ Thai Stock Holdings — each with their own sticky Summary Row (Row Sum) showing Qty, Market Value, Unrealized P&L, Exp. Div/Yr, YoC %, and Mkt Yield %.
  - **Table Typography Fix**: Replaced all `font-mono` / `ui-monospace` table cell fonts with `Inter` (same as View 2 Holdings at 12px/16px).
  - **Table Default Sort (A–Z)**: Both PP and JJ tables default to sorting by Stock Symbol alphabetically (A → Z) on first render.
  - **Interactive Table Header Sorting**: All 12 table columns support click-to-sort with directional indicators (`▲ / ▼ / ⇅`). Text columns toggle A→Z / Z→A; numeric columns toggle largest-first / smallest-first.
  - **Table Text Color System**:
    - Dark Theme: Stock symbols, prices, Market Value → White (`#F8FAFC`); Qty, Avg Cost → White (`#F8FAFC`).
    - Light Theme: Stock symbols, prices, Market Value → Black (`#0F172A`); Qty, Avg Cost → Dark gray (`#334155`).
    - Table header `<th>` forced to white (`#F8FAFC`, `font-weight: 700`) in both themes for legibility.
  - **Dividend Simulator (Zone 5) Overhaul**:
    - Converted all parameter controls from range sliders to typed `<input>` fields for precision.
    - Removed Capital Appreciation parameter; simulator now models growth exclusively from Dividend Reinvestment (DRIP) + Step-up DCA compounding, reflecting real-world dividend portfolio behavior.
    - Added Step-up DCA (% per year) parameter.
    - Changed chart Legend style from color boxes to line indicators (`pointStyle: 'line'`).
    - Added "Reset to Current Portfolio" button.
  - **Light Theme Comprehensive Restoration**:
    - `.th-kpi-subbox` CSS class replaces hardcoded `bg-slate-900/50` on all sub-boxes in Cards 1.1, 1.2, 2.1, 2.2 — Light Theme: `#F8FAFC` background, `#E2E8F0` border; Dark Theme: glass dark.
    - `.th-chart-box` class for Pie Chart containers — Light Theme: off-white; Dark Theme: dark translucent.
    - PP accent in Light Theme: Deep Blue `#0369A1`; JJ accent: Deep Amber `#B45309`; Dividend/Gain color: Deep Emerald `#047857`.
    - "รีเซ็ตค่าพอร์ตปัจจุบัน" button in Light Theme: Deep Blue `#0369A1`.
    - DRIP Reinvest label locked to Emerald `#10B981` in both themes via `.th-drip-label` class.
  - **Scoped Edit Verification**: `git diff` confirmed all changes are strictly within `<section id="view-thai-hub">`, `dashboard/js/views/thai_hub.js`, `dashboard/js/state.js`, and `dashboard/css/styles.css`. Views 1, 2, 3, and 4 remain 100% unmodified.

- **Version 3.4.0** *(August 18, 2026)*: View 5 Thai Stock Hub & Dividend / DRIP Wealth Simulator with 2-Way Live Sync & Real Capital Cost Basis.
  - **View 5 (Thai Stock Hub & Dividend Simulator)**:
    - **Zone 1 (Hero KPIs)**: Valuation & Profitability Matrix (Market Value, Real Capital Cost Basis, Total Net Gain & %, Book Cost, Unrealized P&L) and Annual Dividend & Yield Engine (Expected Dividend / Mo / Yr, YoC % based on Real Capital, Market Yield %).
    - **Zone 2 & 3 (Owner Hubs & Dividend Contribution Donut Charts)**: Dedicated PP and JJ sub-hubs with individual Real Capital Cost Basis, Net Gains, and Chart.js Doughnut visualizations (`Chart 3.1` & `Chart 3.2`) breaking down dividend contribution by ticker.
    - **Zone 4 (Strategic Holdings Table with 2-Way Live Sync)**: 13-column interactive table supporting owner filtering (`All`, `PP`, `JJ`), live Expected DPS inline input with 500ms debounce + optimistic UI recalculations, Consensus rating dropdown pills (🟢 Buy / 🟡 Hold / 🔴 Sell), Company Performance dropdowns (5 tiers), and real-time Google Sheet sync indicator (🔄 Syncing / 🟢 Saved / 🔴 Error).
    - **Zone 5 (DRIP Wealth Retirement Simulator)**: Interactive snowball growth engine with parameter sliders (Monthly DCA, Retirement Age, Dividend Growth %, Capital Growth %) and dynamic multi-axis trajectory chart (`Chart 5.1`) comparing Projected Portfolio, Cumulative Capital, and Annual Dividend.
  - **Backend & Data Pipeline (`api_code.js` & `THStock_Master_V3`)**:
    - Introduced `THStock_Master_V3` side-by-side sheet layout with `Col X` (`Real Capital Cost Basis` = Total Cost - Historical Net Gain).
    - Added `?action=thai_stocks` route in `doGet` and `action=update_thai_stock` handler in `doPost` for secure row-level updates based on `account` + `symbol`.
    - Added Thai stock normalization layer and `ApiService.updateThaiStock()` in frontend.
- **Version 3.3.1**: Savings Inflow Time Range Synchronization, Yearly/Monthly Granularity Toggle, Dynamic Color Scaling, and Light Theme Filter Button Contrast Fix.
  - **View 1 (Overview)**:
    - **Synchronized Time Range**: Savings Inflow bar chart is now dynamically synchronized and horizontally aligned with the Wealth Growth History line chart above (`ALL` starting from Dec 2016 inception, `5Y`, `3Y`, `1Y`).
    - **Yearly / Monthly Granularity Toggle**: Added an interactive segmented switch (`Monthly` vs `Yearly`) allowing users to switch between monthly inflow tracking and cumulative annual savings sums per calendar year.
    - **Dynamic Value Color Scale**: Implemented dynamic bar coloring where higher positive savings scale up into vibrant deep emerald (`#10b981`), while negative net inflows (capital withdrawals) scale into rose/red (`#f43f5e`) for rapid visual assessment.
  - **Design System & Contrast Enhancement**:
    - **Light Theme Filter Button Legibility Fix**: Enhanced inactive Time Range and segmented filter buttons (`chart-range-btn`, `roi-btn`, `owner-filter-btn`, `alloc-owner-btn`) in Light Theme with high-contrast off-white text (`#D1D5DB`) and pure white hover state (`#FFFFFF` with `rgba(255, 255, 255, 0.15)` backdrop), resolving low contrast on dark slate pill containers without altering Dark Theme.
- **Version 3.3.0**: Asset Class Historical Stacked Area Chart, View 2 Restructuring, and Table Sticky Header Overlap Bug Fix.
  - **View 2 (Allocation & Holdings)**:
    - **View 2.1**: *Asset Class Allocation* (Donut chart showing current snapshot portfolio distribution).
    - **View 2.2**: *Asset Class Allocation History (วิวัฒนาการสัดส่วนสินทรัพย์ตามกาลเวลา)* - Introduced a high-contrast Stacked Area Chart visualizing historical growth and asset class evolution from inception to present across 9 asset classes (`THSTOCK`, `USAFUND`, `GOLD`, `GOLDFUND`, `ASIAFUND`, `CHIFUND`, `SEMIFUND`, `BOND`, `FCD`) with interactive time range buttons (`1Y`, `3Y`, `5Y`, `ALL`).
    - **View 2.3**: *Asset Performance & Holdings* - Reordered to the 3rd section and resolved the sticky table header overlap bug by integrating the `Total` summary row directly into `<thead>`. Header titles and Total sum now freeze seamlessly at the top in order (`Header -> Total Sum -> Asset Rows`) during vertical table scrolling.
    - **Unified Design System & Palette**: Synchronized color palette across Donut chart slices, Stacked Area layers, badges, and table indicators.
  - **API & Data Engine**:
    - Expanded `handleSnapshot` in `api_code.js` and `api.js` normalization layer to ingest columns `AA:AI` (indices 26-34) from `Daily Snapshort_V3`.
    - Updated offline demo mock data generator in `state.js` to simulate realistic historical asset class breakdowns across all 116 snapshot months.
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
*Last Updated: August 30, 2026 (v3.4.1)*
