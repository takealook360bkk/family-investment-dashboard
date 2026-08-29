// Main Application Entry Point & Navigation Switcher
// Patch v3.2.1: Clean, bug-free theme state and default light theme

// Global Formatting Helper Utilities
window.formatCurrency = function(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-US');
};

window.formatNumber = function(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize View Router & Tabs
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const viewContainers = document.querySelectorAll('.view-container');

  function switchView(targetViewId) {
    navTabs.forEach(tab => {
      if (tab.getAttribute('data-view') === targetViewId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    viewContainers.forEach(container => {
      if (container.id === targetViewId) {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    });

    // Re-render current view when switched
    renderCurrentView(targetViewId);
  }

  function renderCurrentView(viewId) {
    if (viewId === 'view-overview' && window.OverviewView) {
      window.OverviewView.render();
    } else if (viewId === 'view-allocation' && window.AllocationView) {
      window.AllocationView.render();
    } else if (viewId === 'view-owner' && window.OwnerBreakdownView) {
      window.OwnerBreakdownView.render();
    } else if (viewId === 'view-simulator' && window.SimulatorView) {
      window.SimulatorView.render();
    } else if (viewId === 'view-thai-hub' && window.ThaiHubView) {
      window.ThaiHubView.render();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const viewId = e.currentTarget.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // 1b. Patch v3.2: Theme Toggle Logic (Patch v3.2.1: Default to Light)
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('fip_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('fip_theme', newTheme);
      
      // Notify charts to re-render with new theme colors if needed
      window.AppState.notify('themeChanged', newTheme);
    });
  }

  // 2. Register State Change Listener
  window.AppState.subscribe((event, data) => {
    const activeTab = document.querySelector('.nav-tab-btn.active');
    const activeViewId = activeTab ? activeTab.getAttribute('data-view') : 'view-overview';

    // Show Demo mode notification banner if active
    const demoBanner = document.getElementById('demo-mode-banner');
    if (demoBanner) {
      demoBanner.style.display = window.AppState.isDemoMode ? 'flex' : 'none';
    }

    renderCurrentView(activeViewId);
  });

  // 3. Initialize View Controllers
  if (window.OverviewView) window.OverviewView.init();
  if (window.AllocationView) window.AllocationView.init();
  if (window.OwnerBreakdownView) window.OwnerBreakdownView.init();
  if (window.SimulatorView) window.SimulatorView.init();
  if (window.ThaiHubView) window.ThaiHubView.init();

  // 4. Initialize Auth & API Services
  if (window.AuthService) window.AuthService.init();

  // 5. Load Initial Data (Real API or Demo Fallback)
  if (window.ApiService) {
    window.ApiService.fetchAllData();
  } else {
    const mock = window.generateMockData();
    window.AppState.setData({ ...mock, isDemo: true });
  }

  // 6. Bind Login / Logout buttons
  const loginBtn = document.getElementById('btn-google-login');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (window.AuthService) window.AuthService.login();
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.AuthService) window.AuthService.logout();
    });
  }

  // Patch v3.2.1: Initialize theme from localStorage on load (default to light)
  const savedTheme = localStorage.getItem('fip_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
});
