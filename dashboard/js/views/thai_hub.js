// View 5: Thai Stock Hub & Dividend / DRIP Wealth Simulator
// Isolated module for Thai Stock management with 2-Way Live Sync to Google Sheets (THStock_Master_V3)

window.ThaiHubView = {
  charts: {
    ppDonut: null,
    jjDonut: null,
    dripChart: null
  },
  
  selectedOwnerFilter: 'ALL', // 'ALL', 'PP', 'JJ'
  debounceTimers: {},
  localItemOverrides: {}, // Key: `${account}_${symbol}` -> { expected_dps, note_consensus, company_perform }

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Owner filter tabs in Zone 4 Table
    const filterBtns = document.querySelectorAll('.th-tab-filter');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedOwnerFilter = e.currentTarget.getAttribute('data-owner');
        this.renderTableOnly();
      });
    });

    // DRIP Simulator Controls
    const dcaInput = document.getElementById('drip-dca-input');
    const ageInput = document.getElementById('drip-retire-age-input');
    const divGrowthInput = document.getElementById('drip-div-growth-input');
    const capGrowthInput = document.getElementById('drip-cap-growth-input');
    const dripToggle = document.getElementById('drip-toggle');

    const handleSimChange = () => {
      if (dcaInput) {
        const val = Number(dcaInput.value);
        document.getElementById('drip-dca-val-display').innerText = `฿${window.formatCurrency(val)} / mo`;
      }
      if (ageInput) {
        const val = Number(ageInput.value);
        const currentAge = 40; // Default baseline age 40
        const yearsLeft = Math.max(1, val - currentAge);
        document.getElementById('drip-retire-age-display').innerText = `${val} ปี (อีก ${yearsLeft} ปี)`;
      }
      if (divGrowthInput) {
        const val = Number(divGrowthInput.value);
        document.getElementById('drip-div-growth-display').innerText = `${val.toFixed(1)}% / yr`;
      }
      if (capGrowthInput) {
        const val = Number(capGrowthInput.value);
        document.getElementById('drip-cap-growth-display').innerText = `${val.toFixed(1)}% / yr`;
      }

      this.renderDRIPSimulation();
    };

    [dcaInput, ageInput, divGrowthInput, capGrowthInput, dripToggle].forEach(el => {
      if (el) {
        el.addEventListener('input', handleSimChange);
        el.addEventListener('change', handleSimChange);
      }
    });

    // Listen for theme change to update chart colors
    window.AppState.subscribe((event) => {
      if (event === 'themeChanged') {
        this.renderCharts();
      }
    });
  },

  render() {
    const data = this.getAggregatedData();
    if (!data) return;

    this.renderZone1HeroKPIs(data);
    this.renderZone2OwnerHubs(data);
    this.renderZone4Tables(data);
    this.renderCharts(data);
    this.renderDRIPSimulation(data);
  },

  getAggregatedData() {
    const thaiStocksState = window.AppState.thaiStocks;
    if (!thaiStocksState || !thaiStocksState.items || thaiStocksState.items.length === 0) {
      return null;
    }

    // Merge state items with any local overrides for instantaneous responsiveness
    const items = thaiStocksState.items.map(item => {
      const key = `${item.account}_${item.symbol}`;
      const override = this.localItemOverrides[key] || {};
      const expected_dps = override.expected_dps !== undefined ? override.expected_dps : Number(item.expected_dps || 0);
      const note_consensus = override.note_consensus !== undefined ? override.note_consensus : (item.note_consensus || 'Hold');
      const company_perform = override.company_perform !== undefined ? override.company_perform : (item.company_perform || 'Neutral');

      const yearly_expected_dividend = item.quantity * expected_dps;
      const yield_on_cost = item.avg_cost_price > 0 ? (expected_dps / item.avg_cost_price * 100) : 0;
      const current_price_yield = item.current_price > 0 ? (expected_dps / item.current_price * 100) : 0;

      return {
        ...item,
        expected_dps,
        yearly_expected_dividend,
        yield_on_cost,
        current_price_yield,
        note_consensus,
        company_perform
      };
    });

    // Re-calculate Summary Matrix dynamically based on updated expected_dps
    const rawSummary = thaiStocksState.summary || {};
    
    // Group items by owner
    const ppItems = items.filter(i => i.account === 'PP');
    const jjItems = items.filter(i => i.account === 'JJ');

    const calcOwnerSummary = (ownerItems, fallbackSummary) => {
      const total_cost = ownerItems.reduce((s, i) => s + (i.total_cost || 0), 0);
      const market_value = ownerItems.reduce((s, i) => s + (i.market_value || 0), 0);
      const unrealized_pl = ownerItems.reduce((s, i) => s + (i.unrealized_pl || 0), 0);
      const yearly_dividend = ownerItems.reduce((s, i) => s + (i.yearly_expected_dividend || 0), 0);
      
      const historical_net_gain = fallbackSummary?.historical_net_gain || ownerItems.reduce((s, i) => s + (i.historical_net_gain || 0), 0);
      const real_capital_cost_basis = fallbackSummary?.real_capital_cost_basis || Math.max(0, total_cost - historical_net_gain);

      const yoc_pct = real_capital_cost_basis > 0 ? (yearly_dividend / real_capital_cost_basis * 100) : 0;
      const market_yield_pct = market_value > 0 ? (yearly_dividend / market_value * 100) : 0;
      const net_gain_pct = real_capital_cost_basis > 0 ? (historical_net_gain / real_capital_cost_basis * 100) : 0;

      return {
        total_cost,
        real_capital_cost_basis,
        market_value,
        unrealized_pl,
        yearly_dividend,
        historical_net_gain,
        yoc_pct,
        market_yield_pct,
        net_gain_pct
      };
    };

    const ppSummary = calcOwnerSummary(ppItems, rawSummary.pp);
    const jjSummary = calcOwnerSummary(jjItems, rawSummary.jj);

    const total_cost = ppSummary.total_cost + jjSummary.total_cost;
    const market_value = ppSummary.market_value + jjSummary.market_value;
    const unrealized_pl = ppSummary.unrealized_pl + jjSummary.unrealized_pl;
    const yearly_dividend = ppSummary.yearly_dividend + jjSummary.yearly_dividend;
    const historical_net_gain = ppSummary.historical_net_gain + jjSummary.historical_net_gain;
    const real_capital_cost_basis = ppSummary.real_capital_cost_basis + jjSummary.real_capital_cost_basis;

    const yoc_pct = real_capital_cost_basis > 0 ? (yearly_dividend / real_capital_cost_basis * 100) : 0;
    const market_yield_pct = market_value > 0 ? (yearly_dividend / market_value * 100) : 0;
    const net_gain_pct = real_capital_cost_basis > 0 ? (historical_net_gain / real_capital_cost_basis * 100) : 0;

    const summary = {
      total: { total_cost, real_capital_cost_basis, market_value, unrealized_pl, yearly_dividend, historical_net_gain, yoc_pct, market_yield_pct, net_gain_pct },
      pp: ppSummary,
      jj: jjSummary
    };

    return { summary, items, ppItems, jjItems };
  },

  // ZONE 1: HERO KPIS
  renderZone1HeroKPIs(data) {
    const total = data.summary.total;

    document.getElementById('th-hero-market-val').innerText = `฿${window.formatCurrency(total.market_value)}`;
    document.getElementById('th-hero-real-capital').innerText = `฿${window.formatCurrency(total.real_capital_cost_basis)}`;
    
    const netGainEl = document.getElementById('th-hero-net-gain');
    netGainEl.innerText = `${total.historical_net_gain >= 0 ? '+' : ''}฿${window.formatCurrency(total.historical_net_gain)}`;
    netGainEl.className = `text-lg font-bold ${total.historical_net_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    const netGainPctEl = document.getElementById('th-hero-net-gain-pct');
    netGainPctEl.innerText = `${total.net_gain_pct >= 0 ? '+' : ''}${window.formatNumber(total.net_gain_pct)}%`;
    netGainPctEl.className = `text-lg font-bold ${total.net_gain_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

    document.getElementById('th-hero-book-cost').innerText = `฿${window.formatCurrency(total.total_cost)}`;
    const unplEl = document.getElementById('th-hero-unrealized-pl');
    unplEl.innerText = `${total.unrealized_pl >= 0 ? '+' : ''}฿${window.formatCurrency(total.unrealized_pl)}`;
    unplEl.className = total.unrealized_pl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold';

    document.getElementById('th-hero-dividend-yr').innerText = `฿${window.formatCurrency(total.yearly_dividend)}`;
    document.getElementById('th-hero-dividend-mo').innerText = `฿${window.formatCurrency(total.yearly_dividend / 12)}`;
    document.getElementById('th-hero-yoc-pct').innerText = `${window.formatNumber(total.yoc_pct)}%`;
    document.getElementById('th-hero-mkt-yield-pct').innerText = `${window.formatNumber(total.market_yield_pct)}%`;
  },

  // ZONE 2: OWNER HUBS
  renderZone2OwnerHubs(data) {
    const pp = data.summary.pp;
    const jj = data.summary.jj;

    // PP
    document.getElementById('th-pp-market-val').innerText = `฿${window.formatCurrency(pp.market_value)}`;
    document.getElementById('th-pp-real-capital').innerText = `฿${window.formatCurrency(pp.real_capital_cost_basis)}`;
    const ppGainEl = document.getElementById('th-pp-net-gain');
    ppGainEl.innerText = `${pp.historical_net_gain >= 0 ? '+' : ''}฿${window.formatCurrency(pp.historical_net_gain)}`;
    ppGainEl.className = `text-sm font-bold ${pp.historical_net_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    document.getElementById('th-pp-dividend-yoc').innerText = `฿${window.formatCurrency(pp.yearly_dividend)} (${window.formatNumber(pp.yoc_pct)}%)`;

    // JJ
    document.getElementById('th-jj-market-val').innerText = `฿${window.formatCurrency(jj.market_value)}`;
    document.getElementById('th-jj-real-capital').innerText = `฿${window.formatCurrency(jj.real_capital_cost_basis)}`;
    const jjGainEl = document.getElementById('th-jj-net-gain');
    jjGainEl.innerText = `${jj.historical_net_gain >= 0 ? '+' : ''}฿${window.formatCurrency(jj.historical_net_gain)}`;
    jjGainEl.className = `text-sm font-bold ${jj.historical_net_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    document.getElementById('th-jj-dividend-yoc').innerText = `฿${window.formatCurrency(jj.yearly_dividend)} (${window.formatNumber(jj.yoc_pct)}%)`;
  },

  // ZONE 4: INTERACTIVE 13-COLUMN TABLE WITH 2-WAY LIVE SYNC
  renderZone4Tables(data) {
    const tbody = document.getElementById('th-stocks-table-body');
    if (!tbody) return;

    let displayItems = data.items;
    if (this.selectedOwnerFilter === 'PP') {
      displayItems = data.ppItems;
    } else if (this.selectedOwnerFilter === 'JJ') {
      displayItems = data.jjItems;
    }

    // Sort by Market Value descending
    displayItems = [...displayItems].sort((a, b) => (b.market_value || 0) - (a.market_value || 0));

    let html = '';
    displayItems.forEach(item => {
      const isUnplPos = (item.unrealized_pl || 0) >= 0;
      const unplClass = isUnplPos ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold';
      const ownerBadgeClass = item.account === 'PP' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/60' : 'bg-rose-950/60 text-rose-400 border border-rose-800/60';

      const consensus = (item.note_consensus || 'Hold').trim();
      let consensusClass = 'hold';
      if (consensus.toLowerCase() === 'buy') consensusClass = 'buy';
      else if (consensus.toLowerCase() === 'sell') consensusClass = 'sell';

      const perform = (item.company_perform || 'Neutral').trim();
      let performClass = 'neutral';
      if (perform.includes('High')) performClass = 'high';
      else if (perform.includes('Moderate')) performClass = 'moderate';
      else if (perform.includes('Slowdown')) performClass = 'slowdown';
      else if (perform.includes('Impair')) performClass = 'impair';

      html += `
        <tr class="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50">
          <td class="font-bold text-gray-100 py-2.5">
            <span class="text-cyan-400 font-mono">${item.symbol}</span>
          </td>
          <td>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${ownerBadgeClass}">${item.account}</span>
          </td>
          <td class="text-right font-mono text-xs text-gray-300">${window.formatCurrency(item.quantity)}</td>
          <td class="text-right font-mono text-xs text-gray-300">${window.formatNumber(item.avg_cost_price)}</td>
          <td class="text-right font-mono text-xs text-gray-100 font-semibold">${window.formatNumber(item.current_price)}</td>
          <td class="text-right font-mono text-xs text-gray-100 font-bold">฿${window.formatCurrency(item.market_value)}</td>
          <td class="text-right font-mono text-xs ${unplClass}">
            ${isUnplPos ? '+' : ''}฿${window.formatCurrency(item.unrealized_pl)}
            <span class="text-[10px] block opacity-80">${isUnplPos ? '+' : ''}${window.formatNumber(item.unrealized_pl_pct)}%</span>
          </td>
          <td class="text-center">
            <input type="number" step="0.01" min="0" 
              class="th-input-dps" 
              data-account="${item.account}" 
              data-symbol="${item.symbol}" 
              value="${item.expected_dps.toFixed(2)}">
          </td>
          <td class="text-right font-mono text-xs text-amber-400 font-bold">฿${window.formatCurrency(item.yearly_expected_dividend)}</td>
          <td class="text-right font-mono text-xs text-cyan-400 font-bold">${window.formatNumber(item.yield_on_cost)}%</td>
          <td class="text-right font-mono text-xs text-purple-400 font-semibold">${window.formatNumber(item.current_price_yield)}%</td>
          <td class="text-center">
            <select class="th-select-consensus ${consensusClass}" data-account="${item.account}" data-symbol="${item.symbol}">
              <option value="Buy" ${consensus === 'Buy' ? 'selected' : ''}>🟢 Buy</option>
              <option value="Hold" ${consensus === 'Hold' ? 'selected' : ''}>🟡 Hold</option>
              <option value="Sell" ${consensus === 'Sell' ? 'selected' : ''}>🔴 Sell</option>
            </select>
          </td>
          <td class="text-center">
            <select class="th-select-perform ${performClass}" data-account="${item.account}" data-symbol="${item.symbol}">
              <option value="High Growth" ${perform === 'High Growth' ? 'selected' : ''}>🚀 High Growth</option>
              <option value="Moderate Growth" ${perform === 'Moderate Growth' ? 'selected' : ''}>📈 Mod Growth</option>
              <option value="Neutral" ${perform === 'Neutral' ? 'selected' : ''}>⚖️ Neutral</option>
              <option value="Temp Slowdown" ${perform === 'Temp Slowdown' ? 'selected' : ''}>⏳ Slowdown</option>
              <option value="Perm Impairment" ${perform === 'Perm Impairment' ? 'selected' : ''}>⚠️ Impairment</option>
            </select>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    this.bindTableInputs();
  },

  renderTableOnly() {
    const data = this.getAggregatedData();
    if (data) this.renderZone4Tables(data);
  },

  bindTableInputs() {
    // 1. DPS Inputs with 500ms Debounce
    const dpsInputs = document.querySelectorAll('.th-input-dps');
    dpsInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const account = e.target.getAttribute('data-account');
        const symbol = e.target.getAttribute('data-symbol');
        const val = parseFloat(e.target.value) || 0;
        const key = `${account}_${symbol}`;

        if (!this.localItemOverrides[key]) this.localItemOverrides[key] = {};
        this.localItemOverrides[key].expected_dps = val;

        // Optimistic UI updates
        this.renderZone1HeroKPIs(this.getAggregatedData());
        this.renderZone2OwnerHubs(this.getAggregatedData());
        this.renderDRIPSimulation(this.getAggregatedData());

        // Debounced Live Sync to Google Sheets
        clearTimeout(this.debounceTimers[key]);
        this.setSyncStatus('syncing');

        this.debounceTimers[key] = setTimeout(async () => {
          try {
            await window.ApiService.updateThaiStock(account, symbol, { expected_dps: val });
            this.setSyncStatus('saved');
          } catch (err) {
            console.error('[Live Sync Error]', err);
            this.setSyncStatus('error');
          }
        }, 500);
      });
    });

    // 2. Consensus Selects
    const consensusSelects = document.querySelectorAll('.th-select-consensus');
    consensusSelects.forEach(select => {
      select.addEventListener('change', async (e) => {
        const account = e.target.getAttribute('data-account');
        const symbol = e.target.getAttribute('data-symbol');
        const val = e.target.value;
        const key = `${account}_${symbol}`;

        if (!this.localItemOverrides[key]) this.localItemOverrides[key] = {};
        this.localItemOverrides[key].note_consensus = val;

        // Update Pill CSS classes
        e.target.className = `th-select-consensus ${val.toLowerCase()}`;

        this.setSyncStatus('syncing');
        try {
          await window.ApiService.updateThaiStock(account, symbol, { note_consensus: val });
          this.setSyncStatus('saved');
        } catch (err) {
          console.error('[Live Sync Error]', err);
          this.setSyncStatus('error');
        }
      });
    });

    // 3. Performance Selects
    const performSelects = document.querySelectorAll('.th-select-perform');
    performSelects.forEach(select => {
      select.addEventListener('change', async (e) => {
        const account = e.target.getAttribute('data-account');
        const symbol = e.target.getAttribute('data-symbol');
        const val = e.target.value;
        const key = `${account}_${symbol}`;

        if (!this.localItemOverrides[key]) this.localItemOverrides[key] = {};
        this.localItemOverrides[key].company_perform = val;

        let pClass = 'neutral';
        if (val.includes('High')) pClass = 'high';
        else if (val.includes('Moderate')) pClass = 'moderate';
        else if (val.includes('Slowdown')) pClass = 'slowdown';
        else if (val.includes('Impair')) pClass = 'impair';

        e.target.className = `th-select-perform ${pClass}`;

        this.setSyncStatus('syncing');
        try {
          await window.ApiService.updateThaiStock(account, symbol, { company_perform: val });
          this.setSyncStatus('saved');
        } catch (err) {
          console.error('[Live Sync Error]', err);
          this.setSyncStatus('error');
        }
      });
    });
  },

  setSyncStatus(status) {
    const indicator = document.getElementById('th-sync-status-indicator');
    if (!indicator) return;

    if (status === 'syncing') {
      indicator.className = 'sync-indicator syncing';
      indicator.innerHTML = '<span class="sync-dot animate-pulse"></span> <span class="sync-text">🔄 Syncing to Sheets...</span>';
    } else if (status === 'saved') {
      indicator.className = 'sync-indicator';
      indicator.innerHTML = '<span class="sync-dot"></span> <span class="sync-text">🟢 Live Synced</span>';
    } else if (status === 'error') {
      indicator.className = 'sync-indicator error';
      indicator.innerHTML = '<span class="sync-dot"></span> <span class="sync-text">🔴 Sync Failed</span>';
    }
  },

  // ZONE 3: DONUT CHARTS (3.1 & 3.2)
  renderCharts(data) {
    if (!data) data = this.getAggregatedData();
    if (!data) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#F9FAFB' : '#111827';

    // 1. PP Donut Chart (Chart 3.1)
    const ppCtx = document.getElementById('ppStockDonutChart')?.getContext('2d');
    if (ppCtx) {
      if (this.charts.ppDonut) this.charts.ppDonut.destroy();

      const ppTopStocks = [...data.ppItems]
        .sort((a, b) => b.yearly_expected_dividend - a.yearly_expected_dividend);

      const labels = ppTopStocks.map(i => i.symbol);
      const values = ppTopStocks.map(i => i.yearly_expected_dividend);

      const colors = [
        '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#EC4899',
        '#8B5CF6', '#14B8A6', '#F97316', '#3B82F6', '#84CC16',
        '#64748B', '#A855F7', '#E11D48', '#0EA5E9', '#D97706',
        '#4ADE80', '#F43F5E'
      ];

      this.charts.ppDonut = new Chart(ppCtx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 1,
            borderColor: isDark ? '#16191E' : '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 10,
                font: { size: 10 },
                color: textColor
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed || 0;
                  const total = values.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ฿${window.formatCurrency(val)}/yr (${pct}%)`;
                }
              }
            }
          },
          cutout: '62%'
        }
      });
    }

    // 2. JJ Donut Chart (Chart 3.2)
    const jjCtx = document.getElementById('jjStockDonutChart')?.getContext('2d');
    if (jjCtx) {
      if (this.charts.jjDonut) this.charts.jjDonut.destroy();

      const jjTopStocks = [...data.jjItems]
        .sort((a, b) => b.yearly_expected_dividend - a.yearly_expected_dividend);

      const labels = jjTopStocks.map(i => i.symbol);
      const values = jjTopStocks.map(i => i.yearly_expected_dividend);

      const colors = [
        '#F43F5E', '#EC4899', '#8B5CF6', '#F59E0B', '#10B981',
        '#06B6D4', '#6366F1', '#14B8A6'
      ];

      this.charts.jjDonut = new Chart(jjCtx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 1,
            borderColor: isDark ? '#16191E' : '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 10,
                font: { size: 10 },
                color: textColor
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed || 0;
                  const total = values.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ฿${window.formatCurrency(val)}/yr (${pct}%)`;
                }
              }
            }
          },
          cutout: '62%'
        }
      });
    }
  },

  // ZONE 5: DRIP RETIREMENT SIMULATOR ENGINE (Chart 5.1)
  renderDRIPSimulation(data) {
    if (!data) data = this.getAggregatedData();
    if (!data) return;

    const dcaVal = Number(document.getElementById('drip-dca-input')?.value || 15000);
    const targetAge = Number(document.getElementById('drip-retire-age-input')?.value || 55);
    const divGrowthRate = Number(document.getElementById('drip-div-growth-input')?.value || 5.0) / 100;
    const capGrowthRate = Number(document.getElementById('drip-cap-growth-input')?.value || 4.0) / 100;
    const isDRIP = document.getElementById('drip-toggle')?.checked ?? true;

    const currentAge = 40; // Current Baseline
    const years = Math.max(1, targetAge - currentAge);

    let currentPortfolioValue = data.summary.total.market_value || 922195;
    let currentAnnualDividend = data.summary.total.yearly_dividend || 48344;
    let currentRealCapital = data.summary.total.real_capital_cost_basis || 703598;

    const labels = [];
    const portfolioProjection = [];
    const dividendProjection = [];
    const capitalCostProjection = [];

    const currentYear = new Date().getFullYear();

    for (let yr = 0; yr <= years; yr++) {
      const age = currentAge + yr;
      labels.push(`Age ${age} (${currentYear + yr})`);

      if (yr === 0) {
        portfolioProjection.push(Math.round(currentPortfolioValue));
        dividendProjection.push(Math.round(currentAnnualDividend));
        capitalCostProjection.push(Math.round(currentRealCapital));
      } else {
        // Annual additions
        const annualDCA = dcaVal * 12;
        currentRealCapital += annualDCA;

        // Portfolio growth: Capital appreciation + Reinvested Dividend (if DRIP) + DCA
        const capitalGain = currentPortfolioValue * capGrowthRate;
        currentAnnualDividend = currentAnnualDividend * (1 + divGrowthRate) + (annualDCA * (currentAnnualDividend / currentPortfolioValue || 0.05));
        
        if (isDRIP) {
          currentPortfolioValue = currentPortfolioValue + capitalGain + currentAnnualDividend + annualDCA;
        } else {
          currentPortfolioValue = currentPortfolioValue + capitalGain + annualDCA;
        }

        portfolioProjection.push(Math.round(currentPortfolioValue));
        dividendProjection.push(Math.round(currentAnnualDividend));
        capitalCostProjection.push(Math.round(currentRealCapital));
      }
    }

    // Target Milestone Metric Outputs
    const finalPortfolioVal = portfolioProjection[portfolioProjection.length - 1];
    const finalAnnualDiv = dividendProjection[dividendProjection.length - 1];
    const finalMonthlyDiv = finalAnnualDiv / 12;
    const finalRealCapital = capitalCostProjection[capitalCostProjection.length - 1];
    const futureYoC = finalRealCapital > 0 ? (finalAnnualDiv / finalRealCapital * 100) : 0;

    document.getElementById('drip-result-portfolio-val').innerText = `฿${(finalPortfolioVal / 1000000).toFixed(2)}M`;
    document.getElementById('drip-result-future-yoc').innerText = `${window.formatNumber(futureYoC)}%`;
    document.getElementById('drip-result-monthly-div').innerText = `฿${window.formatCurrency(finalMonthlyDiv)} / เดือน`;
    document.getElementById('drip-result-annual-div').innerText = `ปันผลรวม ฿${window.formatCurrency(finalAnnualDiv)} / ปี`;

    // Render Trajectory Chart (Chart 5.1)
    const ctx = document.getElementById('dripTrajectoryChart')?.getContext('2d');
    if (!ctx) return;

    if (this.charts.dripChart) this.charts.dripChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#9CA3AF' : '#4B5563';

    this.charts.dripChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Projected Portfolio Value (฿)',
            data: portfolioProjection,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.35,
            yAxisID: 'y'
          },
          {
            label: 'Cumulative Real Capital Invested (฿)',
            data: capitalCostProjection,
            borderColor: '#06B6D4',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.2,
            yAxisID: 'y'
          },
          {
            label: 'Annual Passive Dividend (฿/yr)',
            data: dividendProjection,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            tension: 0.35,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: isDark ? '#F9FAFB' : '#111827',
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const label = ctx.dataset.label || '';
                const val = ctx.parsed.y || 0;
                return ` ${label}: ฿${window.formatCurrency(val)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10 },
              callback: (val) => `฿${(val / 1000000).toFixed(1)}M`
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#F59E0B',
              font: { size: 10 },
              callback: (val) => `฿${window.formatCurrency(val)}`
            }
          }
        }
      }
    });
  }
};
