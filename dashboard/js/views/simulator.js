// View 4: Retirement Freedom Simulator — corrected formulas + localStorage memo

window.SimulatorView = {
  simChart: null,
  STORAGE_KEY: 'fip_sim_params',

  // v3.1 Update: Adjusted default values as requested by brief
  DEFAULTS: {
    baseWealth: 0, currentAge: 33, retireAge: 55,
    monthlySavings: 35000, stepUp: 2.5, returnRate: 5.0,
    retireYield: 5.0, inflation: 3.0, livingCost: 50000,
  },

  init() {
    this.loadFromStorage();
    this.bindEvents();
  },

  bindEvents() {
    const inputIds = ['sim-base-wealth','sim-current-age','sim-retire-age','sim-monthly-savings',
                      'sim-step-up','sim-return-rate','sim-retire-yield','sim-inflation','sim-living-cost'];
    inputIds.forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        this.saveToStorage();
        this.render();
      });
    });

    document.getElementById('sim-reset-btn')?.addEventListener('click', () => {
      localStorage.removeItem(this.STORAGE_KEY);
      this.loadFromStorage(true);
      this.render();
    });
  },

  // ─── localStorage helpers ───
  saveToStorage() {
    const params = {};
    ['sim-base-wealth','sim-current-age','sim-retire-age','sim-monthly-savings',
     'sim-step-up','sim-return-rate','sim-retire-yield','sim-inflation','sim-living-cost'].forEach(id => {
      params[id] = document.getElementById(id)?.value;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(params));
  },

  loadFromStorage(useDefaults = false) {
    const saved = !useDefaults ? JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null') : null;
    const setVal = (id, def) => {
      const el = document.getElementById(id);
      if (el) el.value = saved?.[id] ?? def;
    };
    setVal('sim-current-age',     this.DEFAULTS.currentAge);
    setVal('sim-retire-age',      this.DEFAULTS.retireAge);
    setVal('sim-monthly-savings', this.DEFAULTS.monthlySavings);
    setVal('sim-step-up',         this.DEFAULTS.stepUp);
    setVal('sim-return-rate',     this.DEFAULTS.returnRate);
    setVal('sim-retire-yield',    this.DEFAULTS.retireYield);
    setVal('sim-inflation',       this.DEFAULTS.inflation);
    setVal('sim-living-cost',     this.DEFAULTS.livingCost);

    const storedBase = saved?.['sim-base-wealth'];
    // v3.1 Update: Apply Math.round() to liveNW
    const liveNW = Math.round(window.AppState?.summary?.total?.market_value
                 || (window.AppState?.snapshot?.slice(-1)[0]?.total_ondate) || 0);
    const el = document.getElementById('sim-base-wealth');
    if (el) el.value = (!useDefaults && storedBase && parseFloat(storedBase) > 0) ? storedBase : (liveNW || 0);
  },

  autofillBaseWealth() {
    // v3.1 Update: Apply Math.round() to liveNW
    const liveNW = Math.round(window.AppState?.summary?.total?.market_value
                 || (window.AppState?.snapshot?.slice(-1)[0]?.total_ondate) || 0);
    if (!liveNW) return;
    const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null');
    const el = document.getElementById('sim-base-wealth');
    if (el && (!stored?.['sim-base-wealth'] || parseFloat(stored['sim-base-wealth']) === 0)) {
      el.value = liveNW;
    }
  },

  getParams() {
    const g = id => parseFloat(document.getElementById(id)?.value || 0) || 0;
    // v3.1 Update: Apply Math.round() to liveNW
    const liveNW = Math.round(window.AppState?.summary?.total?.market_value
                 || (window.AppState?.snapshot?.slice(-1)[0]?.total_ondate) || 0);
    let baseWealth = g('sim-base-wealth');
    if (baseWealth === 0 && liveNW > 0) baseWealth = liveNW;
    // v3.1 Update: Sync fallback values with updated defaults (Age 33, step-up 2.5, ROI 5, yield 5, inflation 3)
    return {
      baseWealth,
      currentAge:     g('sim-current-age')     || 33,
      retireAge:      g('sim-retire-age')      || 55,
      monthlySavings: g('sim-monthly-savings') || 35000,
      stepUp:         g('sim-step-up')         || 2.5,
      returnRate:     g('sim-return-rate')     || 5.0,
      retireYield:    g('sim-retire-yield')    || 5.0,
      inflation:      g('sim-inflation')       || 3.0,
      livingCost:     g('sim-living-cost')     || 50000,
    };
  },

  render() {
    this.autofillBaseWealth();
    const snapshot = window.AppState.snapshot;
    if (!snapshot || snapshot.length === 0) return;

    const p = this.getParams();
    const accYears  = Math.max(0, p.retireAge - p.currentAge);
    const postYears = 35;
    const currentYear = new Date().getFullYear();

    // ─── Phase 1: Historical — resample to YEARLY for uniform x-axis spacing ───
    const yearMap = {};
    snapshot.forEach(s => {
      const yr = (s.year_month || s.date || '').substring(0, 4);
      if (yr) yearMap[yr] = s; // keep overwriting → last record per year
    });
    const yearlySnap = Object.values(yearMap);
    const histLabels = yearlySnap.map(s => (s.year_month || s.date || '').substring(0, 4));
    const histValues = yearlySnap.map(s => s.total_ondate || 0);

    // ─── Phase 2: Accumulation ───
    const accLabels = [];
    const accValues = [];
    let nw = p.baseWealth;
    let annualSavings = p.monthlySavings * 12;
    const roi = p.returnRate / 100;

    for (let yr = 1; yr <= accYears; yr++) {
      nw = nw * (1 + roi) + annualSavings;
      annualSavings = annualSavings * (1 + p.stepUp / 100);
      const year = currentYear + yr;
      const age  = p.currentAge + yr;
      accLabels.push(`${year}\n(${age}ปี)`);
      accValues.push(nw);
    }

    const retirePortfolio = nw;

    // ─── Phase 3: Retirement ───
    const retireLabels = [];
    const retireValues = [];
    const yieldRate = p.retireYield / 100;
    const expenseAtRetire = p.livingCost * 12 * Math.pow(1 + p.inflation / 100, accYears);
    let annualExpense = expenseAtRetire;
    let retireNW     = retirePortfolio;
    let depletedAge  = null;

    for (let yr = 1; yr <= postYears; yr++) {
      retireNW = retireNW * (1 + yieldRate) - annualExpense;
      annualExpense = annualExpense * (1 + p.inflation / 100);
      const age  = p.retireAge + yr;
      const year = currentYear + accYears + yr;
      retireLabels.push(`${year}\n(${age}ปี)`);
      retireValues.push(Math.max(0, retireNW));
      if (retireNW <= 0 && !depletedAge) { depletedAge = age; retireNW = 0; }
    }

    // ─── Summary cards ───
    const retireValEl = document.getElementById('sim-result-retire-val');
    if (retireValEl) retireValEl.textContent = `฿${(retirePortfolio / 1e6).toFixed(2)}M`;

    const expenseEl = document.getElementById('sim-result-expense-at-retire');
    if (expenseEl) expenseEl.textContent = `฿${window.formatCurrency(expenseAtRetire / 12)}/เดือน`;

    const statusEl = document.getElementById('sim-result-status-card');
    if (statusEl) {
      if (!depletedAge) {
        statusEl.className = 'sim-status-badge success';
        statusEl.textContent = `🎉 พอร์ตอยู่ได้ยั่งยืนจนอายุ ${p.retireAge + postYears}+ ปี — Financial Freedom Achieved!`;
      } else {
        statusEl.className = 'sim-status-badge warning';
        statusEl.textContent = `⚠️ พอร์ตจะหมดตอนอายุประมาณ ${depletedAge} ปี — แนะนำปรับเพิ่มเงินออมหรือลดค่าใช้จ่าย`;
      }
    }

    this.renderChart(histLabels, histValues, accLabels, accValues, retireLabels, retireValues);
  },

  renderChart(histL, histV, accL, accV, retL, retV) {
    const ctx = document.getElementById('retirementSimChart');
    if (!ctx) return;

    const allLabels = [...histL, ...accL, ...retL];
    const n = histL.length;

    const histDataset = [...histV, ...new Array(accL.length + retL.length).fill(null)];
    const accDataset  = [...new Array(n).fill(null), ...accV, ...new Array(retL.length).fill(null)];
    const retDataset  = [...new Array(n + accL.length).fill(null), ...retV];

    if (this.simChart) {
      this.simChart.destroy();
    }

    this.simChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: '1. อดีต — ประวัติ (Historical)',
            data: histDataset,
            borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.08)',
            fill: true, tension: 0.35, borderWidth: 2, pointRadius: 0, spanGaps: false
          },
          {
            label: '2. ช่วงสะสม (Accumulation)',
            data: accDataset,
            borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, spanGaps: false
          },
          {
            label: '3. ช่วงเกษียณ (Retirement)',
            data: retDataset,
            borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
            fill: true, tension: 0.2, borderWidth: 2.5, pointRadius: 0, spanGaps: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: '#9ca3af', font: { family: 'Inter', size: 11 },
              usePointStyle: true, pointStyle: 'line', pointStyleWidth: 24
            }
          },
          tooltip: { callbacks: { label: c => c.parsed.y != null ? `${c.dataset.label}: ฿${window.formatCurrency(c.parsed.y)}` : null } }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6b7280', maxTicksLimit: 20, maxRotation: 40, font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#6b7280', callback: v => v >= 1e6 ? `฿${(v/1e6).toFixed(0)}M` : `฿${(v/1e3).toFixed(0)}K` }
          }
        }
      }
    });
  }
};
