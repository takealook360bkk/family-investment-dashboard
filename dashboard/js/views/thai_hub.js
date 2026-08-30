// View 5: Thai Stock Hub & Dividend / DRIP Wealth Simulator
// Patch v3.4.1: Upgraded dual-table layout, privacy-safe demo dataset, and enhanced retirement simulator

window.ThaiHubView = {
  charts: {
    ppPie: null,
    jjPie: null,
    dripChart: null
  },
  
  debounceTimers: {},
  localItemOverrides: {}, // Key: `${account}_${symbol}` -> { expected_dps, note_consensus, company_perform }

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // DRIP Simulator Controls
    const initValInput = document.getElementById('th-sim-init-val');
    const ageInput = document.getElementById('th-sim-current-age');
    const retireAgeInput = document.getElementById('th-sim-retire-age');
    const dcaInput = document.getElementById('th-sim-dca');
    const stepUpInput = document.getElementById('th-sim-stepup');
    const yieldInput = document.getElementById('th-sim-yield');
    const growthInput = document.getElementById('th-sim-growth');
    const dripToggle = document.getElementById('drip-toggle');
    const resetBtn = document.getElementById('th-sim-reset-btn');

    const handleSimChange = () => {
      this.renderDRIPSimulation();
    };

    [initValInput, ageInput, retireAgeInput, dcaInput, stepUpInput, yieldInput, growthInput, dripToggle].forEach(el => {
      if (el) {
        el.addEventListener('input', handleSimChange);
        el.addEventListener('change', handleSimChange);
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const data = this.getAggregatedData();
        if (data && initValInput) {
          initValInput.value = Math.round(data.summary.total.market_value);
        }
        if (ageInput) ageInput.value = 33;
        if (retireAgeInput) retireAgeInput.value = 55;
        if (dcaInput) dcaInput.value = 15000;
        if (stepUpInput) stepUpInput.value = 3.0;
        if (yieldInput && data) yieldInput.value = data.summary.total.market_yield_pct.toFixed(1);
        if (growthInput) growthInput.value = 4.0;
        if (dripToggle) dripToggle.checked = true;
        this.renderDRIPSimulation();
      });
    }

    // Listen for theme change to update chart colors
    window.AppState.subscribe((event) => {
      if (event === 'themeChanged') {
        this.renderCharts();
        this.renderDRIPSimulation();
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

    // Card 1.1 Thai Stock Amount
    const mktValEl = document.getElementById('th-hero-market-val');
    if (mktValEl) mktValEl.innerText = `฿${window.formatCurrency(total.market_value)}`;

    const realCapEl = document.getElementById('th-hero-real-capital');
    if (realCapEl) realCapEl.innerText = `฿${window.formatCurrency(total.real_capital_cost_basis)}`;

    const costAmtEl = document.getElementById('th-hero-cost-amt');
    if (costAmtEl) costAmtEl.innerText = `฿${window.formatCurrency(total.total_cost)}`;

    const netGainEl = document.getElementById('th-hero-net-gain');
    if (netGainEl) {
      netGainEl.innerText = `${total.historical_net_gain >= 0 ? '+' : ''}฿${window.formatCurrency(total.historical_net_gain)}`;
      netGainEl.className = `text-sm font-bold ${total.historical_net_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    // Card 1.2 Annual Dividend Yield
    const divYrEl = document.getElementById('th-hero-dividend-yr');
    if (divYrEl) divYrEl.innerText = `฿${window.formatCurrency(total.yearly_dividend)}`;

    const yocEl = document.getElementById('th-hero-yoc-pct');
    if (yocEl) yocEl.innerText = `${window.formatNumber(total.yoc_pct)}%`;

    const mktYieldEl = document.getElementById('th-hero-mkt-yield-pct');
    if (mktYieldEl) mktYieldEl.innerText = `${window.formatNumber(total.market_yield_pct)}%`;
  },

  // ZONE 2: OWNER HUBS
  renderZone2OwnerHubs(data) {
    const pp = data.summary.pp;
    const jj = data.summary.jj;

    // PP Card
    const ppMvEl = document.getElementById('th-pp-market-val');
    if (ppMvEl) ppMvEl.innerText = `฿${window.formatCurrency(pp.market_value)}`;

    const ppCostEl = document.getElementById('th-pp-cost-amt');
    if (ppCostEl) ppCostEl.innerText = `฿${window.formatCurrency(pp.total_cost)}`;

    const ppDivEl = document.getElementById('th-pp-dividend-val');
    if (ppDivEl) ppDivEl.innerText = `฿${window.formatCurrency(pp.yearly_dividend)}`;

    // JJ Card
    const jjMvEl = document.getElementById('th-jj-market-val');
    if (jjMvEl) jjMvEl.innerText = `฿${window.formatCurrency(jj.market_value)}`;

    const jjCostEl = document.getElementById('th-jj-cost-amt');
    if (jjCostEl) jjCostEl.innerText = `฿${window.formatCurrency(jj.total_cost)}`;

    const jjDivEl = document.getElementById('th-jj-dividend-val');
    if (jjDivEl) jjDivEl.innerText = `฿${window.formatCurrency(jj.yearly_dividend)}`;
  },

  // ZONE 4: DUAL TABLES (PP & JJ) WITH COMPLETE ROW SUMMARIES
  renderZone4Tables(data) {
    const ppTbody = document.getElementById('th-pp-table-body');
    const jjTbody = document.getElementById('th-jj-table-body');

    // 1. Render PP Table
    if (ppTbody) {
      const sortedPP = [...data.ppItems].sort((a, b) => (b.market_value || 0) - (a.market_value || 0));
      let ppHtml = '';
      let ppQtySum = 0;
      let ppMvSum = 0;
      let ppUnplSum = 0;
      let ppDivSum = 0;
      let ppCostSum = 0;

      sortedPP.forEach(item => {
        ppQtySum += (item.quantity || 0);
        ppMvSum += (item.market_value || 0);
        ppUnplSum += (item.unrealized_pl || 0);
        ppDivSum += (item.yearly_expected_dividend || 0);
        ppCostSum += (item.total_cost || 0);

        ppHtml += this._generateTableRowHtml(item);
      });

      ppTbody.innerHTML = ppHtml;

      // Update PP Count badge & Summary row
      const ppCountBadge = document.getElementById('th-pp-count-badge');
      if (ppCountBadge) ppCountBadge.innerText = `${sortedPP.length} Stocks`;

      const ppSumQty = document.getElementById('th-pp-sum-qty');
      if (ppSumQty) ppSumQty.innerText = window.formatCurrency(ppQtySum);

      const ppSumMv = document.getElementById('th-pp-sum-mv');
      if (ppSumMv) ppSumMv.innerText = `฿${window.formatCurrency(ppMvSum)}`;

      const ppSumUnpl = document.getElementById('th-pp-sum-unpl');
      if (ppSumUnpl) {
        ppSumUnpl.innerText = `${ppUnplSum >= 0 ? '+' : ''}฿${window.formatCurrency(ppUnplSum)}`;
        ppSumUnpl.className = `px-3 py-2.5 text-right font-bold ${ppUnplSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
      }

      const ppSumDiv = document.getElementById('th-pp-sum-div');
      if (ppSumDiv) ppSumDiv.innerText = `฿${window.formatCurrency(ppDivSum)}`;

      const ppYoC = data.summary.pp.real_capital_cost_basis > 0 ? (ppDivSum / data.summary.pp.real_capital_cost_basis * 100) : 0;
      const ppSumYoc = document.getElementById('th-pp-sum-yoc');
      if (ppSumYoc) ppSumYoc.innerText = `${window.formatNumber(ppYoC)}%`;

      const ppMktYield = ppMvSum > 0 ? (ppDivSum / ppMvSum * 100) : 0;
      const ppSumMktYield = document.getElementById('th-pp-sum-mktyield');
      if (ppSumMktYield) ppSumMktYield.innerText = `${window.formatNumber(ppMktYield)}%`;
    }

    // 2. Render JJ Table
    if (jjTbody) {
      const sortedJJ = [...data.jjItems].sort((a, b) => (b.market_value || 0) - (a.market_value || 0));
      let jjHtml = '';
      let jjQtySum = 0;
      let jjMvSum = 0;
      let jjUnplSum = 0;
      let jjDivSum = 0;
      let jjCostSum = 0;

      sortedJJ.forEach(item => {
        jjQtySum += (item.quantity || 0);
        jjMvSum += (item.market_value || 0);
        jjUnplSum += (item.unrealized_pl || 0);
        jjDivSum += (item.yearly_expected_dividend || 0);
        jjCostSum += (item.total_cost || 0);

        jjHtml += this._generateTableRowHtml(item);
      });

      jjTbody.innerHTML = jjHtml;

      // Update JJ Count badge & Summary row
      const jjCountBadge = document.getElementById('th-jj-count-badge');
      if (jjCountBadge) jjCountBadge.innerText = `${sortedJJ.length} Stocks`;

      const jjSumQty = document.getElementById('th-jj-sum-qty');
      if (jjSumQty) jjSumQty.innerText = window.formatCurrency(jjQtySum);

      const jjSumMv = document.getElementById('th-jj-sum-mv');
      if (jjSumMv) jjSumMv.innerText = `฿${window.formatCurrency(jjMvSum)}`;

      const jjSumUnpl = document.getElementById('th-jj-sum-unpl');
      if (jjSumUnpl) {
        jjSumUnpl.innerText = `${jjUnplSum >= 0 ? '+' : ''}฿${window.formatCurrency(jjUnplSum)}`;
        jjSumUnpl.className = `px-3 py-2.5 text-right font-bold ${jjUnplSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
      }

      const jjSumDiv = document.getElementById('th-jj-sum-div');
      if (jjSumDiv) jjSumDiv.innerText = `฿${window.formatCurrency(jjDivSum)}`;

      const jjYoC = data.summary.jj.real_capital_cost_basis > 0 ? (jjDivSum / data.summary.jj.real_capital_cost_basis * 100) : 0;
      const jjSumYoc = document.getElementById('th-jj-sum-yoc');
      if (jjSumYoc) jjSumYoc.innerText = `${window.formatNumber(jjYoC)}%`;

      const jjMktYield = jjMvSum > 0 ? (jjDivSum / jjMvSum * 100) : 0;
      const jjSumMktYield = document.getElementById('th-jj-sum-mktyield');
      if (jjSumMktYield) jjSumMktYield.innerText = `${window.formatNumber(jjMktYield)}%`;
    }

    this.bindTableInputs();
  },

  _generateTableRowHtml(item) {
    const isUnplPos = (item.unrealized_pl || 0) >= 0;
    const unplClass = isUnplPos ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold';

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

    return `
      <tr class="hover:bg-slate-800/30 transition-colors border-b border-gray-800/60 text-xs">
        <td class="px-3 py-2.5 font-bold">
          <span class="text-cyan-400 font-mono">${item.symbol}</span>
        </td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-300">${window.formatCurrency(item.quantity)}</td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-300">${window.formatNumber(item.avg_cost_price)}</td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-100 font-semibold">${window.formatNumber(item.current_price)}</td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-100 font-bold">฿${window.formatCurrency(item.market_value)}</td>
        <td class="px-3 py-2.5 text-right font-mono ${unplClass}">
          ${isUnplPos ? '+' : ''}฿${window.formatCurrency(item.unrealized_pl)}
          <span class="text-[10px] block opacity-80">${isUnplPos ? '+' : ''}${window.formatNumber(item.unrealized_pl_pct)}%</span>
        </td>
        <td class="px-3 py-2.5 text-center">
          <input type="number" step="0.01" min="0" 
            class="th-input-dps" 
            data-account="${item.account}" 
            data-symbol="${item.symbol}" 
            value="${Number(item.expected_dps).toFixed(2)}">
        </td>
        <td class="px-3 py-2.5 text-right font-mono text-emerald-400 font-bold">฿${window.formatCurrency(item.yearly_expected_dividend)}</td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-300 font-semibold">${window.formatNumber(item.yield_on_cost)}%</td>
        <td class="px-3 py-2.5 text-right font-mono text-gray-300 font-semibold">${window.formatNumber(item.current_price_yield)}%</td>
        <td class="px-3 py-2.5 text-center">
          <select class="th-select-consensus ${consensusClass}" data-account="${item.account}" data-symbol="${item.symbol}">
            <option value="Buy" ${consensus === 'Buy' ? 'selected' : ''}>🟢 Buy</option>
            <option value="Hold" ${consensus === 'Hold' ? 'selected' : ''}>🟡 Hold</option>
            <option value="Sell" ${consensus === 'Sell' ? 'selected' : ''}>🔴 Sell</option>
          </select>
        </td>
        <td class="px-3 py-2.5 text-center">
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
        const aggregated = this.getAggregatedData();
        this.renderZone1HeroKPIs(aggregated);
        this.renderZone2OwnerHubs(aggregated);
        this.renderDRIPSimulation(aggregated);

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

  // ZONE 3: EQUAL-SIZED PIE CHARTS (BY MARKET VALUE, NO LEGEND, IN-SLICE LABELS)
  renderCharts(data) {
    if (!data) data = this.getAggregatedData();
    if (!data) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const borderColor = isDark ? '#16191E' : '#FFFFFF';

    // Custom In-Slice Labels Plugin
    const inSliceLabelsPlugin = {
      id: 'inSliceLabels',
      afterDraw(chart) {
        const { ctx, data: chartData } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;

        const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
        if (total === 0) return;

        ctx.save();
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        meta.data.forEach((element, index) => {
          const value = chartData.datasets[0].data[index];
          const pct = (value / total) * 100;
          // Only show label if slice is >= 4.5% to avoid cluttering small slices
          if (pct >= 4.5) {
            const { x, y } = element.tooltipPosition();
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 4;
            ctx.fillText(chartData.labels[index], x, y);
          }
        });
        ctx.restore();
      }
    };

    const colors = [
      '#06B6D4', '#10B981', '#F59E0B', '#6366F1', '#EC4899',
      '#8B5CF6', '#14B8A6', '#F97316', '#3B82F6', '#84CC16',
      '#64748B', '#A855F7', '#E11D48', '#0EA5E9', '#D97706',
      '#4ADE80', '#F43F5E'
    ];

    // 1. PP Pie Chart (Weighted by Market Value)
    const ppCtx = document.getElementById('ppStockDonutChart')?.getContext('2d');
    if (ppCtx) {
      if (this.charts.ppPie) this.charts.ppPie.destroy();

      const ppSorted = [...data.ppItems].sort((a, b) => (b.market_value || 0) - (a.market_value || 0));
      const labels = ppSorted.map(i => i.symbol);
      const values = ppSorted.map(i => i.market_value || 0);
      const totalMv = values.reduce((a, b) => a + b, 0);

      this.charts.ppPie = new Chart(ppCtx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 1.5,
            borderColor: borderColor
          }]
        },
        plugins: [inSliceLabelsPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed || 0;
                  const pct = totalMv > 0 ? (val / totalMv * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ฿${window.formatCurrency(val)} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. JJ Pie Chart (Weighted by Market Value)
    const jjCtx = document.getElementById('jjStockDonutChart')?.getContext('2d');
    if (jjCtx) {
      if (this.charts.jjPie) this.charts.jjPie.destroy();

      const jjSorted = [...data.jjItems].sort((a, b) => (b.market_value || 0) - (a.market_value || 0));
      const labels = jjSorted.map(i => i.symbol);
      const values = jjSorted.map(i => i.market_value || 0);
      const totalMv = values.reduce((a, b) => a + b, 0);

      this.charts.jjPie = new Chart(jjCtx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 1.5,
            borderColor: borderColor
          }]
        },
        plugins: [inSliceLabelsPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.parsed || 0;
                  const pct = totalMv > 0 ? (val / totalMv * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ฿${window.formatCurrency(val)} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }
  },

  // ZONE 5: DIVIDEND DRIP & WEALTH RETIREMENT SIMULATOR
  renderDRIPSimulation(data) {
    if (!data) data = this.getAggregatedData();
    if (!data) return;

    const initialValInput = document.getElementById('th-sim-init-val');
    const initPortValue = Number(initialValInput?.value || data.summary.total.market_value || 488110);
    const currentAge = Number(document.getElementById('th-sim-current-age')?.value || 33);
    const targetAge = Number(document.getElementById('th-sim-retire-age')?.value || 55);
    const monthlyDCA = Number(document.getElementById('th-sim-dca')?.value || 15000);
    const stepUpRate = Number(document.getElementById('th-sim-stepup')?.value || 3.0) / 100;
    const divYieldRate = Number(document.getElementById('th-sim-yield')?.value || 4.6) / 100;
    const capGrowthRate = Number(document.getElementById('th-sim-growth')?.value || 4.0) / 100;
    const isDRIP = document.getElementById('drip-toggle')?.checked ?? true;

    const years = Math.max(1, targetAge - currentAge);

    let runningPortfolioValue = initPortValue;
    let runningCapitalCost = data.summary.total.real_capital_cost_basis || (initPortValue * 0.86);

    const labels = [];
    const portfolioProjection = [];
    const dividendProjection = [];
    const capitalCostProjection = [];

    const currentYear = new Date().getFullYear();

    for (let yr = 0; yr <= years; yr++) {
      const age = currentAge + yr;
      labels.push(`Age ${age} (${currentYear + yr})`);

      if (yr === 0) {
        portfolioProjection.push(Math.round(runningPortfolioValue));
        dividendProjection.push(Math.round(runningPortfolioValue * divYieldRate));
        capitalCostProjection.push(Math.round(runningCapitalCost));
      } else {
        // Step-up annual DCA
        const annualDCA = (monthlyDCA * 12) * Math.pow(1 + stepUpRate, yr - 1);
        runningCapitalCost += annualDCA;

        const yearDiv = runningPortfolioValue * divYieldRate;
        const capitalGain = runningPortfolioValue * capGrowthRate;

        if (isDRIP) {
          runningPortfolioValue = runningPortfolioValue + capitalGain + yearDiv + annualDCA;
        } else {
          runningPortfolioValue = runningPortfolioValue + capitalGain + annualDCA;
        }

        portfolioProjection.push(Math.round(runningPortfolioValue));
        dividendProjection.push(Math.round(runningPortfolioValue * divYieldRate));
        capitalCostProjection.push(Math.round(runningCapitalCost));
      }
    }

    // Target Milestone Metric Outputs
    const finalPortfolioVal = portfolioProjection[portfolioProjection.length - 1];
    const finalAnnualDiv = finalPortfolioVal * divYieldRate;
    const finalMonthlyDiv = finalAnnualDiv / 12;
    const finalRealCapital = capitalCostProjection[capitalCostProjection.length - 1];
    const futureYoC = finalRealCapital > 0 ? (finalAnnualDiv / finalRealCapital * 100) : 0;

    const resPortEl = document.getElementById('drip-result-portfolio-val');
    if (resPortEl) resPortEl.innerText = `฿${(finalPortfolioVal / 1000000).toFixed(2)}M`;

    const resMoDivEl = document.getElementById('drip-result-monthly-div');
    if (resMoDivEl) resMoDivEl.innerText = `฿${window.formatCurrency(finalMonthlyDiv)} / mo`;

    const resYrDivEl = document.getElementById('drip-result-annual-div');
    if (resYrDivEl) resYrDivEl.innerText = `฿${window.formatCurrency(finalAnnualDiv)} / yr`;

    const resYocEl = document.getElementById('drip-result-future-yoc');
    if (resYocEl) resYocEl.innerText = `YoC: ${window.formatNumber(futureYoC)}%`;

    // Render Trajectory Chart
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
            label: 'Cumulative Capital Invested (฿)',
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
              font: { family: 'Inter', size: 11 }
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
            ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'Inter', size: 10 },
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
              font: { family: 'Inter', size: 10 },
              callback: (val) => `฿${window.formatCurrency(val)}`
            }
          }
        }
      }
    });
  }
};
