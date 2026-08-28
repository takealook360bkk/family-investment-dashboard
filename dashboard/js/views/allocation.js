// View 2: Portfolio Allocation & Performance (v3.3.0)

window.AllocationView = {
  allocationChart: null,
  assetHistoryChart: null,
  historyRange: 'ALL',
  currentSortField: 'market_value',
  currentSortOrder: 'desc',
  searchQuery: '',
  selectedOwner: 'TOTAL',
  selectedClasses: null, // null = show all; Set = specific classes

  // Standard Unified Color Palette for Asset Classes across View 2
  colorPalette: {
    'GOLD':      '#f59e0b',
    'GOLDFUND':  '#d97706',
    'USAFUND':   '#3b82f6',
    'ASIAFUND':  '#06b6d4',
    'CHIFUND':   '#ef4444',
    'THFUND':    '#10b981',
    'THSTOCK':   '#8b5cf6',
    'BOND':      '#64748b',
    'FCD':       '#ec4899',
    'SEMIFUND':  '#a855f7',
    'OTHER':     '#9ca3af'
  },

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Search
    document.getElementById('asset-search-input')?.addEventListener('input', e => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderTable();
    });

    // Sortable headers
    document.querySelectorAll('.sortable-th').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        if (this.currentSortField === field) {
          this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          this.currentSortField = field;
          this.currentSortOrder = 'desc';
        }
        this.updateSortHeaders();
        this.renderTable();
      });
    });

    // Owner filter (View 2 specific)
    document.querySelectorAll('.alloc-owner-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.alloc-owner-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.selectedOwner = e.currentTarget.getAttribute('data-owner');
        this.render();
      });
    });

    // Asset History Range filter (View 2.2 Stacked Area Chart)
    document.querySelectorAll('[data-chart="asset-history"]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-chart="asset-history"]').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.historyRange = e.currentTarget.getAttribute('data-range');
        this.renderAssetHistoryChart(window.AppState.snapshot);
      });
    });

    // Asset Class Filter Dropdown Toggle — stop propagation so clicking inside doesn't close
    document.getElementById('class-filter-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const dd = document.getElementById('class-filter-dropdown');
      if (dd) dd.classList.toggle('hidden');
    });

    // Stop propagation INSIDE the dropdown so clicks don't bubble to document
    document.getElementById('class-filter-dropdown')?.addEventListener('click', e => {
      e.stopPropagation();
    });

    // Close dropdown only when clicking outside
    document.addEventListener('click', () => {
      document.getElementById('class-filter-dropdown')?.classList.add('hidden');
    });
  },

  buildClassFilterOptions(allAssets) {
    const container = document.getElementById('class-filter-options');
    if (!container) return;

    // Get unique classes from actual data (dynamic)
    const classes = [...new Set(allAssets.map(a => a.class).filter(Boolean))].sort();

    // Determine current state — null = all shown
    const isAllSelected = this.selectedClasses === null;

    container.innerHTML = '';

    // "ทั้งหมด (All)" master toggle
    const allRow = document.createElement('label');
    allRow.className = 'flex items-center gap-2 cursor-pointer text-xs text-white py-1 border-b border-gray-700 mb-1 pb-2';
    allRow.innerHTML = `<input type="checkbox" class="class-all-cb" ${isAllSelected ? 'checked' : ''}> <span class="font-semibold">ทั้งหมด (All)</span>`;
    container.appendChild(allRow);

    classes.forEach(cls => {
      const isChecked = isAllSelected || this.selectedClasses?.has(cls);
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2 cursor-pointer text-xs text-gray-300 py-0.5';
      label.innerHTML = `<input type="checkbox" class="class-cb" data-class="${cls}" ${isChecked ? 'checked' : ''}> <span>${cls}</span>`;
      container.appendChild(label);
    });

    // Master "All" checkbox handler
    container.querySelector('.class-all-cb')?.addEventListener('change', e => {
      if (e.target.checked) {
        // Show all
        this.selectedClasses = null;
        container.querySelectorAll('.class-cb').forEach(cb => cb.checked = true);
      } else {
        // Hide all
        this.selectedClasses = new Set(); // empty set = show nothing
        container.querySelectorAll('.class-cb').forEach(cb => cb.checked = false);
      }
      this.renderTable();
    });

    // Individual class checkboxes
    container.querySelectorAll('.class-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedClasses = [...container.querySelectorAll('.class-cb:checked')].map(c => c.getAttribute('data-class'));
        if (checkedClasses.length === classes.length) {
          // All selected → treat as "show all"
          this.selectedClasses = null;
          const allCb = container.querySelector('.class-all-cb');
          if (allCb) allCb.checked = true;
        } else {
          this.selectedClasses = new Set(checkedClasses);
          const allCb = container.querySelector('.class-all-cb');
          if (allCb) allCb.checked = false;
        }
        this.renderTable();
      });
    });
  },

  updateSortHeaders() {
    document.querySelectorAll('.sortable-th').forEach(th => {
      const field = th.getAttribute('data-sort');
      const icon  = th.querySelector('.sort-icon');
      if (field === this.currentSortField) {
        th.classList.add('active-sort');
        if (icon) icon.textContent = this.currentSortOrder === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('active-sort');
        if (icon) icon.textContent = '⇅';
      }
    });
  },

  render() {
    const { assets, snapshot } = window.AppState;
    if (!assets || assets.length === 0) return;

    // All assets for class options
    let baseList = assets;
    if (this.selectedOwner === 'PP') baseList = assets.filter(a => a.owner === 'PP');
    else if (this.selectedOwner === 'JJ') baseList = assets.filter(a => a.owner === 'JJ');

    this.buildClassFilterOptions(baseList);
    this.renderAllocationChart(baseList);
    this.renderAssetHistoryChart(snapshot);
    this.renderTable(baseList);
  },

  // View 2.1: Donut Allocation Chart (Current snapshot)
  renderAllocationChart(assets) {
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;

    const classTotals = {};
    let grandTotal = 0;
    assets.forEach(a => {
      const cls = a.class || 'OTHER';
      const val = a.market_value || 0;
      classTotals[cls] = (classTotals[cls] || 0) + val;
      grandTotal += val;
    });

    const labels = Object.keys(classTotals);
    const data   = labels.map(l => classTotals[l]);

    const fallbackColors = ['#a78bfa','#fb923c','#38bdf8','#f472b6','#84cc16','#e879f9'];
    let fallbackIdx = 0;
    const backgroundColors = labels.map(l => this.colorPalette[l] || fallbackColors[fallbackIdx++ % fallbackColors.length]);

    if (this.allocationChart) this.allocationChart.destroy();

    // Dynamic slice border color and inset padding
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const sliceBorderColor = isLight ? '#E5E7EB' : '#111827';

    this.allocationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: sliceBorderColor,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        layout: {
          padding: 6 // 5-6px inset offset to prevent hover clipping
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const pct = grandTotal > 0 ? ((c.parsed / grandTotal) * 100).toFixed(1) : 0;
                return `${c.label}: ฿${window.formatCurrency(c.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    // Update center
    const totalElem = document.getElementById('allocation-total-val');
    if (totalElem) totalElem.textContent = `฿${window.formatCurrency(grandTotal)}`;

    // Build legend
    const legendContainer = document.getElementById('allocation-legend');
    if (legendContainer) {
      legendContainer.innerHTML = '';
      labels.forEach((lbl, i) => {
        const pct = grandTotal > 0 ? ((classTotals[lbl] / grandTotal) * 100).toFixed(1) : 0;
        const item = document.createElement('div');
        item.className = 'flex items-center gap-1.5 alloc-legend-item';
        item.innerHTML = `
          <span style="width:12px;height:12px;border-radius:3px;background:${backgroundColors[i]};display:inline-block;flex-shrink:0;"></span>
          <span class="alloc-legend-label font-semibold">${lbl}</span>
          <span class="alloc-legend-pct text-gray-400">${pct}% (฿${window.formatCurrency(classTotals[lbl])})</span>
        `;
        legendContainer.appendChild(item);
      });
    }
  },

  // View 2.2: Stacked Area Chart (Historical Asset Class Allocation Evolution) - v3.3.0
  renderAssetHistoryChart(snapshot) {
    const ctx = document.getElementById('assetHistoryChart');
    if (!ctx || !snapshot || snapshot.length === 0) return;

    // Filter by Range
    let count = snapshot.length;
    if (this.historyRange === '1Y') count = Math.min(12, snapshot.length);
    else if (this.historyRange === '3Y') count = Math.min(36, snapshot.length);
    else if (this.historyRange === '5Y') count = Math.min(60, snapshot.length);
    const filtered = snapshot.slice(snapshot.length - count);

    const labels = filtered.map(s => s.year_month || s.date);

    // List of 9 standard asset classes in consistent visual stacking order
    const classKeys = ['THSTOCK', 'USAFUND', 'GOLD', 'GOLDFUND', 'ASIAFUND', 'CHIFUND', 'SEMIFUND', 'BOND', 'FCD'];

    // Helper: convert hex to rgba
    const hexToRgba = (hex, alpha) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    };

    // Build dataset for each asset class
    // ---- DEBUG: Log to console to verify non-zero values ----
    const debugLast = filtered[filtered.length - 1];
    console.log('[AllocationChart] Filtered rows:', filtered.length, 'Last date:', debugLast?.date);
    console.log('[AllocationChart] Last row asset_classes:', JSON.stringify(debugLast?.asset_classes));
    // Check if ALL values are zero (indicates data mapping issue)
    const totalAllClasses = filtered.reduce((sum, s) => {
      if (!s.asset_classes) return sum;
      return sum + Object.values(s.asset_classes).reduce((a, b) => a + (Number(b) || 0), 0);
    }, 0);
    console.log('[AllocationChart] Grand total across all rows:', totalAllClasses);
    if (totalAllClasses === 0) {
      console.warn('[AllocationChart] WARNING: All asset_class values are 0. Check API field names.');
      // Fallback: try to derive from total_ondate for visualization
      console.warn('[AllocationChart] Sample snapshot keys:', Object.keys(filtered[0] || {}));
    }

    const datasets = classKeys.map(cls => {
      const color = this.colorPalette[cls] || '#9ca3af';
      const seriesData = filtered.map(s => {
        if (s.asset_classes && s.asset_classes[cls] !== undefined) {
          return Number(s.asset_classes[cls]) || 0;
        }
        return 0;
      });

      return {
        label: cls,
        data: seriesData,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.65),
        borderWidth: 1.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5
      };
    });

    if (this.assetHistoryChart) this.assetHistoryChart.destroy();

    // Theme-based styling
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    const textColor = isLight ? '#6B7280' : '#8E95A2';

    this.assetHistoryChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
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
            position: 'bottom',
            labels: {
              color: textColor,
              font: { family: 'Inter', size: 11 },
              usePointStyle: true,
              pointStyle: 'rectRounded',
              boxWidth: 10,
              boxHeight: 10,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: c => `${c.dataset.label}: ฿${window.formatCurrency(c.parsed.y)}`,
              footer: tooltipItems => {
                let sum = 0;
                tooltipItems.forEach(ti => { sum += ti.parsed.y; });
                return `Total: ฿${window.formatCurrency(sum)}`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: gridColor },
            ticks: { color: textColor, maxTicksLimit: 14 }
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              callback: v => v >= 1e6 ? `฿${(v/1e6).toFixed(1)}M` : `฿${(v/1e3).toFixed(0)}K`
            }
          }
        }
      }
    });
  },

  // View 2.3: Holdings Table (with sticky header & sum fix)
  renderTable(baseList) {
    const tbody = document.getElementById('asset-holdings-tbody');
    if (!tbody) return;

    const { assets } = window.AppState;
    let list = baseList;

    if (!list) {
      list = assets;
      if (this.selectedOwner === 'PP') list = assets.filter(a => a.owner === 'PP');
      else if (this.selectedOwner === 'JJ') list = assets.filter(a => a.owner === 'JJ');
    }

    // Class filter: null = all, empty Set = none, Set with items = specific
    if (this.selectedClasses !== null) {
      if (this.selectedClasses.size === 0) {
        list = [];
      } else {
        list = list.filter(a => this.selectedClasses.has(a.class));
      }
    }

    // Search
    if (this.searchQuery) {
      list = list.filter(a =>
        (a.asset_name || '').toLowerCase().includes(this.searchQuery) ||
        (a.class || '').toLowerCase().includes(this.searchQuery) ||
        (a.owner || '').toLowerCase().includes(this.searchQuery)
      );
    }

    // Sort
    const field = this.currentSortField;
    const isAsc = this.currentSortOrder === 'asc';
    list = [...list].sort((a, b) => {
      let vA = a[field], vB = b[field];
      if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = (vB || '').toLowerCase(); }
      if (vA < vB) return isAsc ? -1 : 1;
      if (vA > vB) return isAsc ? 1 : -1;
      return 0;
    });

    // Calculate Summary Metrics
    let totalCostSum = 0;
    let marketValueSum = 0;
    let unrealizedPlSum = 0;
    let realizedPlSum = 0;

    list.forEach(a => {
      totalCostSum += (a.total_cost || 0);
      marketValueSum += (a.market_value || 0);
      unrealizedPlSum += (a.unrealized_pl || 0);
      realizedPlSum += (a.realized_pl || 0);
    });

    const weightedAvgPlPct = totalCostSum > 0 ? (unrealizedPlSum / totalCostSum) * 100 : 0;
    const isWeightedPos = weightedAvgPlPct >= 0;
    const weightedPlCls = isWeightedPos ? 'text-emerald-400' : 'text-rose-400';
    const weightedAvgPlPctStr = `${isWeightedPos ? '+' : ''}${weightedAvgPlPct.toFixed(2)}%`;

    // Update Sticky thead Summary Row elements
    const sumCostEl   = document.getElementById('sum-col-cost');
    const sumMvEl     = document.getElementById('sum-col-mv');
    const sumUnplEl   = document.getElementById('sum-col-unpl');
    const sumUnplPctEl= document.getElementById('sum-col-unpl-pct');
    const sumRealplEl = document.getElementById('sum-col-realpl');

    if (sumCostEl)    sumCostEl.textContent = `฿${window.formatCurrency(totalCostSum)}`;
    if (sumMvEl)      sumMvEl.textContent   = `฿${window.formatCurrency(marketValueSum)}`;
    if (sumUnplEl) {
      sumUnplEl.textContent = `฿${window.formatCurrency(unrealizedPlSum)}`;
      sumUnplEl.className = `px-4 py-3 text-right ${unrealizedPlSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }
    if (sumUnplPctEl) {
      sumUnplPctEl.textContent = weightedAvgPlPctStr;
      sumUnplPctEl.className = `px-4 py-3 text-right ${weightedPlCls}`;
    }
    if (sumRealplEl)  sumRealplEl.textContent = `฿${window.formatCurrency(realizedPlSum)}`;

    // Render Data Rows into tbody only
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" class="text-center py-8 text-gray-500">ไม่พบข้อมูลสินทรัพย์ที่ตรงกัน</td></tr>`;
    } else {
      list.forEach(a => {
        const plPct = a.unrealized_pl_pct || 0;
        const isPos = plPct >= 0;
        const plCls = isPos ? 'text-emerald-400' : 'text-rose-400';
        const plPctStr = `${isPos ? '+' : ''}${plPct.toFixed(2)}%`;

        const tr = document.createElement('tr');
        tr.className = 'holdings-data-row hover:bg-slate-800/20 transition-colors border-b border-gray-800/30';
        tr.innerHTML = `
          <td class="px-4 py-3 font-semibold asset-name-cell">${a.asset_name}</td>
          <td class="px-4 py-3"><span class="badge-tag tag-${a.class || 'OTHER'}">${a.class || 'OTHER'}</span></td>
          <td class="px-4 py-3"><span class="badge-owner owner-${a.owner}">${a.owner}</span></td>
          <td class="px-4 py-3 text-right asset-data-cell">${window.formatNumber(a.units)}</td>
          <td class="px-4 py-3 text-right asset-data-cell">฿${window.formatNumber(a.avg_cost)}</td>
          <td class="px-4 py-3 text-right asset-data-cell font-medium">฿${window.formatNumber(a.current_price)}</td>
          <td class="px-4 py-3 text-right asset-data-cell">฿${window.formatCurrency(a.total_cost)}</td>
          <td class="px-4 py-3 text-right text-emerald-400 font-semibold">฿${window.formatCurrency(a.market_value)}</td>
          <td class="px-4 py-3 text-right font-medium ${plCls}">฿${window.formatCurrency(a.unrealized_pl)}</td>
          <td class="px-4 py-3 text-right font-semibold ${plCls}">${plPctStr}</td>
          <td class="px-4 py-3 text-right text-amber-400">฿${window.formatCurrency(a.realized_pl || 0)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Dynamic count
    const countBadge = document.getElementById('asset-count-badge');
    if (countBadge) countBadge.textContent = `${list.length} Assets`;
  }
};

