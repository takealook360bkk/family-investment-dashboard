// Data API Service for Family Investment Portfolio
// Architecture: Single-Batch Payload + Stale-While-Revalidate Instant Local Cache
// 
// [ARCHITECTURAL RULE / กฎเหล็กด้านสถาปัตยกรรม]:
// หากในอนาคตต้องการดึงข้อมูลจาก Google Sheet เพิ่มเติม (Request ที่ 5, 6, 7, 8, 9 ฯลฯ)
// ห้ามสร้าง fetch() แยกใน Promise.all หรือสร้าง network request ย่อยเพิ่มเด็ดขาด!
// ต้องไปเพิ่ม field ใน Apps Script handleAll (?action=all) เพื่อให้ Dashboard ดึงข้อมูลจบใน 1 request เดียวเสมอ
// เพื่อป้องกัน Google Apps Script เกิด Concurrency Queueing, Cold Start ซ้ำซ้อน และ Error 429/503 HTML Drop

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
  /**
   * ดึงข้อมูลจาก Local Cache ในเครื่อง (ถ้ามี) เพื่อเปิดหน้าเว็บได้ทันที 0.05 วินาที
   */
  loadCachedData() {
    try {
      const cacheKey = window.APP_CONFIG?.STORAGE_KEYS?.DATA_CACHE || 'family_portfolio_data_cache';
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;
      const data = JSON.parse(cached);
      if (data && data.summary && data.assets && data.snapshot) {
        console.info('[API Cache] Loaded instant cached portfolio data');
        return data;
      }
    } catch (e) {
      console.warn('[API Cache] Failed to parse local cache:', e);
    }
    return null;
  },

  /**
   * บันทึกข้อมูลที่ Normalization แล้วลง Local Cache สำหรับการเปิดครั้งถัดไป
   */
  saveCachedData(data) {
    try {
      const cacheKey = window.APP_CONFIG?.STORAGE_KEYS?.DATA_CACHE || 'family_portfolio_data_cache';
      const timeKey = window.APP_CONFIG?.STORAGE_KEYS?.CACHE_TIMESTAMP || 'family_portfolio_cache_time';
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timeKey, String(Date.now()));
      console.info('[API Cache] Successfully saved fresh portfolio snapshot to local cache');
    } catch (e) {
      console.warn('[API Cache] Failed to save local cache:', e);
    }
  },

  /**
   * ดึงข้อมูลพอร์ตการลงทุนทั้งหมดแบบ Single Batch Request (?action=all)
   * ผสานกลยุทธ์ Stale-While-Revalidate: แสดงแคชทันที แล้วแอบซิงก์ข้อมูลสดอยู่เบื้องหลัง
   */
  async fetchAllData() {
    const baseUrl = window.APP_CONFIG.API_BASE_URL;
    const token = window.AppState.token;

    // ตรวจสอบว่าได้ตั้งค่า URL หรือยัง หากไม่มีให้โหลด Demo Data
    if (!baseUrl || baseUrl.includes('YOUR_SCRIPT_ID') || baseUrl === '') {
      console.info('API_BASE_URL not configured. Loading realistic demo data.');
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
      return;
    }

    // หากไม่มี Token ให้แสดงผล Demo Data ทันที
    if (!token) {
      console.info('No auth token. Loading demo data.');
      const mock = window.generateMockData();
      window.AppState.setData({ ...mock, isDemo: true });
      return;
    }

    // 1. ตรวจสอบและแสดงผลจากแคชทันที (Instant Render 0.05 วินาที)
    const cachedData = this.loadCachedData();
    const hasCache = !!cachedData;

    if (hasCache) {
      // เรนเดอร์ข้อมูลจากแคชขึ้นหน้าจอทันที ไม่ต้องให้ผู้ใช้ยืนรอนาน
      window.AppState.setData({ ...cachedData, isDemo: false });
      this.showSyncStatus(true, 'กำลังซิงก์ข้อมูลล่าสุดจาก Google Sheets...');
    } else {
      // กรณีเพิ่งเข้าใช้งานครั้งแรกและยังไม่มีแคช ให้แสดง Spinner หมุนแบบเดิม
      this.showLoading(true, 'กำลังโหลดข้อมูลพอร์ตการลงทุนจาก Google Sheets...');
    }

    try {
      // 2. ยิง Single Batch Request เพียง 1 Network Call ไปยัง Google Apps Script
      const authParam = `&access_token=${encodeURIComponent(token)}&_t=${Date.now()}`;
      const fetchTimeout = (window.APP_CONFIG && window.APP_CONFIG.FETCH_TIMEOUT_MS) || 60000;
      const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(fetchTimeout) : null;
      
      const fetchOpts = { 
        cache: 'no-store',
        ...(timeoutSignal ? { signal: timeoutSignal } : {})
      };

      const requestUrl = `${baseUrl}?action=all${authParam}`;
      console.log('[API] Fetching single batch payload from:', `${baseUrl}?action=all`);
      
      const response = await fetch(requestUrl, fetchOpts);
      const responseText = await response.text();

      // 3. Safe Parser ป้องกัน Error HTML จาก Google Gateway (429, 503, 302 Redirect)
      if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.warn('[API] Received HTML error page from Google instead of JSON:', responseText.slice(0, 300));
        
        if (hasCache) {
          // หากมีแคชอยู่แล้ว ให้ใช้ข้อมูลแคชต่อไปพร้อมแจ้งเตือนแบบนุ่มนวล ไม่บล็อกการใช้งาน
          this.showSyncStatus(true, '⚡ ใช้ข้อมูลล่าสุดในเครื่อง (Google Apps Script กำลังเริ่มทำงาน)');
          setTimeout(() => this.showSyncStatus(false), 4000);
          return;
        } else {
          alert('⏱️ เซิร์ฟเวอร์ Google Apps Script ตอบสนองช้าหรือกำลังเริ่มทำงาน (Cold Start):\n\nระบบจะสลับไปแสดงผลในโหมดจำลอง (Demo Mode) ชั่วคราว กรุณารอสักครู่แล้วกด Refresh หน้าเว็บอีกครั้งครับ');
          const mock = window.generateMockData();
          window.AppState.setData({ ...mock, isDemo: true });
          return;
        }
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('[API] JSON Parse Error on payload:', responseText.slice(0, 200), parseErr);
        if (hasCache) return;
        throw new Error('Invalid JSON format received from server.');
      }

      // 4. ตรวจสอบ Error Response จาก Backend
      if (!result.success || result.error) {
        const errMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error || 'Unknown Error');
        console.warn('[API] Server returned error:', errMsg);
        const lowerErr = errMsg.toLowerCase();

        if (lowerErr.includes('forbidden') || lowerErr.includes('not allowed')) {
          if (window.AuthService) window.AuthService.logout();
          alert('🚫 ปฏิเสธการเข้าถึง (Access Denied):\n\nบัญชี Google นี้ไม่ได้รับอนุญาตให้เข้าถึงข้อมูลพอร์ตการลงทุน');
          return;
        } else if (lowerErr.includes('unauthorized') || lowerErr.includes('invalid')) {
          console.warn('[API] Token appears expired. Clearing session...');
          if (window.AuthService) window.AuthService.logout();
          alert('⚠️ Session หมดอายุ: กรุณากด "Sign in with Google" อีกครั้งเพื่อดึงข้อมูลจริงจาก Google Sheet ครับ');
          return;
        } else {
          if (!hasCache) {
            alert('[API Error] ' + errMsg);
          }
        }

        if (!hasCache) {
          const mock = window.generateMockData();
          window.AppState.setData({ ...mock, isDemo: true });
        }
        return;
      }

      // 5. ดึงข้อมูลจาก Batch Payload (รองรับทั้ง Batch ใหม่และ Single Fallback)
      const rawData = result.data || {};
      const rawSummary = rawData.summary || {};
      const rawAssets = Array.isArray(rawData.assets) ? rawData.assets : [];
      const rawSnapshot = Array.isArray(rawData.snapshot) ? rawData.snapshot : [];
      const rawThaiStocks = rawData.thai_stocks || { summary: null, items: [] };

      if (rawSnapshot.length === 0 || rawAssets.length === 0) {
        console.warn('[API] Empty dataset received from sheets.');
        if (!hasCache) {
          const mock = window.generateMockData();
          window.AppState.setData({ ...mock, isDemo: true });
        }
        return;
      }

      // ---- Data Normalization ----

      // 1. Normalize summary (Master_Asset Q3:V5)
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

      // 2. Normalize assets (Master_Asset)
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

      // 3. Normalize snapshot (Daily Snapshort_V3 - 26 cols + CASH Col AC)
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
          pp_net_capital_deposit: ppCapital,
          jj_net_capital_deposit: jjCapital,
          total_net_capital_deposit: totCapital,
          pp_ondate: ppOndate,
          jj_ondate: jjOndate,
          total_ondate: totOndate,
          pp_net_gain: ppNetGain,
          jj_net_gain: jjNetGain,
          total_net_gain: totNetGain,
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
          asset_classes: {
            CASH:     parseVal(s.cash_amount     ?? s.asset_classes?.CASH     ?? 0),
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

      // 4. Normalize Thai Stocks Hub data
      let normalizedThaiStocks = { summary: null, items: [] };
      if (rawThaiStocks && (rawThaiStocks.summary || (rawThaiStocks.items && rawThaiStocks.items.length > 0))) {
        normalizedThaiStocks = rawThaiStocks;
      } else {
        const mock = window.generateMockData();
        normalizedThaiStocks = mock.thaiStocks;
      }

      const freshStatePayload = {
        summary:    normalizedSummary,
        assets:     normalizedAssets,
        snapshot:   normalizedSnapshot,
        thaiStocks: normalizedThaiStocks
      };

      // 6. บันทึกข้อมูลสดลง Local Cache เพื่อให้เปิดเว็บครั้งถัดไปเร็วแบบ Instant (0.05 วินาที)
      this.saveCachedData(freshStatePayload);

      // 7. อัปเดต UI ด้วยข้อมูลสดล่าสุด
      window.AppState.setData({
        ...freshStatePayload,
        isDemo: false
      });

      console.info('[API] Fresh portfolio data synchronized successfully in 1 batch');

    } catch (err) {
      console.error('[API] Fetch failed:', err);
      if (!hasCache) {
        const mock = window.generateMockData();
        window.AppState.setData({ ...mock, isDemo: true });
      }
    } finally {
      this.showLoading(false);
      this.showSyncStatus(false);
    }
  },

  /**
   * 2-Way Live Sync: ส่งข้อมูลอัปเดตหุ้นไทยไปยัง Google Sheet (Expected DPS, Consensus, Performance)
   */
  async updateThaiStock(account, symbol, updates) {
    if (window.AppState.isDemoMode) {
      console.log('[API Mock] updateThaiStock received:', { account, symbol, updates });
      if (window.AppState.thaiStocks && window.AppState.thaiStocks.items) {
        const item = window.AppState.thaiStocks.items.find(i => i.account === account && i.symbol === symbol);
        if (item) {
          Object.assign(item, updates);
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

    const syncTimeout = (window.APP_CONFIG && window.APP_CONFIG.SYNC_TIMEOUT_MS) || 30000;
    const timeoutSignal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(syncTimeout) : null;
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...(timeoutSignal ? { signal: timeoutSignal } : {})
    });

    const result = await response.json();
    return result;
  },

  /**
   * แสดง/ซ่อน Full Screen Loading Spinner
   */
  showLoading(isLoading, message = 'กำลังโหลดข้อมูลพอร์ตการลงทุน...') {
    const spinner = document.getElementById('global-loading-spinner');
    if (spinner) {
      spinner.style.display = isLoading ? 'flex' : 'none';
      const textEl = spinner.querySelector('p');
      if (textEl && message) {
        textEl.textContent = message;
      }
    }
  },

  /**
   * แสดง/ซ่อน แถบแจ้งเตือนการซิงก์ข้อมูลแบบ Non-intrusive ที่มุมจอ
   */
  showSyncStatus(isSyncing, message = 'กำลังซิงก์ข้อมูลล่าสุด...') {
    let indicator = document.getElementById('bg-sync-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'bg-sync-indicator';
      indicator.className = 'fixed bottom-4 right-4 z-40 bg-slate-900/90 text-cyan-400 border border-cyan-800/80 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl backdrop-blur-md transition-all duration-300 pointer-events-none opacity-0 translate-y-2';
      indicator.innerHTML = `
        <span class="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span id="bg-sync-text">${message}</span>
      `;
      document.body.appendChild(indicator);
    }

    const textEl = indicator.querySelector('#bg-sync-text');
    if (textEl && message) textEl.textContent = message;

    if (isSyncing) {
      indicator.classList.remove('opacity-0', 'translate-y-2');
      indicator.classList.add('opacity-100', 'translate-y-0');
    } else {
      indicator.classList.remove('opacity-100', 'translate-y-0');
      indicator.classList.add('opacity-0', 'translate-y-2');
    }
  }
};
