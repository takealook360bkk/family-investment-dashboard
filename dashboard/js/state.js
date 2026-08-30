// Central State Management for Family Investment Portfolio Dashboard

window.AppState = {
  // Current user info & token
  user: null,
  token: null,
  isLoggedIn: false,
  isDemoMode: true,

  // Selected filter state
  selectedOwner: 'TOTAL', // 'TOTAL', 'PP', 'JJ'
  selectedRoiPeriod: 'ALL', // '1Y', '3Y', '5Y', 'ALL'

  // Data cache
  summary: null,
  assets: [],
  snapshot: [],
  thaiStocks: { summary: null, items: [] },

  // Financial Freedom Milestone inputs
  // v3.1 Update: Default Target Wealth updated to 27.5M and Return to 5%
  milestoneTarget: 27500000, // Default 27.5M THB
  expectedReturnRate: 5.0,   // Default 5% p.a.

  // Event Listeners
  _listeners: [],

  subscribe(fn) {
    this._listeners.push(fn);
  },

  notify(event, payload) {
    this._listeners.forEach(fn => fn(event, payload));
  },

  setOwner(owner) {
    this.selectedOwner = owner;
    this.notify('ownerChanged', owner);
  },

  setRoiPeriod(period) {
    this.selectedRoiPeriod = period;
    this.notify('roiPeriodChanged', period);
  },

  setMilestoneParams(target, rate) {
    this.milestoneTarget = target;
    this.expectedReturnRate = rate;
    this.notify('milestoneChanged', { target, rate });
  },

  setData({ summary, assets, snapshot, thaiStocks = { summary: null, items: [] }, isDemo = false }) {
    this.summary = summary;
    this.assets = assets;
    this.snapshot = snapshot;
    this.thaiStocks = thaiStocks;
    this.isDemoMode = isDemo;
    this.notify('dataLoaded', { summary, assets, snapshot, thaiStocks, isDemo });
  }
};

// Generate realistic mock data for instant offline demo/preview
window.generateMockData = function() {
  // v3.1 Update: Scaled-down demo mode mock data to realistic family portfolio base (~1,000,000 THB)
  const startDate = new Date(2016, 11, 31); // Dec 2016
  const endDate = new Date(2026, 6, 31);   // Jul 2026
  
  const snapshot = [];
  let ppCapital = 400000; // v3.1: was 100,000 -> now 400,000
  let jjCapital = 300000; // v3.1: was 80,000 -> now 300,000
  let ppOndate = 408000;  // v3.1: adjusted proportionally to new capital base
  let jjOndate = 306000;  // v3.1: adjusted proportionally to new capital base
  let navPerUnit = 10.0;

  const totalMonths = 116;
  
  let curr = new Date(startDate);
  for (let i = 0; i <= totalMonths; i++) {
    const dateStr = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0') + '-' + String(curr.getDate()).padStart(2, '0');
    
    // Add monthly contributions
    // v3.1 Update: Adjust formulas to average 3k-4k (PP) and 2k-3k (JJ) THB/month
    const ppInflow = Math.round(3500 + Math.sin(i / 3) * 500);
    const jjInflow = Math.round(2500 + Math.cos(i / 4) * 500);
    
    ppCapital += ppInflow;
    jjCapital += jjInflow;
    
    // Return fluctuations
    const monthlyReturn = 0.005 + (Math.sin(i / 2) * 0.02) + (Math.random() * 0.01 - 0.004);
    ppOndate = Math.round((ppOndate + ppInflow) * (1 + monthlyReturn));
    jjOndate = Math.round((jjOndate + jjInflow) * (1 + monthlyReturn * 0.98));
    
    const totalCapital = ppCapital + jjCapital;
    const totalOndate = ppOndate + jjOndate;
    const totalPL = totalOndate - totalCapital;
    
    // Realistic asset class distribution over time (sums to totalOndate)
    // 9 classes: THSTOCK (28%), USAFUND (19%), GOLD (21%), GOLDFUND (9%), ASIAFUND (8%), FCD (5%), CHIFUND (4%), BOND (3%), SEMIFUND (3%)
    const thstockAmt  = Math.round(totalOndate * (0.28 + Math.sin(i / 8) * 0.03));
    const usafundAmt  = Math.round(totalOndate * (0.19 + Math.cos(i / 10) * 0.02));
    const goldAmt     = Math.round(totalOndate * (0.21 + Math.sin(i / 6) * 0.02));
    const goldfundAmt = Math.round(totalOndate * 0.09);
    const asiafundAmt = Math.round(totalOndate * 0.08);
    const fcdAmt      = Math.round(totalOndate * 0.05);
    const chifundAmt  = Math.round(totalOndate * 0.04);
    const bondAmt     = Math.round(totalOndate * 0.03);
    const semifundAmt = Math.max(0, totalOndate - (thstockAmt + usafundAmt + goldAmt + goldfundAmt + asiafundAmt + fcdAmt + chifundAmt + bondAmt));

    snapshot.push({
      date: dateStr,
      year_month: dateStr.substring(0, 7),
      // v3.2.3 Net Capital Deposits
      pp_net_capital_deposit: ppCapital,
      jj_net_capital_deposit: jjCapital,
      total_net_capital_deposit: totalCapital,
      // Ondate amounts
      pp_ondate: ppOndate,
      jj_ondate: jjOndate,
      total_ondate: totalOndate,
      // Net Gain
      pp_net_gain: ppOndate - ppCapital,
      jj_net_gain: jjOndate - jjCapital,
      total_net_gain: totalOndate - totalCapital,
      // Legacy compat
      pp_cost: ppCapital,
      jj_cost: jjCapital,
      total_cost: totalCapital,
      pp_pl: ppOndate - ppCapital,
      jj_pl: jjOndate - jjCapital,
      total_pl: totalPL,
      nav_per_unit: Number(navPerUnit.toFixed(4)),
      pp_inflow: ppInflow,
      jj_inflow: jjInflow,
      total_inflow: ppInflow + jjInflow,
      // v3.3.0 Asset Class Breakdown
      asset_classes: {
        THSTOCK:  thstockAmt,
        USAFUND:  usafundAmt,
        GOLD:     goldAmt,
        GOLDFUND: goldfundAmt,
        ASIAFUND: asiafundAmt,
        FCD:      fcdAmt,
        CHIFUND:  chifundAmt,
        BOND:     bondAmt,
        SEMIFUND: semifundAmt
      }
    });
    
    curr.setMonth(curr.getMonth() + 1);
  }

  // 74 Mock Assets matching portfolio asset classes
  const assetClasses = ['GOLD', 'GOLDFUND', 'USAFUND', 'ASIAFUND', 'CHIFUND', 'THFUND', 'THSTOCK', 'BOND', 'FCD'];
  const owners = ['PP', 'JJ'];
  const assetNames = [
    'SCBSP500', 'K-US500X', 'ONE-UGG-RA', 'SCBNDQ', 'KF-US', 'B-INNOTECH',
    'SCBGOLD', 'KGOLD', 'GOLD965', 'K-CHINA', 'SCBCHA', 'TMBCOF',
    'SCBASIA', 'K-ASIA', 'B-ASIA', 'SCBTPK', 'TISCOHD', 'SCBDV',
    'PTT', 'AOT', 'CPALL', 'BDMS', 'ADVANC', 'GULF', 'KBANK', 'SCB',
    'GOVT_BOND_2028', 'GOVT_BOND_2030', 'KKP_DEBENTURE', 'FCD_USD_SAVINGS'
  ];

  const assets = [];
  let id = 1;
  for (let i = 0; i < 74; i++) {
    const owner = owners[i % 2];
    const assetClass = assetClasses[i % assetClasses.length];
    const name = assetNames[i % assetNames.length] + (i > 30 ? `_${i}` : '');
    // v3.1 Update: Reduce cost range per asset from 20k-270k to 5k-25k to balance overall portfolio value at ~1M
    const cost = Math.round(5000 + Math.random() * 20000);
    const returnPct = (-0.15 + Math.random() * 0.60); // -15% to +45%
    const marketValue = Math.round(cost * (1 + returnPct));
    const unrealizedPL = marketValue - cost;
    const realizedPL = Math.round(Math.random() * 15000);
    const units = Math.round(cost / (10 + Math.random() * 90));
    const price = Number((marketValue / units).toFixed(2));
    const avgCost = Number((cost / units).toFixed(2));

    assets.push({
      id: id++,
      account: `${owner}_${assetClass}_${i}`,
      asset_name: name,
      class: assetClass,
      owner: owner,
      units: units,
      avg_cost: avgCost,
      current_price: price,
      total_cost: cost,
      market_value: marketValue,
      unrealized_pl: unrealizedPL,
      unrealized_pl_pct: Number((returnPct * 100).toFixed(2)),
      realized_pl: realizedPL
    });
  }

  const latest = snapshot[snapshot.length - 1];
  const summary = {
    total: {
      net_capital_deposit: latest.total_net_capital_deposit,
      market_value: latest.total_ondate,
      net_gain: latest.total_pl + 185000,
      unrealized_pl: latest.total_pl,
      realized_pl: 185000,
      cost: latest.total_cost
    },
    pp: {
      net_capital_deposit: latest.pp_net_capital_deposit,
      market_value: latest.pp_ondate,
      net_gain: latest.pp_pl + 110000,
      unrealized_pl: latest.pp_pl,
      realized_pl: 110000,
      cost: latest.pp_cost
    },
    jj: {
      net_capital_deposit: latest.jj_net_capital_deposit,
      market_value: latest.jj_ondate,
      net_gain: latest.jj_pl + 75000,
      unrealized_pl: latest.jj_pl,
      realized_pl: 75000,
      cost: latest.jj_cost
    }
  };

  // Mock Thai Stock Hub Data (Matching THStock_Master_V3)
  const thaiStocks = {
    summary: {
      total: {
        total_cost: 467700.00,
        real_capital_cost_basis: 422840.00,
        market_value: 488110.00,
        unrealized_pl: 20410.00,
        yearly_dividend: 22619.00,
        historical_net_gain: 44860.00,
        yoc_pct: 5.35,
        market_yield_pct: 4.63,
        net_gain_pct: 10.61
      },
      pp: {
        total_cost: 314000.00,
        real_capital_cost_basis: 285150.00,
        market_value: 327050.00,
        unrealized_pl: 13050.00,
        yearly_dividend: 14617.00,
        historical_net_gain: 28850.00,
        yoc_pct: 5.13,
        market_yield_pct: 4.47,
        net_gain_pct: 10.12
      },
      jj: {
        total_cost: 153700.00,
        real_capital_cost_basis: 137690.00,
        market_value: 161060.00,
        unrealized_pl: 7360.00,
        yearly_dividend: 8002.00,
        historical_net_gain: 16010.00,
        yoc_pct: 5.81,
        market_yield_pct: 4.97,
        net_gain_pct: 11.63
      }
    },
    items: [
      // PP Stocks
      { account: 'PP', symbol: 'ADVANC', quantity: 300, avg_cost_price: 210.00, total_cost: 63000.00, current_price: 225.00, market_value: 67500.00, unrealized_pl: 4500.00, unrealized_pl_pct: 7.14, expected_dps: 8.60, yearly_expected_dividend: 2580.00, yield_on_cost: 4.10, current_price_yield: 3.82, cumulative_dividend_history: 2500.00, realized_pl_history: 0, historical_net_gain: 7000.00, net_gain_pct: 11.11, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'CPALL', quantity: 800, avg_cost_price: 58.00, total_cost: 46400.00, current_price: 64.50, market_value: 51600.00, unrealized_pl: 5200.00, unrealized_pl_pct: 11.21, expected_dps: 1.80, yearly_expected_dividend: 1440.00, yield_on_cost: 3.10, current_price_yield: 2.79, cumulative_dividend_history: 1400.00, realized_pl_history: 0, historical_net_gain: 6600.00, net_gain_pct: 14.22, note_consensus: 'Buy', company_perform: 'Moderate Growth' },
      { account: 'PP', symbol: 'BDMS', quantity: 1500, avg_cost_price: 28.00, total_cost: 42000.00, current_price: 27.50, market_value: 41250.00, unrealized_pl: -750.00, unrealized_pl_pct: -1.79, expected_dps: 0.75, yearly_expected_dividend: 1125.00, yield_on_cost: 2.68, current_price_yield: 2.73, cumulative_dividend_history: 1100.00, realized_pl_history: 0, historical_net_gain: 350.00, net_gain_pct: 0.83, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'PTT', quantity: 1000, avg_cost_price: 33.50, total_cost: 33500.00, current_price: 34.00, market_value: 34000.00, unrealized_pl: 500.00, unrealized_pl_pct: 1.49, expected_dps: 2.00, yearly_expected_dividend: 2000.00, yield_on_cost: 5.97, current_price_yield: 5.88, cumulative_dividend_history: 2000.00, realized_pl_history: 0, historical_net_gain: 2500.00, net_gain_pct: 7.46, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'SCB', quantity: 300, avg_cost_price: 102.00, total_cost: 30600.00, current_price: 108.00, market_value: 32400.00, unrealized_pl: 1800.00, unrealized_pl_pct: 5.88, expected_dps: 7.84, yearly_expected_dividend: 2352.00, yield_on_cost: 7.69, current_price_yield: 7.26, cumulative_dividend_history: 2300.00, realized_pl_history: 1500.00, historical_net_gain: 5600.00, net_gain_pct: 18.30, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'INTUCH', quantity: 400, avg_cost_price: 70.00, total_cost: 28000.00, current_price: 74.00, market_value: 29600.00, unrealized_pl: 1600.00, unrealized_pl_pct: 5.71, expected_dps: 3.20, yearly_expected_dividend: 1280.00, yield_on_cost: 4.57, current_price_yield: 4.32, cumulative_dividend_history: 1200.00, realized_pl_history: 0, historical_net_gain: 2800.00, net_gain_pct: 10.00, note_consensus: 'Hold', company_perform: 'Moderate Growth' },
      { account: 'PP', symbol: 'AP', quantity: 2500, avg_cost_price: 10.80, total_cost: 27000.00, current_price: 11.20, market_value: 28000.00, unrealized_pl: 1000.00, unrealized_pl_pct: 3.70, expected_dps: 0.68, yearly_expected_dividend: 1700.00, yield_on_cost: 6.30, current_price_yield: 6.07, cumulative_dividend_history: 1700.00, realized_pl_history: 0, historical_net_gain: 2700.00, net_gain_pct: 10.00, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'LH', quantity: 3000, avg_cost_price: 6.20, total_cost: 18600.00, current_price: 5.80, market_value: 17400.00, unrealized_pl: -1200.00, unrealized_pl_pct: -6.45, expected_dps: 0.40, yearly_expected_dividend: 1200.00, yield_on_cost: 6.45, current_price_yield: 6.90, cumulative_dividend_history: 1200.00, realized_pl_history: 0, historical_net_gain: 0.00, net_gain_pct: 0.00, note_consensus: 'Hold', company_perform: 'Temp Slowdown' },
      { account: 'PP', symbol: 'WHA', quantity: 3000, avg_cost_price: 4.80, total_cost: 14400.00, current_price: 5.10, market_value: 15300.00, unrealized_pl: 900.00, unrealized_pl_pct: 6.25, expected_dps: 0.18, yearly_expected_dividend: 540.00, yield_on_cost: 3.75, current_price_yield: 3.53, cumulative_dividend_history: 500.00, realized_pl_history: 0, historical_net_gain: 1400.00, net_gain_pct: 9.72, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'HMPRO', quantity: 1000, avg_cost_price: 10.50, total_cost: 10500.00, current_price: 10.00, market_value: 10000.00, unrealized_pl: -500.00, unrealized_pl_pct: -4.76, expected_dps: 0.40, yearly_expected_dividend: 400.00, yield_on_cost: 3.81, current_price_yield: 4.00, cumulative_dividend_history: 400.00, realized_pl_history: 0, historical_net_gain: -100.00, net_gain_pct: -0.95, note_consensus: 'Hold', company_perform: 'Neutral' },
      // JJ Stocks
      { account: 'JJ', symbol: 'PTT', quantity: 1000, avg_cost_price: 32.50, total_cost: 32500.00, current_price: 34.00, market_value: 34000.00, unrealized_pl: 1500.00, unrealized_pl_pct: 4.62, expected_dps: 2.00, yearly_expected_dividend: 2000.00, yield_on_cost: 6.15, current_price_yield: 5.88, cumulative_dividend_history: 2000.00, realized_pl_history: 0, historical_net_gain: 3500.00, net_gain_pct: 10.77, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'BDMS', quantity: 1000, avg_cost_price: 27.00, total_cost: 27000.00, current_price: 27.50, market_value: 27500.00, unrealized_pl: 500.00, unrealized_pl_pct: 1.85, expected_dps: 0.75, yearly_expected_dividend: 750.00, yield_on_cost: 2.78, current_price_yield: 2.73, cumulative_dividend_history: 750.00, realized_pl_history: 0, historical_net_gain: 1250.00, net_gain_pct: 4.63, note_consensus: 'Buy', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'CPALL', quantity: 400, avg_cost_price: 60.00, total_cost: 24000.00, current_price: 64.50, market_value: 25800.00, unrealized_pl: 1800.00, unrealized_pl_pct: 7.50, expected_dps: 1.80, yearly_expected_dividend: 720.00, yield_on_cost: 3.00, current_price_yield: 2.79, cumulative_dividend_history: 700.00, realized_pl_history: 0, historical_net_gain: 2500.00, net_gain_pct: 10.42, note_consensus: 'Buy', company_perform: 'Moderate Growth' },
      { account: 'JJ', symbol: 'SCB', quantity: 200, avg_cost_price: 103.00, total_cost: 20600.00, current_price: 108.00, market_value: 21600.00, unrealized_pl: 1000.00, unrealized_pl_pct: 4.85, expected_dps: 7.84, yearly_expected_dividend: 1568.00, yield_on_cost: 7.61, current_price_yield: 7.26, cumulative_dividend_history: 1500.00, realized_pl_history: 800.00, historical_net_gain: 3300.00, net_gain_pct: 16.02, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'JJ', symbol: 'AP', quantity: 1800, avg_cost_price: 10.50, total_cost: 18900.00, current_price: 11.20, market_value: 20160.00, unrealized_pl: 1260.00, unrealized_pl_pct: 6.67, expected_dps: 0.68, yearly_expected_dividend: 1224.00, yield_on_cost: 6.48, current_price_yield: 6.07, cumulative_dividend_history: 1200.00, realized_pl_history: 0, historical_net_gain: 2460.00, net_gain_pct: 13.02, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'KTB', quantity: 1000, avg_cost_price: 16.50, total_cost: 16500.00, current_price: 17.20, market_value: 17200.00, unrealized_pl: 700.00, unrealized_pl_pct: 4.24, expected_dps: 1.10, yearly_expected_dividend: 1100.00, yield_on_cost: 6.67, current_price_yield: 6.40, cumulative_dividend_history: 1100.00, realized_pl_history: 0, historical_net_gain: 1800.00, net_gain_pct: 10.91, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'INTUCH', quantity: 200, avg_cost_price: 71.00, total_cost: 14200.00, current_price: 74.00, market_value: 14800.00, unrealized_pl: 600.00, unrealized_pl_pct: 4.23, expected_dps: 3.20, yearly_expected_dividend: 640.00, yield_on_cost: 4.51, current_price_yield: 4.32, cumulative_dividend_history: 600.00, realized_pl_history: 0, historical_net_gain: 1200.00, net_gain_pct: 8.45, note_consensus: 'Hold', company_perform: 'Moderate Growth' }
    ]
  };

  return { summary, assets, snapshot, thaiStocks };
};
