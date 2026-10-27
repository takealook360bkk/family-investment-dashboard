// Main Application Entry Point & Navigation Switcher
// Patch v3.6.5: PC Collapsible Left Sidebar (Pixel-Locked Icons), Smart Scroll-Up Mobile Topbar & Responsive Resize

// Global Formatting Helper Utilities
window.formatCurrency = function(val) {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Math.round(val).toLocaleString('en-US');
};

window.formatNumber = function(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// ฟังก์ชันแปลงอักขระพิเศษ (HTML Entity Escaping) เพื่อป้องกัน Stored/DOM XSS
window.escapeHtml = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// แผนที่ชื่อเมนูสำหรับแสดงผลบน Mobile Topbar ให้ตรงกับหน้าที่เลือก
const VIEW_TITLE_MAP = {
  'view-overview': 'Overview',
  'view-allocation': 'Allocation & Holdings',
  'view-owner': 'Owner Race (PP vs JJ)',
  'view-simulator': 'Retirement Simulator',
  'view-thai-hub': 'Thai Stock Hub'
};

// ตัวแปรป้องกันการกดซ้ำซ้อน (Debounce Timestamp)
let _lastDrawerToggleTs = 0;
let _lastThemeToggleTs = 0;
let _lastDesktopCollapseTs = 0;

// ฟังก์ชันสั่งให้กราฟ Chart.js ทั้งหมดคำนวณขนาดพื้นที่วาดใหม่หลังเปลี่ยนความกว้างหน้าจอหรือหด Sidebar
window.resizeAllCharts = function() {
  if (window.Chart && window.Chart.instances) {
    Object.values(window.Chart.instances).forEach(chart => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }
};

// ฟังก์ชันอัปเดตชื่อหน้าปัจจุบันบนแถบด้านบนของ Mobile
window.updateMobileHeaderTitle = function(viewId) {
  const titleText = VIEW_TITLE_MAP[viewId] || 'Overview';
  const mobileTitleEl = document.getElementById('mobile-active-view-title');
  if (mobileTitleEl) {
    mobileTitleEl.textContent = titleText;
  }
};

// ฟังก์ชันเปิดเมนู Drawer ด้านข้างสำหรับ Mobile
window.openMobileDrawer = function() {
  const sidebarEl = document.getElementById('app-sidebar');
  const backdropEl = document.getElementById('mobile-drawer-backdrop');
  const topbarEl = document.getElementById('mobile-topbar');
  topbarEl?.classList.remove('topbar-hidden');
  sidebarEl?.classList.add('open');
  backdropEl?.classList.add('active');
  document.body.classList.add('overflow-hidden-mobile');
};

// ฟังก์ชันปิดเมนู Drawer ด้านข้างสำหรับ Mobile
window.closeMobileDrawer = function(e) {
  if (e) {
    e.preventDefault?.();
    e.stopPropagation?.();
  }
  const sidebarEl = document.getElementById('app-sidebar');
  const backdropEl = document.getElementById('mobile-drawer-backdrop');
  sidebarEl?.classList.remove('open');
  backdropEl?.classList.remove('active');
  document.body.classList.remove('overflow-hidden-mobile');
};

// ฟังก์ชันสลับเปิด/ปิดเมนู Hamburger บน Mobile พร้อมป้องกัน Event ซ้อน
window.toggleMobileDrawer = function(e) {
  if (e) {
    e.preventDefault?.();
    e.stopPropagation?.();
  }
  const now = Date.now();
  if (now - _lastDrawerToggleTs < 250) return;
  _lastDrawerToggleTs = now;

  const sidebarEl = document.getElementById('app-sidebar');
  if (sidebarEl?.classList.contains('open')) {
    window.closeMobileDrawer();
  } else {
    window.openMobileDrawer();
  }
};

// ฟังก์ชันย่อ/ขยายแถบเมนูด้านซ้ายสำหรับหน้าจอ PC เท่านั้น (>= 1024px)
// โดยคงพิกัด (X, Y) และความสูงของไอคอนแต่ละเมนูไว้ที่ตำแหน่งเดิมทุกประการ
window.toggleDesktopSidebar = function(e) {
  if (e) {
    e.preventDefault?.();
    e.stopPropagation?.();
  }
  const now = Date.now();
  if (now - _lastDesktopCollapseTs < 200) return;
  _lastDesktopCollapseTs = now;

  const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('fip_sidebar_collapsed', isCollapsed ? 'true' : 'false');

  // ปรับขนาดกราฟระหว่างและหลังจบ Transition ของ Sidebar (200ms)
  setTimeout(window.resizeAllCharts, 60);
  setTimeout(window.resizeAllCharts, 220);
};

// ฟังก์ชันสลับโหมดสี Light / Dark ทั้งบน PC และ Mobile
window.toggleAppTheme = function(e) {
  if (e) {
    e.preventDefault?.();
    e.stopPropagation?.();
  }
  const now = Date.now();
  if (now - _lastThemeToggleTs < 250) return;
  _lastThemeToggleTs = now;

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('fip_theme', newTheme);
  if (window.AppState) {
    window.AppState.notify('themeChanged', newTheme);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // 0. กู้คืนสถานะการหด/ขยาย Sidebar บน PC จาก localStorage
  if (localStorage.getItem('fip_sidebar_collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }

  // 1. Initialize View Router & Tabs
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const viewContainers = document.querySelectorAll('.view-container');

  const mobileToggleBtn = document.getElementById('btn-mobile-menu-toggle');
  const sidebarCloseBtn = document.getElementById('btn-sidebar-close');
  const desktopCollapseBtn = document.getElementById('btn-sidebar-collapse');
  const backdropEl = document.getElementById('mobile-drawer-backdrop');
  const mobileTopbarEl = document.getElementById('mobile-topbar');

  mobileToggleBtn?.addEventListener('click', window.toggleMobileDrawer);
  sidebarCloseBtn?.addEventListener('click', window.closeMobileDrawer);
  desktopCollapseBtn?.addEventListener('click', window.toggleDesktopSidebar);
  backdropEl?.addEventListener('click', window.closeMobileDrawer);

  // ระบบ Smart Scroll-Up Reveal สำหรับแถบเมนูด้านบนในโหมด Mobile:
  // - เมื่อเลื่อนหน้าจอลง (Scroll Down) เกิน 70px แถบจะซ่อนขึ้นด้านบนเพื่อเปิดพื้นที่ดูข้อมูลเต็มจอ
  // - เมื่อรูดนิ้วลง / เลื่อนหน้าจอขึ้น (Scroll Up) แม้เพียงเล็กน้อย แถบเมนูจะสไลด์ลงมาแสดงทันทีโดยไม่ต้องเลื่อนกลับไปบนสุด
  let lastScrollY = window.scrollY || 0;
  let scrollTicking = false;

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
        const deltaY = currentScrollY - lastScrollY;
        const sidebarEl = document.getElementById('app-sidebar');
        const isDrawerOpen = sidebarEl?.classList.contains('open');

        if (mobileTopbarEl) {
          // เพิ่มเงาเมื่อเลื่อนลงมาจากขอบบนสุด
          if (currentScrollY > 12) {
            mobileTopbarEl.classList.add('topbar-scrolled');
          } else {
            mobileTopbarEl.classList.remove('topbar-scrolled');
          }

          // ถ้ารูดนิ้วเลื่อนขึ้น (deltaY < -4) หรืออยู่ใกล้ขอบบนสุด หรือเปิดเมนูค้างไว้ -> แสดงแถบเมนูทันที
          if (currentScrollY <= 60 || deltaY < -4 || isDrawerOpen) {
            mobileTopbarEl.classList.remove('topbar-hidden');
          } else if (deltaY > 8 && currentScrollY > 75) {
            // ถ้าเลื่อนลงต่อเนื่อง -> ซ่อนแถบเมนูชั่วคราวเพื่อให้เห็นตาราง/กราฟเต็มตา
            mobileTopbarEl.classList.add('topbar-hidden');
          }
        }

        lastScrollY = currentScrollY;
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

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

  function switchView(targetViewId) {
    if (!targetViewId) return;

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

    // อัปเดตชื่อ View ปัจจุบันบน Mobile Topbar ทันทีที่เปลี่ยนหน้า
    window.updateMobileHeaderTitle(targetViewId);

    // ปิดเมนู Drawer อัตโนมัติหลังเลือกหน้า และแสดงแถบ Topbar เสมอ
    window.closeMobileDrawer();
    mobileTopbarEl?.classList.remove('topbar-hidden');

    // วาดข้อมูลและกราฟของหน้าที่เลือกใหม่
    renderCurrentView(targetViewId);
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const viewId = e.currentTarget.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // 1b. Theme Toggle Buttons (Desktop Sidebar & Mobile Topbar)
  const themeBtnDesktop = document.getElementById('btn-theme-toggle');
  const themeBtnMobile  = document.getElementById('btn-theme-toggle-mobile');

  themeBtnDesktop?.addEventListener('click', window.toggleAppTheme);
  themeBtnMobile?.addEventListener('click', window.toggleAppTheme);

  // 1c. Responsive Resize Handler: บังคับให้ Chart.js ปรับขนาดตามหน้าจอเมื่อย่อ/ขยายระหว่าง PC กับ Mobile
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(window.resizeAllCharts, 120);
  });

  // 2. Register State Change Listener
  window.AppState.subscribe((event, data) => {
    const activeTab = document.querySelector('.nav-tab-btn.active');
    const activeViewId = activeTab ? activeTab.getAttribute('data-view') : 'view-overview';

    // ซิงค์ชื่อหน้าบน Mobile Header ให้ตรงกับ Tab ที่ Active เสมอ
    window.updateMobileHeaderTitle(activeViewId);

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

  // Initialize theme from localStorage on load (default to light)
  const savedTheme = localStorage.getItem('fip_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Sync initial mobile active view title on startup
  const initialActiveTab = document.querySelector('.nav-tab-btn.active');
  window.updateMobileHeaderTitle(initialActiveTab ? initialActiveTab.getAttribute('data-view') : 'view-overview');
});
