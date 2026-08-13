// Google Identity Services (GIS) Login & Security Handler

window.AuthService = {
  tokenClient: null,
  
  init() {
    this.checkStoredAuth();
    this.setupGIS();
  },

  checkStoredAuth() {
    const savedToken = localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const savedUser = localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.USER_INFO);
    
    if (savedToken && savedUser) {
      try {
        const userInfo = JSON.parse(savedUser);
        window.AppState.user = userInfo;
        window.AppState.token = savedToken;
        window.AppState.isLoggedIn = true;
        this.updateAuthUI(true, userInfo);
        // IMPORTANT: Token is restored from localStorage — mark as ready for API fetch
        // app.js will call ApiService.fetchAllData() after init() which will use this token
        console.info('Restored auth session from localStorage for:', userInfo.email);
      } catch (e) {
        console.error('Failed to parse saved user', e);
        this.logout();
      }
    }
  },

  setupGIS() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      console.warn('Google Identity Services library not loaded yet');
      return false;
    }

    const clientId = window.APP_CONFIG.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID') || clientId.trim() === '') {
      console.info('Google Client ID not configured. Operating in Demo / Token Input Mode.');
      return false;
    }

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: (response) => this.handleTokenResponse(response)
      });
      return true;
    } catch (e) {
      console.error('Failed to initialize Google Token Client:', e);
      return false;
    }
  },

  login() {
    // Retry setupGIS if it wasn't ready during initial page load
    if (!this.tokenClient) {
      this.setupGIS();
    }

    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
      // Fallback popup ONLY if Client ID is missing
      const userToken = prompt('🔑 เพื่อทดสอบเชื่อมต่อข้อมูลจริงจาก Apps Script API:\n\nโปรดใส่ Google OAuth Access Token ของคุณ:');
      if (userToken && userToken.trim() !== '') {
        this.verifyAndSetToken(userToken.trim());
      }
    }
  },

  async verifyAndSetToken(accessToken) {
    window.AppState.token = accessToken;
    window.AppState.isLoggedIn = true;

    // Fetch user profile from Google to check email
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      let userInfo = { email: 'Authorized User', name: 'Family Owner' };
      if (res.ok) {
        userInfo = await res.json();
      }

      if (userInfo.email && !this.isEmailAllowed(userInfo.email) && userInfo.email !== 'Authorized User') {
        alert(`Access Denied: Email (${userInfo.email}) is not authorized.`);
        this.logout();
        return;
      }

      window.AppState.user = userInfo;
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, accessToken);
      localStorage.setItem(window.APP_CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));

      this.updateAuthUI(true, userInfo);

      // Fetch live data with token
      if (window.ApiService) {
        window.ApiService.fetchAllData();
      }
    } catch (err) {
      console.warn('Could not verify profile with Google API, attempting API fetch directly...', err);
      if (window.ApiService) {
        window.ApiService.fetchAllData();
      }
    }
  },

  async handleTokenResponse(response) {
    if (response.error) {
      console.error('Login error:', response.error);
      alert('Google Sign-in Error: ' + response.error);
      return;
    }

    const accessToken = response.access_token;
    await this.verifyAndSetToken(accessToken);
  },

  isEmailAllowed(email) {
    if (!email) return false;
    const allowed = window.APP_CONFIG.ALLOWED_EMAILS || [];
    return allowed.map(e => e.toLowerCase()).includes(email.toLowerCase());
  },

  logout() {
    window.AppState.user = null;
    window.AppState.token = null;
    window.AppState.isLoggedIn = false;

    localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.USER_INFO);

    this.updateAuthUI(false, null);
    
    // Switch back to Demo Mode
    const mock = window.generateMockData();
    window.AppState.setData({ ...mock, isDemo: true });
  },

  updateAuthUI(isLoggedIn, user) {
    const loginBtn = document.getElementById('btn-google-login');
    const userBadge = document.getElementById('user-profile-badge');
    const userEmailSpan = document.getElementById('user-email-display');
    const userAvatarImg = document.getElementById('user-avatar-img');

    if (isLoggedIn && user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (userBadge) userBadge.style.display = 'flex';
      if (userEmailSpan) userEmailSpan.textContent = user.email || user.name;
      if (userAvatarImg) userAvatarImg.src = user.picture || 'https://lh3.googleusercontent.com/a/default-user=s96-c';
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (userBadge) userBadge.style.display = 'none';
    }
  }
};
