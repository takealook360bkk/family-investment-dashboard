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
  milestoneTarget: 30000000, // Default 30M THB
  expectedReturnRate: 7.0,   // Default 7% p.a.

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
  const startDate = new Date(2016, 11, 31); // Dec 2016
  const endDate = new Date(2026, 6, 31);   // Jul 2026
  
  const snapshot = [];
  let ppCapital = 100000;
  let jjCapital = 80000;
  let ppOndate = 102000;
  let jjOndate = 81500;
  let navPerUnit = 10.0;

  const totalMonths = 116;
  
  let curr = new Date(startDate);
  for (let i = 0; i <= totalMonths; i++) {
    const dateStr = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0') + '-' + String(curr.getDate()).padStart(2, '0');
    
    // Add monthly contributions
    const ppInflow = Math.round(15000 + Math.sin(i / 3) * 5000 + (i * 200));
    const jjInflow = Math.round(12000 + Math.cos(i / 4) * 4000 + (i * 180));
    
    ppCapital += ppInflow;
    jjCapital += jjInflow;
    
    // Return fluctuations
    const monthlyReturn = 0.005 + (Math.sin(i / 2) * 0.02) + (Math.random() * 0.01 - 0.004);
    ppOndate = Math.round((ppOndate + ppInflow) * (1 + monthlyReturn));
    jjOndate = Math.round((jjOndate + jjInflow) * (1 + monthlyReturn * 0.98));
    
    const totalCost = ppCapital + jjCapital;
    const totalOndate = ppOndate + jjOndate;
    const totalPL = totalOndate - totalCost;
    
    navPerUnit = navPerUnit * (1 + monthlyReturn);
    
    snapshot.push({
      date: dateStr,
      year_month: dateStr.substring(0, 7),
      pp_cost: ppCapital,
      pp_ondate: ppOndate,
      pp_pl: ppOndate - ppCapital,
      jj_cost: jjCapital,
      jj_ondate: jjOndate,
      jj_pl: jjOndate - jjCapital,
      total_cost: totalCost,
      total_ondate: totalOndate,
      total_pl: totalPL,
      nav_per_unit: Number(navPerUnit.toFixed(4)),
      pp_inflow: ppInflow,
      jj_inflow: jjInflow,
      total_inflow: ppInflow + jjInflow
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
    const cost = Math.round(20000 + Math.random() * 250000);
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
      cost: latest.total_cost,
      market_value: latest.total_ondate,
      unrealized_pl: latest.total_pl,
      realized_pl: 185000,
      total_gain: latest.total_pl + 185000
    },
    pp: {
      cost: latest.pp_cost,
      market_value: latest.pp_ondate,
      unrealized_pl: latest.pp_pl,
      realized_pl: 110000,
      total_gain: latest.pp_pl + 110000
    },
    jj: {
      cost: latest.jj_cost,
      market_value: latest.jj_ondate,
      unrealized_pl: latest.jj_pl,
      realized_pl: 75000,
      total_gain: latest.jj_pl + 75000
    }
  };

  return { summary, assets, snapshot };
};
