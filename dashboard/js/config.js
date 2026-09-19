// Family Investment Portfolio Dashboard - Configuration
window.APP_CONFIG = {
  // Google Apps Script Web App Deployment URL
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbytDT_dcFl-HgPqbPVk_Utogh0HisdKEj9ViCKCeQy0PowUSPvJDUrbRWTBBOEdP9OHNA/exec',
  
  // Google Identity Services Client ID
  GOOGLE_CLIENT_ID: '959636783979-gokjb8qgt5g270087jag34vdlnvdlb41.apps.googleusercontent.com',

  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'family_portfolio_auth_token',
    USER_INFO: 'family_portfolio_user_info',
    RETIREMENT_PARAMS: 'family_portfolio_retire_params'
  },

  // Timeout Configurations (milliseconds)
  // รองรับ Cold Start ของ Google Apps Script และการคำนวณใน Google Sheets
  FETCH_TIMEOUT_MS: 60000, // 60 วินาที สำหรับดึงข้อมูลพอร์ต
  SYNC_TIMEOUT_MS: 30000   // 30 วินาที สำหรับ 2-Way Sync อัปเดตหุ้น
};

