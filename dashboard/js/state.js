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

  setData({ summary, assets, snapshot, isDemo = false }) {
    this.summary = summary;
    this.assets = assets;
    this.snapshot = snapshot;
    this.isDemoMode = isDemo;
    this.notify('dataLoaded', { summary, assets, snapshot, isDemo });
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

  return { summary, assets, snapshot };
};
