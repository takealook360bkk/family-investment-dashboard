// Data API Service for Family Investment Portfolio

function parseVal(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/,/g, '').replace(/฿/g, '').trim();
  if (str.startsWith('(') && str.endsWith(')')) {
    const n = Number('-' + str.slice(1, -1));
    return isNaN(n) ? 0 : n;
  }
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

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
      // v3.1 Update: Added timestamp cache buster (_t) and fetch options (no-store) to prevent stale data
      const authParam = `&access_token=${encodeURIComponent(token)}&_t=${Date.now()}`;
      const fetchOpts = { cache: 'no-store' };

      const [summaryRes, assetsRes, snapshotRes, thaiStocksRes] = await Promise.all([
        fetch(`${baseUrl}?action=summary${authParam}`, fetchOpts).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch(`${baseUrl}?action=assets${authParam}`, fetchOpts).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch(`${baseUrl}?action=snapshot${authParam}`, fetchOpts).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch(`${baseUrl}?action=thai_stocks${authParam}`, fetchOpts).then(r => r.json()).catch(e => ({ error: e.message }))
      ]);

      // Log raw responses for debugging
      console.log('[API] summary raw:', summaryRes);
      console.log('[API] assets count:', Array.isArray(assetsRes.data) ? assetsRes.data.length : 'N/A');
      console.log('[API] snapshot count:', Array.isArray(snapshotRes.data) ? snapshotRes.data.length : 'N/A');
      console.log('[API] thai_stocks items count:', thaiStocksRes?.data?.items ? thaiStocksRes.data.items.length : 'N/A');

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

      // DEBUG: Log raw snapshot to see what field names the Apps Script sends
      if (rawSnapshot.length > 0) {
        const rawLast = rawSnapshot[rawSnapshot.length - 1];
        console.log('[API RAW] Snapshot last row keys:', Object.keys(rawLast).join(', '));
        console.log('[API RAW] Last row date field:', rawLast.date);
        console.log('[API RAW] asiafund_amount:', rawLast.asiafund_amount, '| thstock_amount:', rawLast.thstock_amount);
        console.log('[API RAW] Full last row:', JSON.stringify(rawLast));
      }

      if (rawSnapshot.length === 0 || rawAssets.length === 0) {
        console.warn('[API] Empty data returned. Falling back to demo.');
        const mock = window.generateMockData();
        window.AppState.setData({ ...mock, isDemo: true });
        return;
      }

      // Normalize summary (Master_Asset Q3:V5) - v3.2.3
      const normalizedSummary = {
        total: {
          net_capital_deposit: Number(rawSummary.total?.net_capital_deposit || rawSummary.total?.net_capital || rawSummary.total?.cost_amount || rawSummary.total?.cost || 0),
          market_value:        Number(rawSummary.total?.ondate_amount || rawSummary.total?.market_value || 0),
          net_gain:            Number(rawSummary.total?.net_gain !== undefined ? rawSummary.total?.net_gain : (rawSummary.total?.unrealized_pl || 0) + (rawSummary.total?.realized_pl || 0)),
          unrealized_pl:       Number(rawSummary.total?.unrealized_pl || 0),
          realized_pl:         Number(rawSummary.total?.realized_pl || 0),
        },
        pp: {
          net_capital_deposit: Number(rawSummary.pp?.net_capital_deposit || rawSummary.pp?.net_capital || rawSummary.pp?.cost_amount || rawSummary.pp?.cost || 0),
          market_value:        Number(rawSummary.pp?.ondate_amount || rawSummary.pp?.market_value || 0),
          net_gain:            Number(rawSummary.pp?.net_gain !== undefined ? rawSummary.pp?.net_gain : (rawSummary.pp?.unrealized_pl || 0) + (rawSummary.pp?.realized_pl || 0)),
          unrealized_pl:       Number(rawSummary.pp?.unrealized_pl || 0),
          realized_pl:         Number(rawSummary.pp?.realized_pl || 0),
        },
        jj: {
          net_capital_deposit: Number(rawSummary.jj?.net_capital_deposit || rawSummary.jj?.net_capital || rawSummary.jj?.cost_amount || rawSummary.jj?.cost || 0),
          market_value:        Number(rawSummary.jj?.ondate_amount || rawSummary.jj?.market_value || 0),
          net_gain:            Number(rawSummary.jj?.net_gain !== undefined ? rawSummary.jj?.net_gain : (rawSummary.jj?.unrealized_pl || 0) + (rawSummary.jj?.realized_pl || 0)),
          unrealized_pl:       Number(rawSummary.jj?.unrealized_pl || 0),
          realized_pl:         Number(rawSummary.jj?.realized_pl || 0),
        }
      };

      // Normalize assets (Master_Asset)
      const normalizedAssets = rawAssets.map((a, i) => {
        const acc = (a.account || '').toUpperCase();
        let owner = 'PP';
        if (acc.startsWith('JJ')) owner = 'JJ';
        else if (acc.startsWith('PP')) owner = 'PP';

        const units      = Number(a.unit || a.units || 0);
        const costAmt    = Number(a.cost_current_asset || a.cost_amount || a.total_cost || 0);
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

      // Normalize snapshot (Daily Snapshort_V3 - 26 cols) - v3.2.3
      const normalizedSnapshot = rawSnapshot.map(s => {
        const dStr = String(s.date || '');
        const ppCapital = Number(s.pp_net_capital_deposit !== undefined ? s.pp_net_capital_deposit : (s.pp_cost || 0));
        const ppCost    = Number(s.pp_cost_current_asset !== undefined ? s.pp_cost_current_asset : (s.pp_cost || 0));
        const ppOndate  = Number(s.pp_ondate_amount !== undefined ? s.pp_ondate_amount : (s.pp_ondate || 0));
        const ppUnreal  = Number(s.pp_unrealized_pl !== undefined ? s.pp_unrealized_pl : (s.pp_unrealized !== undefined ? s.pp_unrealized : ppOndate - ppCost));
        const ppRealCum = Number(s.pp_realized_pl_cumulative !== undefined ? s.pp_realized_pl_cumulative : (s.pp_realized_cum || 0));
        const ppNetGain = Number(s.pp_net_gain !== undefined ? s.pp_net_gain : (ppUnreal + ppRealCum));

        const jjCapital = Number(s.jj_net_capital_deposit !== undefined ? s.jj_net_capital_deposit : (s.jj_cost || 0));
        const jjCost    = Number(s.jj_cost_current_asset !== undefined ? s.jj_cost_current_asset : (s.jj_cost || 0));
        const jjOndate  = Number(s.jj_ondate_amount !== undefined ? s.jj_ondate_amount : (s.jj_ondate || 0));
        const jjUnreal  = Number(s.jj_unrealized_pl !== undefined ? s.jj_unrealized_pl : (s.jj_unrealized !== undefined ? s.jj_unrealized : jjOndate - jjCost));
        const jjRealCum = Number(s.jj_realized_pl_cumulative !== undefined ? s.jj_realized_pl_cumulative : (s.jj_realized_cum || 0));
        const jjNetGain = Number(s.jj_net_gain !== undefined ? s.jj_net_gain : (jjUnreal + jjRealCum));

        const totCapital = Number(s.total_net_capital_deposit !== undefined ? s.total_net_capital_deposit : (s.total_cost || ppCapital + jjCapital));
        const totCost    = Number(s.total_cost_current_asset !== undefined ? s.total_cost_current_asset : (s.total_cost || ppCost + jjCost));
        const totOndate  = Number(s.total_ondate_amount !== undefined ? s.total_ondate_amount : (s.total_ondate || ppOndate + jjOndate));
        const totUnreal  = Number(s.total_unrealized_pl !== undefined ? s.total_unrealized_pl : (s.total_unrealized !== undefined ? s.total_unrealized : totOndate - totCost));
        const totNetGain = ppNetGain + jjNetGain;

        return {
          date: dStr,
          year_month: dStr.length >= 7 ? dStr.substring(0, 7) : dStr,
          // v3.2.3 Net Capital Deposits (Actual External Cash)
          pp_net_capital_deposit: ppCapital,
          jj_net_capital_deposit: jjCapital,
          total_net_capital_deposit: totCapital,
          // Ondate amounts (Market value / Net worth)
          pp_ondate: ppOndate,
          jj_ondate: jjOndate,
          total_ondate: totOndate,
          // Net Gain (Unrealized + Cumulative Realized + Dividends)
          pp_net_gain: ppNetGain,
          jj_net_gain: jjNetGain,
          total_net_gain: totNetGain,
          // P&L & Cost
          pp_cost: ppCost,
          jj_cost: jjCost,
          total_cost: totCost,
          pp_pl: ppUnreal,
          jj_pl: jjUnreal,
          total_pl: totUnreal,
          nav_per_unit: Number(s.nav_per_unit || 10),
          pp_inflow:    Number(s.pp_net_inflow !== undefined ? s.pp_net_inflow : (s.pp_inflow || 0)),
          jj_inflow:    Number(s.jj_net_inflow !== undefined ? s.jj_net_inflow : (s.jj_inflow || 0)),
          total_inflow: Number(s.total_net_inflow !== undefined ? s.total_net_inflow : (s.total_inflow || 0)),
          // v3.3.0 Asset Class Breakdown
          // NOTE: Use ?? (nullish coalescing), NOT || (OR), because 0 is a valid amount
          // and || treats 0 as falsy, causing correct 0-values to be ignored.
          asset_classes: {
            ASIAFUND: parseVal(s.asiafund_amount ?? s.asset_classes?.ASIAFUND ?? 0),
            BOND:     parseVal(s.bond_amount     ?? s.asset_classes?.BOND     ?? 0),
            CHIFUND:  parseVal(s.chifund_amount  ?? s.asset_classes?.CHIFUND  ?? 0),
            FCD:      parseVal(s.fcd_amount      ?? s.asset_classes?.FCD      ?? 0),
            GOLD:     parseVal(s.gold_amount     ?? s.asset_classes?.GOLD     ?? 0),
            GOLDFUND: parseVal(s.goldfund_amount ?? s.asset_classes?.GOLDFUND ?? 0),
            SEMIFUND: parseVal(s.semifund_amount ?? s.asset_classes?.SEMIFUND ?? 0),
            THSTOCK:  parseVal(s.thstock_amount  ?? s.asset_classes?.THSTOCK  ?? 0),
            USAFUND:  parseVal(s.usafund_amount  ?? s.asset_classes?.USAFUND  ?? 0)
          }
        };
      });

      console.log('[API] Normalized summary total NW:', normalizedSummary.total.market_value);
      console.log('[API] Snapshot rows loaded:', normalizedSnapshot.length);
      console.log('[API] Assets loaded:', normalizedAssets.length);
      // Debug: Log first and last snapshot asset_classes to verify data
      if (normalizedSnapshot.length > 0) {
        const last = normalizedSnapshot[normalizedSnapshot.length - 1];
        console.log('[API] Last snapshot date:', last.date, 'asset_classes:', last.asset_classes);
        // Also log raw to cross-check field names
        const rawLast = rawSnapshot[rawSnapshot.length - 1];
        console.log('[API] Raw last snapshot keys:', Object.keys(rawLast || {}));
      }

      // Normalize Thai Stocks Hub data
      let normalizedThaiStocks = { summary: null, items: [] };
      if (thaiStocksRes && thaiStocksRes.success && thaiStocksRes.data) {
        normalizedThaiStocks = thaiStocksRes.data;
      } else {
        // Fallback to mock thaiStocks if not yet populated or error
        const mock = window.generateMockData();
        normalizedThaiStocks = mock.thaiStocks;
      }

      window.AppState.setData({
        summary:    normalizedSummary,
        assets:     normalizedAssets,
        snapshot:   normalizedSnapshot,
        thaiStocks: normalizedThaiStocks,
        isDemo:     false
      });

    } catch (err) {
      console.error('[API] Fetch failed:', err);
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
    } finally {
      this.showLoading(false);
    }
  },

  /**
   * 2-Way Live Sync: ส่งข้อมูลอัปเดตหุ้นไทยไปยัง Google Sheet (Expected DPS, Consensus, Performance)
   */
  async updateThaiStock(account, symbol, updates) {
    if (window.AppState.isDemoMode) {
      console.log('[API Mock] updateThaiStock received:', { account, symbol, updates });
      // Update local state in mock mode
      if (window.AppState.thaiStocks && window.AppState.thaiStocks.items) {
        const item = window.AppState.thaiStocks.items.find(i => i.account === account && i.symbol === symbol);
        if (item) {
          Object.assign(item, updates);
          // Recalculate dependent metrics if expected_dps changed
          if (updates.expected_dps !== undefined) {
            item.yearly_expected_dividend = item.quantity * item.expected_dps;
            item.yield_on_cost = item.avg_cost_price > 0 ? (item.expected_dps / item.avg_cost_price * 100) : 0;
            item.current_price_yield = item.current_price > 0 ? (item.expected_dps / item.current_price * 100) : 0;
          }
        }
      }
      return { success: true, updated: { account, symbol, ...updates } };
    }

    const baseUrl = window.APP_CONFIG.API_BASE_URL;
    const token = window.AppState.token;

    if (!baseUrl || !token) {
      throw new Error('API not configured or user not logged in.');
    }

    const payload = {
      action: 'update_thai_stock',
      access_token: token,
      account: account,
      symbol: symbol,
      ...updates
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    return result;
  },

  showLoading(isLoading) {
    const spinner = document.getElementById('global-loading-spinner');
    if (spinner) spinner.style.display = isLoading ? 'flex' : 'none';
  }
};
