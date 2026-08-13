// View 3: Owner Race — PP vs JJ Comparison

window.OwnerBreakdownView = {
  raceChart: null,
  raceRange: 'ALL',
  activeOwner: 'TOTAL',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Portfolio view toggle buttons
    document.querySelectorAll('.owner-filter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.owner-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.activeOwner = e.currentTarget.getAttribute('data-owner');
        this.render();
      });
    });

    // Race chart time range buttons
    document.querySelectorAll('[data-chart="race"]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-chart="race"]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.raceRange = e.currentTarget.getAttribute('data-range');
        this.renderRaceChart(window.AppState.snapshot);
      });
    });
  },

  filterByRange(snapshot, range) {
    if (!snapshot || snapshot.length === 0) return snapshot;
    let count = snapshot.length;
    if (range === '1Y') count = Math.min(12, snapshot.length);
    else if (range === '3Y') count = Math.min(36, snapshot.length);
    else if (range === '5Y') count = Math.min(60, snapshot.length);
    return snapshot.slice(snapshot.length - count);
  },

  render() {
    const { summary, snapshot } = window.AppState;
    if (!snapshot || snapshot.length === 0) return;

    const latest = snapshot[snapshot.length - 1];

    // PP values (prioritize live summary if available)
    const ppNetWorth   = summary?.pp?.market_value  || latest.pp_ondate  || 0;
    const ppCapital    = summary?.pp?.cost          || latest.pp_cost    || 0;
    const ppUnrealized = summary?.pp?.unrealized_pl ?? latest.pp_pl      ?? 0;
    const ppPLPct      = ppCapital > 0 ? (ppUnrealized / ppCapital * 100) : 0;

    // JJ values
    const jjNetWorth   = summary?.jj?.market_value  || latest.jj_ondate  || 0;
    const jjCapital    = summary?.jj?.cost          || latest.jj_cost    || 0;
    const jjUnrealized = summary?.jj?.unrealized_pl ?? latest.jj_pl      ?? 0;
    const jjPLPct      = jjCapital > 0 ? (jjUnrealized / jjCapital * 100) : 0;

    // Update PP card
    this._setText('pp-card-networth', window.formatCurrency(ppNetWorth));
    this._setText('pp-card-capital',  window.formatCurrency(ppCapital));
    const ppPlEl = document.getElementById('pp-card-pl');
    if (ppPlEl) {
      ppPlEl.textContent = `${ppUnrealized >= 0 ? '+' : ''}฿${window.formatCurrency(ppUnrealized)} (${ppPLPct.toFixed(1)}%)`;
      ppPlEl.style.color = ppUnrealized >= 0 ? '#10b981' : '#f43f5e';
    }

    // Update JJ card
    this._setText('jj-card-networth', window.formatCurrency(jjNetWorth));
    this._setText('jj-card-capital',  window.formatCurrency(jjCapital));
    const jjPlEl = document.getElementById('jj-card-pl');
    if (jjPlEl) {
      jjPlEl.textContent = `${jjUnrealized >= 0 ? '+' : ''}฿${window.formatCurrency(jjUnrealized)} (${jjPLPct.toFixed(1)}%)`;
      jjPlEl.style.color = jjUnrealized >= 0 ? '#10b981' : '#f43f5e';
    }

    // Leader banner
    const leaderBanner = document.getElementById('race-leader-banner');
    if (leaderBanner) {
      const leader = jjNetWorth > ppNetWorth ? 'JJ' : 'PP';
      const diff   = Math.abs(jjNetWorth - ppNetWorth);
      leaderBanner.innerHTML = leader === 'JJ'
        ? `🏆 JJ นำอยู่ ฿${window.formatCurrency(diff)}`
        : `🏆 PP นำอยู่ ฿${window.formatCurrency(diff)}`;
      leaderBanner.className = leader === 'JJ'
        ? 'px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30 text-amber-300 font-bold text-sm rounded-xl'
        : 'px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 text-cyan-300 font-bold text-sm rounded-xl';
    }

    this.renderRaceChart(snapshot);
  },

  renderRaceChart(snapshot) {
    const ctx = document.getElementById('ppJjRaceChart');
    if (!ctx) return;

    const filtered = this.filterByRange(snapshot, this.raceRange);
    const labels = filtered.map(s => s.year_month || s.date);

    // Determine which datasets to show based on activeOwner filter
    const showPP = this.activeOwner === 'TOTAL' || this.activeOwner === 'PP';
    const showJJ = this.activeOwner === 'TOTAL' || this.activeOwner === 'JJ';

    const datasets = [];

    if (showPP) {
      datasets.push({
        label: 'PP Net Worth (มูลค่าพอร์ต PP)',
        data: filtered.map(s => s.pp_ondate || 0),
        borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.08)',
        fill: false, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5
      });
      datasets.push({
        label: 'PP Capital (เงินต้น PP)',
        data: filtered.map(s => s.pp_cost || 0),
        borderColor: '#22d3ee', borderDash: [5, 4],
        backgroundColor: 'transparent',
        fill: false, tension: 0.2, borderWidth: 1.5, pointRadius: 0
      });
    }

    if (showJJ) {
      datasets.push({
        label: 'JJ Net Worth (มูลค่าพอร์ต JJ)',
        data: filtered.map(s => s.jj_ondate || 0),
        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
        fill: false, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5
      });
      datasets.push({
        label: 'JJ Capital (เงินต้น JJ)',
        data: filtered.map(s => s.jj_cost || 0),
        borderColor: '#f59e0b', borderDash: [5, 4],
        backgroundColor: 'transparent',
        fill: false, tension: 0.2, borderWidth: 1.5, pointRadius: 0
      });
    }

    if (this.raceChart) this.raceChart.destroy();

    this.raceChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#9ca3af', font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyleWidth: 16 }
          },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ฿${window.formatCurrency(c.parsed.y)}` } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', maxTicksLimit: 14 } },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#6b7280', callback: v => v >= 1e6 ? `฿${(v/1e6).toFixed(1)}M` : `฿${(v/1e3).toFixed(0)}K` }
          }
        }
      }
    });
  },

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
};
