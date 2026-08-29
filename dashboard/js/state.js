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
        total_cost: 909634.88,
        real_capital_cost_basis: 703598.42,
        market_value: 922195.00,
        unrealized_pl: 12560.12,
        yearly_dividend: 48344.50,
        historical_net_gain: 106040.46,
        yoc_pct: 6.87,
        market_yield_pct: 5.24,
        net_gain_pct: 15.07
      },
      pp: {
        total_cost: 671005.71,
        real_capital_cost_basis: 481751.88,
        market_value: 661875.00,
        unrealized_pl: -9130.71,
        yearly_dividend: 32781.00,
        historical_net_gain: 89884.34,
        yoc_pct: 6.81,
        market_yield_pct: 4.95,
        net_gain_pct: 18.66
      },
      jj: {
        total_cost: 238629.18,
        real_capital_cost_basis: 221846.54,
        market_value: 260320.00,
        unrealized_pl: 21690.82,
        yearly_dividend: 15563.50,
        historical_net_gain: 16156.12,
        yoc_pct: 7.02,
        market_yield_pct: 5.98,
        net_gain_pct: 7.28
      }
    },
    items: [
      // PP Stocks
      { account: 'PP', symbol: 'BDMS', quantity: 2200, avg_cost_price: 19.75, total_cost: 43452.09, current_price: 19.50, market_value: 42900.00, unrealized_pl: -552.09, unrealized_pl_pct: -1.27, expected_dps: 0.71, yearly_expected_dividend: 1562.00, yield_on_cost: 3.59, current_price_yield: 3.64, cumulative_dividend_history: 1374.20, realized_pl_history: 0, historical_net_gain: 822.11, net_gain_pct: 1.89, note_consensus: 'Buy', company_perform: 'Temp Slowdown' },
      { account: 'PP', symbol: 'COM7', quantity: 100, avg_cost_price: 30.66, total_cost: 3066.18, current_price: 28.50, market_value: 2850.00, unrealized_pl: -216.18, unrealized_pl_pct: -7.05, expected_dps: 1.10, yearly_expected_dividend: 110.00, yield_on_cost: 3.59, current_price_yield: 3.86, cumulative_dividend_history: 0, realized_pl_history: 0, historical_net_gain: -216.18, net_gain_pct: -7.05, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'CPALL', quantity: 500, avg_cost_price: 47.68, total_cost: 23839.90, current_price: 46.25, market_value: 23125.00, unrealized_pl: -714.90, unrealized_pl_pct: -3.00, expected_dps: 1.70, yearly_expected_dividend: 850.00, yield_on_cost: 3.57, current_price_yield: 3.68, cumulative_dividend_history: 2705.00, realized_pl_history: -8376.35, historical_net_gain: -6386.25, net_gain_pct: -26.79, note_consensus: 'Buy', company_perform: 'Moderate Growth' },
      { account: 'PP', symbol: 'FTREIT', quantity: 4600, avg_cost_price: 10.58, total_cost: 48682.13, current_price: 12.40, market_value: 57040.00, unrealized_pl: 8357.87, unrealized_pl_pct: 17.17, expected_dps: 0.76, yearly_expected_dividend: 3496.00, yield_on_cost: 7.18, current_price_yield: 6.13, cumulative_dividend_history: 6345.58, realized_pl_history: 0, historical_net_gain: 14703.44, net_gain_pct: 30.20, note_consensus: 'Hold', company_perform: 'Moderate Growth' },
      { account: 'PP', symbol: 'HTECH', quantity: 2300, avg_cost_price: 15.98, total_cost: 36765.55, current_price: 15.70, market_value: 36110.00, unrealized_pl: -655.55, unrealized_pl_pct: -1.78, expected_dps: 1.00, yearly_expected_dividend: 2300.00, yield_on_cost: 6.26, current_price_yield: 6.37, cumulative_dividend_history: 3659.60, realized_pl_history: 517.20, historical_net_gain: 3521.25, net_gain_pct: 9.58, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'ICHI', quantity: 4000, avg_cost_price: 13.27, total_cost: 53089.03, current_price: 14.10, market_value: 56400.00, unrealized_pl: 3310.97, unrealized_pl_pct: 6.24, expected_dps: 1.00, yearly_expected_dividend: 4000.00, yield_on_cost: 7.53, current_price_yield: 7.09, cumulative_dividend_history: 8446.50, realized_pl_history: 105.66, historical_net_gain: 11863.13, net_gain_pct: 22.35, note_consensus: 'Buy', company_perform: 'Temp Slowdown' },
      { account: 'PP', symbol: 'ILM', quantity: 1900, avg_cost_price: 19.58, total_cost: 37209.64, current_price: 18.30, market_value: 34770.00, unrealized_pl: -2439.64, unrealized_pl_pct: -6.56, expected_dps: 0.90, yearly_expected_dividend: 1710.00, yield_on_cost: 4.60, current_price_yield: 4.92, cumulative_dividend_history: 2479.50, realized_pl_history: 0, historical_net_gain: 39.86, net_gain_pct: 0.11, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'KCG', quantity: 5000, avg_cost_price: 8.49, total_cost: 42466.21, current_price: 10.20, market_value: 51000.00, unrealized_pl: 8533.79, unrealized_pl_pct: 20.10, expected_dps: 0.56, yearly_expected_dividend: 2800.00, yield_on_cost: 6.59, current_price_yield: 5.49, cumulative_dividend_history: 2830.50, realized_pl_history: 0, historical_net_gain: 11364.29, net_gain_pct: 26.76, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'KL', quantity: 5000, avg_cost_price: 5.80, total_cost: 29015.20, current_price: 5.35, market_value: 26750.00, unrealized_pl: -2265.20, unrealized_pl_pct: -7.81, expected_dps: 0.32, yearly_expected_dividend: 1600.00, yield_on_cost: 5.51, current_price_yield: 5.98, cumulative_dividend_history: 4938.84, realized_pl_history: 0, historical_net_gain: 2673.64, net_gain_pct: 9.21, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'MC', quantity: 7000, avg_cost_price: 11.66, total_cost: 81606.87, current_price: 11.90, market_value: 83300.00, unrealized_pl: 1693.13, unrealized_pl_pct: 2.07, expected_dps: 0.80, yearly_expected_dividend: 5600.00, yield_on_cost: 6.86, current_price_yield: 6.72, cumulative_dividend_history: 11759.40, realized_pl_history: 0, historical_net_gain: 13452.53, net_gain_pct: 16.48, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'MOSHI', quantity: 100, avg_cost_price: 42.07, total_cost: 4207.05, current_price: 38.25, market_value: 3825.00, unrealized_pl: -382.05, unrealized_pl_pct: -9.08, expected_dps: 1.25, yearly_expected_dividend: 125.00, yield_on_cost: 2.97, current_price_yield: 3.27, cumulative_dividend_history: 57.60, realized_pl_history: 0, historical_net_gain: -324.45, net_gain_pct: -7.71, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'PP', symbol: 'PM', quantity: 2800, avg_cost_price: 12.13, total_cost: 33958.94, current_price: 11.00, market_value: 30800.00, unrealized_pl: -3158.94, unrealized_pl_pct: -9.30, expected_dps: 0.595, yearly_expected_dividend: 1666.00, yield_on_cost: 4.91, current_price_yield: 5.41, cumulative_dividend_history: 1260.00, realized_pl_history: 0, historical_net_gain: -1898.94, net_gain_pct: -5.59, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'SABINA', quantity: 2200, avg_cost_price: 29.07, total_cost: 63942.16, current_price: 15.60, market_value: 34320.00, unrealized_pl: -29622.16, unrealized_pl_pct: -46.33, expected_dps: 1.00, yearly_expected_dividend: 2200.00, yield_on_cost: 3.44, current_price_yield: 6.41, cumulative_dividend_history: 6919.50, realized_pl_history: 0, historical_net_gain: -22702.66, net_gain_pct: -35.51, note_consensus: 'Hold', company_perform: 'Temp Slowdown' },
      { account: 'PP', symbol: 'SCB', quantity: 100, avg_cost_price: 136.73, total_cost: 13672.94, current_price: 151.00, market_value: 15100.00, unrealized_pl: 1427.06, unrealized_pl_pct: 10.44, expected_dps: 9.00, yearly_expected_dividend: 900.00, yield_on_cost: 6.58, current_price_yield: 5.96, cumulative_dividend_history: 1015.20, realized_pl_history: 1650.28, historical_net_gain: 4092.54, net_gain_pct: 29.93, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'SIS', quantity: 100, avg_cost_price: 26.54, total_cost: 2654.46, current_price: 23.70, market_value: 2370.00, unrealized_pl: -284.46, unrealized_pl_pct: -10.72, expected_dps: 1.20, yearly_expected_dividend: 120.00, yield_on_cost: 4.52, current_price_yield: 5.06, cumulative_dividend_history: 0, realized_pl_history: 0, historical_net_gain: -284.46, net_gain_pct: -10.72, note_consensus: 'Hold', company_perform: 'Moderate Growth' },
      { account: 'PP', symbol: 'TISCO', quantity: 300, avg_cost_price: 95.58, total_cost: 28673.11, current_price: 127.00, market_value: 38100.00, unrealized_pl: 9426.89, unrealized_pl_pct: 32.88, expected_dps: 7.50, yearly_expected_dividend: 2250.00, yield_on_cost: 7.85, current_price_yield: 5.91, cumulative_dividend_history: 11180.00, realized_pl_history: 7005.70, historical_net_gain: 27612.59, net_gain_pct: 96.30, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'PP', symbol: 'TOA', quantity: 2800, avg_cost_price: 11.35, total_cost: 31773.37, current_price: 7.10, market_value: 19880.00, unrealized_pl: -11893.37, unrealized_pl_pct: -37.43, expected_dps: 0.46, yearly_expected_dividend: 1288.00, yield_on_cost: 4.05, current_price_yield: 6.48, cumulative_dividend_history: 5607.60, realized_pl_history: -6591.46, historical_net_gain: -12877.23, net_gain_pct: -40.53, note_consensus: 'Hold', company_perform: 'Temp Slowdown' },
      // JJ Stocks
      { account: 'JJ', symbol: 'BDMS', quantity: 1400, avg_cost_price: 19.26, total_cost: 26965.22, current_price: 19.50, market_value: 27300.00, unrealized_pl: 334.78, unrealized_pl_pct: 1.24, expected_dps: 0.71, yearly_expected_dividend: 994.00, yield_on_cost: 3.69, current_price_yield: 3.64, cumulative_dividend_history: 827.00, realized_pl_history: 0, historical_net_gain: 1161.78, net_gain_pct: 4.31, note_consensus: 'Buy', company_perform: 'Temp Slowdown' },
      { account: 'JJ', symbol: 'ICHI', quantity: 3400, avg_cost_price: 12.53, total_cost: 42596.44, current_price: 14.10, market_value: 47940.00, unrealized_pl: 5343.56, unrealized_pl_pct: 12.54, expected_dps: 1.00, yearly_expected_dividend: 3400.00, yield_on_cost: 7.98, current_price_yield: 7.09, cumulative_dividend_history: 2565.00, realized_pl_history: 0, historical_net_gain: 7908.56, net_gain_pct: 18.57, note_consensus: 'Buy', company_perform: 'Temp Slowdown' },
      { account: 'JJ', symbol: 'KCG', quantity: 2400, avg_cost_price: 8.60, total_cost: 20644.46, current_price: 10.20, market_value: 24480.00, unrealized_pl: 3835.54, unrealized_pl_pct: 18.58, expected_dps: 0.56, yearly_expected_dividend: 1344.00, yield_on_cost: 6.51, current_price_yield: 5.49, cumulative_dividend_history: 1293.40, realized_pl_history: 0, historical_net_gain: 5128.94, net_gain_pct: 24.84, note_consensus: 'Buy', company_perform: 'High Growth' },
      { account: 'JJ', symbol: 'MC', quantity: 2200, avg_cost_price: 10.34, total_cost: 22750.18, current_price: 11.90, market_value: 26180.00, unrealized_pl: 3429.82, unrealized_pl_pct: 15.08, expected_dps: 0.80, yearly_expected_dividend: 1760.00, yield_on_cost: 7.74, current_price_yield: 6.72, cumulative_dividend_history: 1029.60, realized_pl_history: 0, historical_net_gain: 4459.42, net_gain_pct: 19.60, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'PM', quantity: 900, avg_cost_price: 11.35, total_cost: 10217.14, current_price: 11.00, market_value: 9900.00, unrealized_pl: -317.14, unrealized_pl_pct: -3.10, expected_dps: 0.595, yearly_expected_dividend: 535.50, yield_on_cost: 5.24, current_price_yield: 5.41, cumulative_dividend_history: 1125.00, realized_pl_history: 0, historical_net_gain: 807.86, net_gain_pct: 7.91, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'SABINA', quantity: 1700, avg_cost_price: 16.02, total_cost: 27228.83, current_price: 15.60, market_value: 26520.00, unrealized_pl: -708.83, unrealized_pl_pct: -2.60, expected_dps: 1.00, yearly_expected_dividend: 1700.00, yield_on_cost: 6.24, current_price_yield: 6.41, cumulative_dividend_history: 2017.00, realized_pl_history: 0, historical_net_gain: 1308.17, net_gain_pct: 4.80, note_consensus: 'Hold', company_perform: 'Temp Slowdown' },
      { account: 'JJ', symbol: 'SCB', quantity: 400, avg_cost_price: 138.36, total_cost: 55342.91, current_price: 151.00, market_value: 60400.00, unrealized_pl: 5057.09, unrealized_pl_pct: 9.14, expected_dps: 9.00, yearly_expected_dividend: 3600.00, yield_on_cost: 6.50, current_price_yield: 5.96, cumulative_dividend_history: 4060.80, realized_pl_history: 1800.62, historical_net_gain: 10918.51, net_gain_pct: 19.73, note_consensus: 'Hold', company_perform: 'Neutral' },
      { account: 'JJ', symbol: 'TISCO', quantity: 300, avg_cost_price: 107.93, total_cost: 32379.29, current_price: 127.00, market_value: 38100.00, unrealized_pl: 5720.71, unrealized_pl_pct: 17.67, expected_dps: 7.50, yearly_expected_dividend: 2250.00, yield_on_cost: 6.95, current_price_yield: 5.91, cumulative_dividend_history: 1575.00, realized_pl_history: 0, historical_net_gain: 7295.71, net_gain_pct: 22.53, note_consensus: 'Hold', company_perform: 'Neutral' }
    ]
  };

  return { summary, assets, snapshot, thaiStocks };
};
