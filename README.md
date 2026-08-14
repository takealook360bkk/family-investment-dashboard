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
- **Version 3.0**: Initial dashboard structure and core features implementation.

## Security & Privacy
This repository contains the application structure and logic. No private financial data, API keys, or personal credentials should be committed to this repository. All sensitive configuration is handled via environment-specific setup or local configuration files excluded from version control.

---
*Last Updated: August 14, 2026*
