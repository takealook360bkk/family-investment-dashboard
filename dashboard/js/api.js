// Data API Service for Family Investment Portfolio

window.ApiService = {
  async fetchAllData() {
    const baseUrl = window.APP_CONFIG.API_BASE_URL;
    const token = window.AppState.token;

    // Check if API endpoint is valid
    if (!baseUrl || baseUrl.includes('YOUR_SCRIPT_ID') || baseUrl === '') {
      console.info('API_BASE_URL not configured. Loading realistic demo data.');
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
      return;
    }

    // If no token at all, go demo immediately (no alert needed)
    if (!token) {
      console.info('No auth token. Loading demo data.');
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
      return;
    }

    // Show loading state
    this.showLoading(true);

    try {
      const authParam = `&access_token=${encodeURIComponent(token)}`;

      const [summaryRes, assetsRes, snapshotRes] = await Promise.all([
        fetch(`${baseUrl}?action=summary${authParam}`).then(r => r.json()),
        fetch(`${baseUrl}?action=assets${authParam}`).then(r => r.json()),
        fetch(`${baseUrl}?action=snapshot${authParam}`).then(r => r.json())
      ]);

      // Log raw responses for debugging
      console.log('[API] summary raw:', summaryRes);
      console.log('[API] assets count:', Array.isArray(assetsRes.data) ? assetsRes.data.length : 'N/A');
      console.log('[API] snapshot count:', Array.isArray(snapshotRes.data) ? snapshotRes.data.length : 'N/A');

      // Check for authorization / token errors
      const anyError = summaryRes.error || assetsRes.error || snapshotRes.error;
      if (anyError) {
        const errMsg = typeof anyError === 'string' ? anyError : JSON.stringify(anyError);
        console.warn('[API] Error response:', errMsg);

        // If token expired → clear session, force re-login, show clear message
        if (errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('invalid')) {
          console.warn('[API] Token appears expired. Clearing session...');
          // Clear bad token
          localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(window.APP_CONFIG.STORAGE_KEYS.USER_INFO);
          window.AppState.token = null;
          window.AppState.isLoggedIn = false;

          // Update UI to show login button again
          if (window.AuthService) window.AuthService.updateAuthUI(false, null);

          // Show user-friendly message
          alert('⚠️ Session หมดอายุ: กรุณากด "Sign in with Google" อีกครั้งเพื่อดึงข้อมูลจริงจาก Google Sheet ครับ');
        } else {
          alert('[API Error] ' + errMsg);
        }

        const mock = window.generateMockData();
        window.AppState.setData({ ...mock, isDemo: true });
        return;
      }

      // ---- Data Normalization ----
      const rawSummary = summaryRes.data || summaryRes;
      const rawAssets = Array.isArray(assetsRes.data) ? assetsRes.data : (Array.isArray(assetsRes) ? assetsRes : []);
      const rawSnapshot = Array.isArray(snapshotRes.data) ? snapshotRes.data : (Array.isArray(snapshotRes) ? snapshotRes : []);

      if (rawSnapshot.length === 0 || rawAssets.length === 0) {
        console.warn('[API] Empty data returned. Falling back to demo.');
        const mock = window.generateMockData();
        window.AppState.setData({ ...mock, isDemo: true });
        return;
      }

      // Normalize summary (Master_Asset Q3:T5)
      const normalizedSummary = {
        total: {
          cost:          Number(rawSummary.total?.cost_amount   || rawSummary.total?.cost          || 0),
          market_value:  Number(rawSummary.total?.ondate_amount || rawSummary.total?.market_value  || 0),
          unrealized_pl: Number(rawSummary.total?.unrealized_pl || 0),
          realized_pl:   Number(rawSummary.total?.realized_pl   || 0),
        },
        pp: {
          cost:          Number(rawSummary.pp?.cost_amount   || rawSummary.pp?.cost          || 0),
          market_value:  Number(rawSummary.pp?.ondate_amount || rawSummary.pp?.market_value  || 0),
          unrealized_pl: Number(rawSummary.pp?.unrealized_pl || 0),
          realized_pl:   Number(rawSummary.pp?.realized_pl   || 0),
        },
        jj: {
          cost:          Number(rawSummary.jj?.cost_amount   || rawSummary.jj?.cost          || 0),
          market_value:  Number(rawSummary.jj?.ondate_amount || rawSummary.jj?.market_value  || 0),
          unrealized_pl: Number(rawSummary.jj?.unrealized_pl || 0),
          realized_pl:   Number(rawSummary.jj?.realized_pl   || 0),
        }
      };

      // Normalize assets (Master_Asset)
      const normalizedAssets = rawAssets.map((a, i) => {
        const acc = (a.account || '').toUpperCase();
        let owner = 'PP';
        if (acc.startsWith('JJ')) owner = 'JJ';
        else if (acc.startsWith('PP')) owner = 'PP';

        const units      = Number(a.unit || a.units || 0);
        const costAmt    = Number(a.cost_amount || a.total_cost || 0);
        const ondateAmt  = Number(a.ondate_amount || a.market_value || 0);
        const priceUnit  = Number(a.price_per_unit || a.current_price || 0);
        const avgCostPer = units > 0 ? costAmt / units : 0;

        const unpl = Number(a.unrealized_pl !== undefined && a.unrealized_pl !== null ? a.unrealized_pl : (ondateAmt - costAmt));
        const unplPct = costAmt > 0 ? (unpl / costAmt * 100) : 0;

        return {
          id: i + 1,
          account: a.account || '',
          asset_name: a.asset_name || '',
          class: (a.asset_class || a.class || 'OTHER').trim(),
          owner,
          units,
          avg_cost: avgCostPer,
          current_price: priceUnit,
          total_cost: costAmt,
          market_value: ondateAmt,
          unrealized_pl: unpl,
          unrealized_pl_pct: unplPct,
          realized_pl: Number(a.realized_pl || 0)
        };
      });

      // Normalize snapshot (Daily Snapshort_V3)
      const normalizedSnapshot = rawSnapshot.map(s => {
        const dStr = String(s.date || '');
        const ppCost    = Number(s.pp_cost || 0);
        const ppOndate  = Number(s.pp_ondate || 0);
        const jjCost    = Number(s.jj_cost || 0);
        const jjOndate  = Number(s.jj_ondate || 0);
        const totCost   = Number(s.total_cost || ppCost + jjCost || 0);
        const totOndate = Number(s.total_ondate || ppOndate + jjOndate || 0);

        return {
          date: dStr,
          year_month: dStr.length >= 7 ? dStr.substring(0, 7) : dStr,
          pp_cost:   ppCost,
          pp_ondate: ppOndate,
          pp_pl:     Number(s.pp_unrealized !== undefined ? s.pp_unrealized : ppOndate - ppCost),
          jj_cost:   jjCost,
          jj_ondate: jjOndate,
          jj_pl:     Number(s.jj_unrealized !== undefined ? s.jj_unrealized : jjOndate - jjCost),
          total_cost:   totCost,
          total_ondate: totOndate,
          total_pl:     Number(s.total_unrealized !== undefined ? s.total_unrealized : totOndate - totCost),
          nav_per_unit: Number(s.nav_per_unit || 10),
          pp_inflow:    Number(s.pp_net_inflow  || s.pp_inflow  || 0),
          jj_inflow:    Number(s.jj_net_inflow  || s.jj_inflow  || 0),
          total_inflow: Number(s.total_net_inflow || s.total_inflow || 0)
        };
      });

      console.log('[API] Normalized summary total NW:', normalizedSummary.total.market_value);
      console.log('[API] Snapshot rows loaded:', normalizedSnapshot.length);
      console.log('[API] Assets loaded:', normalizedAssets.length);

      window.AppState.setData({
        summary:  normalizedSummary,
        assets:   normalizedAssets,
        snapshot: normalizedSnapshot,
        isDemo:   false
      });

    } catch (err) {
      console.error('[API] Fetch failed:', err);
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
    } finally {
      this.showLoading(false);
    }
  },

  showLoading(isLoading) {
    const spinner = document.getElementById('global-loading-spinner');
    if (spinner) spinner.style.display = isLoading ? 'flex' : 'none';
  }
};
