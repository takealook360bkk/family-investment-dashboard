// View 1: Overview & Financial Freedom Motivation

window.OverviewView = {
  wealthGrowthChart: null,
  monthlyInflowChart: null,
  wealthRange: 'ALL',

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.querySelectorAll('.roi-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.roi-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        window.AppState.setRoiPeriod(e.target.getAttribute('data-period'));
      });
    });

    const targetInput = document.getElementById('milestone-target-input');
    const returnInput = document.getElementById('milestone-return-input');
    const yearsInput  = document.getElementById('milestone-years-input');

    const updateMilestone = () => {
      // v3.1 Update: Default fallback updated to 27,500,000 and rate 5.0
      const target = parseFloat((targetInput?.value || '27500000').replace(/,/g, '')) || 27500000;
      const rate   = parseFloat(returnInput?.value || 5) || 5;
      window.AppState.setMilestoneParams(target, rate);
    };
    targetInput?.addEventListener('change', updateMilestone);
    returnInput?.addEventListener('change', updateMilestone);
    yearsInput?.addEventListener('change', () => this.render());

    // Wealth chart range buttons
    document.querySelectorAll('[data-chart="wealth"]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-chart="wealth"]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.wealthRange = e.target.getAttribute('data-range');
        this.renderWealthGrowthChart(window.AppState.snapshot, window.AppState.selectedOwner);
      });
    });
  },

  render() {
    const { summary, snapshot, selectedOwner, selectedRoiPeriod } = window.AppState;
    if (!snapshot || snapshot.length === 0) return;

    const latest = snapshot[snapshot.length - 1];
    const prev   = snapshot.length > 1 ? snapshot[snapshot.length - 2] : latest;

    // Use live summary (from Master_Asset Q3:T5) as primary source
    let netWorth  = summary?.total?.market_value  || latest.total_ondate;
    let capital   = summary?.total?.cost          || latest.total_cost;
    let unrealized= summary?.total?.unrealized_pl ?? latest.total_pl;
    let realized  = summary?.total?.realized_pl   ?? 0;

    if (selectedOwner === 'PP') {
      netWorth   = summary?.pp?.market_value  || latest.pp_ondate;
      capital    = summary?.pp?.cost          || latest.pp_cost;
      unrealized = summary?.pp?.unrealized_pl ?? latest.pp_pl;
      realized   = summary?.pp?.realized_pl   ?? 0;
    } else if (selectedOwner === 'JJ') {
      netWorth   = summary?.jj?.market_value  || latest.jj_ondate;
      capital    = summary?.jj?.cost          || latest.jj_cost;
      unrealized = summary?.jj?.unrealized_pl ?? latest.jj_pl;
      realized   = summary?.jj?.realized_pl   ?? 0;
    }

    const wealthGain = unrealized + realized;

    // Update KPIs
    document.getElementById('kpi-net-worth').textContent    = window.formatCurrency(netWorth);
    document.getElementById('kpi-capital').textContent      = window.formatCurrency(capital);
    document.getElementById('kpi-wealth-gain').textContent  = window.formatCurrency(wealthGain);

    // ROI as CAGR
    const roiPct  = this.calculateCAGR(snapshot, selectedRoiPeriod, selectedOwner, netWorth, capital);
    const roiElem = document.getElementById('kpi-roi-val');
    if (roiElem) {
      roiElem.textContent = `${roiPct >= 0 ? '+' : ''}${roiPct.toFixed(2)}%`;
      roiElem.style.color = roiPct >= 0 ? '#10b981' : '#f43f5e';
    }
    const roiSub = document.getElementById('kpi-roi-sub');
    if (roiSub) {
      roiSub.textContent = selectedRoiPeriod === 'ALL'
        ? `CAGR ทบต้นเฉลี่ยต่อปี (${(snapshot.length / 12).toFixed(1)} ปี)`
        : `CAGR ทบต้นเฉลี่ยต่อปี (${selectedRoiPeriod})`;
    }

    this.renderMilestone(netWorth);
    this.renderWealthGrowthChart(snapshot, selectedOwner);
    this.renderMonthlyInflowChart(snapshot, selectedOwner);
  },

  // CAGR = (End/Start)^(1/years) - 1
  calculateCAGR(snapshot, period, owner, currentNetWorth, currentCapital) {
    if (!snapshot || snapshot.length === 0) return 0;

    let monthsBack = snapshot.length - 1;
    if (period === '1Y') monthsBack = Math.min(12, snapshot.length - 1);
    if (period === '3Y') monthsBack = Math.min(36, snapshot.length - 1);
    if (period === '5Y') monthsBack = Math.min(60, snapshot.length - 1);

    const pastIdx = snapshot.length - 1 - monthsBack;
    const past    = snapshot[pastIdx];
    const years   = monthsBack / 12;

    const endNav   = snapshot[snapshot.length - 1].nav_per_unit || 1;
    const startNav = past.nav_per_unit || 1;

    if (period === 'ALL') {
      // Use capital-based CAGR: (currentNW / capital)^(1/years) - 1
      const totalYears = snapshot.length / 12;
      if (currentCapital <= 0 || totalYears <= 0) return 0;
      return (Math.pow(currentNetWorth / currentCapital, 1 / totalYears) - 1) * 100;
    }

    if (startNav <= 0 || years <= 0) return 0;
    return (Math.pow(endNav / startNav, 1 / years) - 1) * 100;
  },

  // Milestone: FV of current NW growing at rate for N years, vs target
  renderMilestone(currentNetWorth) {
    // v3.1 Update: Default values updated to target 27.5M, rate 5%, years 20
    const target = window.AppState.milestoneTarget || 27500000;
    const rate   = (window.AppState.expectedReturnRate || 5) / 100;
    const years  = parseFloat(document.getElementById('milestone-years-input')?.value || 20) || 20;

    // FV of current portfolio alone (without adding more savings)
    const fv = currentNetWorth * Math.pow(1 + rate, years);
    const progressPct = Math.min(100, Math.max(0, (fv / target) * 100));

    const bar = document.getElementById('milestone-progress-bar');
    const pct = document.getElementById('milestone-progress-pct');
    const fvElem = document.getElementById('milestone-fv-val');

    if (bar) bar.style.width = `${progressPct.toFixed(1)}%`;
    if (pct) pct.textContent = `${progressPct.toFixed(1)}%`;
    if (fvElem) fvElem.textContent = `฿${window.formatCurrency(fv)}`;
  },

  // Filter snapshot by range
  filterByRange(snapshot, range) {
    if (!snapshot || snapshot.length === 0) return snapshot;
    let count = snapshot.length;
    if (range === '1Y') count = Math.min(12, snapshot.length);
    else if (range === '3Y') count = Math.min(36, snapshot.length);
    else if (range === '5Y') count = Math.min(60, snapshot.length);
    return snapshot.slice(snapshot.length - count);
  },

  renderWealthGrowthChart(snapshot, owner) {
    const ctx = document.getElementById('wealthGrowthChart');
    if (!ctx) return;

    const filtered = this.filterByRange(snapshot, this.wealthRange);
    const labels = filtered.map(s => s.year_month || s.date);

    let netWorthData = filtered.map(s => s.total_ondate);
    let capitalData  = filtered.map(s => s.total_cost);

    if (owner === 'PP') {
      netWorthData = filtered.map(s => s.pp_ondate);
      capitalData  = filtered.map(s => s.pp_cost);
    } else if (owner === 'JJ') {
      netWorthData = filtered.map(s => s.jj_ondate);
      capitalData  = filtered.map(s => s.jj_cost);
    }

    if (this.wealthGrowthChart) this.wealthGrowthChart.destroy();

    // Patch v3.2: Dynamic Chart Colors based on Theme
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    const textColor = isLight ? '#6B7280' : '#8E95A2';

    this.wealthGrowthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Worth (มูลค่าพอร์ตจริง)',
            data: netWorthData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 6
          },
          {
            label: 'Capital Deposited (เงินต้นสะสม)',
            data: capitalData,
            borderColor: '#4ade80',
            backgroundColor: 'transparent',
            borderDash: [6, 4], tension: 0.2, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: {
              color: textColor, font: { family: 'Inter' },
              usePointStyle: true, pointStyle: 'line', pointStyleWidth: 24
            }
          },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: ฿${window.formatCurrency(c.parsed.y)}` } }
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 14 } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: v => v >= 1e6 ? `฿${(v/1e6).toFixed(1)}M` : `฿${(v/1e3).toFixed(0)}K` }
          }
        }
      }
    });
  },

  renderMonthlyInflowChart(snapshot, owner) {
    const ctx = document.getElementById('monthlyInflowChart');
    if (!ctx) return;

    const recent = snapshot.slice(-24);
    const labels = recent.map(s => s.year_month || s.date);

    let inflowData = recent.map(s => s.total_inflow || 0);
    if (owner === 'PP') inflowData = recent.map(s => s.pp_inflow || 0);
    if (owner === 'JJ') inflowData = recent.map(s => s.jj_inflow || 0);

    if (this.monthlyInflowChart) this.monthlyInflowChart.destroy();

    // Patch v3.2: Dynamic Chart Colors based on Theme
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    const textColor = isLight ? '#6B7280' : '#8E95A2';

    this.monthlyInflowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'เงินต้นเติมใหม่รายเดือน (฿)',
          data: inflowData,
          backgroundColor: 'rgba(74,222,128,0.65)',
          hoverBackgroundColor: '#4ade80',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `เงินเติมเพิ่ม: ฿${window.formatCurrency(c.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, maxTicksLimit: 12 } },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, callback: v => `฿${(v/1e3).toFixed(0)}K` }
          }
        }
      }
    });
  }
};
