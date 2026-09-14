// View 2: Portfolio Allocation & Performance (v3.4.1 - CASH Integration & Semantic Palette)

window.AllocationView = {
  allocationChart: null,
  assetHistoryChart: null,
  historyRange: 'ALL',
  currentSortField: 'market_value',
  currentSortOrder: 'desc',
  searchQuery: '',
  selectedOwner: 'TOTAL',
  selectedClasses: null, // null = show all; Set = specific classes

  // ลำดับมาตรฐาน (Canonical Hierarchy Order)
  // เรียงจาก: เสี่ยงต่ำสุด > Store of Value > ตราสารทุน (ใกล้ตัว > ไกลตัว)
  orderedClassKeys: [
    'CASH',      // 1. เงินสดสภาพคล่อง (เสี่ยงต่ำสุด)
    'BOND',      // 2. ตราสารหนี้
    'FCD',       // 3. บัญชีเงินฝากต่างประเทศ USD
    'GOLD',      // 4. ทองคำแท่ง (Store of Value)
    'GOLDFUND',  // 5. กองทุนทองคำ
    'THSTOCK',   // 6. หุ้นไทย (ตราสารทุน - ใกล้ตัวที่สุด)
    'THFUND',    // 7. กองทุนหุ้นไทย
    'ASIAFUND',  // 8. กองทุนเอเชีย (ภูมิภาคใกล้เคียง)
    'CHIFUND',   // 9. กองทุนจีน
    'USAFUND',   // 10. กองทุนสหรัฐฯ (ต่างประเทศ/Global)
    'SEMIFUND'   // 11. กองทุนเซมิคอนดักเตอร์/เทคโนโลยี
  ],

  // ระบบสีสากลที่มีความหมาย (Semantic Unified Color Palette)
  colorPalette: {
    'CASH':      '#475569', // เทาเข้ม (เข้มกว่า Bond ชัดเจน)
    'BOND':      '#94a3b8', // เทาสว่าง (ต่างเฉดกับ Cash ไม่กลืนกับพื้นหลัง)
    'FCD':       '#0ea5e9', // ฟ้าดอลลาร์ USD (ตระกูลฟ้า-น้ำเงิน เชื่อมกับสหรัฐฯ)
    'GOLD':      '#f59e0b', // เหลืองทอง
    'GOLDFUND':  '#d97706', // เหลืองทองเข้ม
    'THSTOCK':   '#0f4c81', // น้ำเงินกรมท่าธงชาติไทย (สื่ออัตลักษณ์ไทย ชัดเจน)
    'THFUND':    '#1e40af', // น้ำเงินไทย
    'ASIAFUND':  '#f97316', // ส้มอมแดง Mandarin/Coral (โทนอุ่นใกล้เคียงจีน)
    'CHIFUND':   '#ef4444', // แดงจีน
    'USAFUND':   '#2563eb', // น้ำเงินสด American Cobalt Blue
    'SEMIFUND':  '#6366f1', // ครามไฮเทค Indigo (โทนเดียวกับ USA)
    'OTHER':     '#64748b'  // เทากลาง
  },

  // ตรรกะกำหนดสีสำหรับสินทรัพย์ (พร้อมคำนวณสีอัตโนมัติสำหรับสินทรัพย์ใหม่ในอนาคต)
  getAssetColor(assetClass) {
    if (!assetClass) return '#94a3b8';
    const upper = assetClass.toUpperCase();
    if (this.colorPalette[upper]) return this.colorPalette[upper];

    // สินทรัพย์ใหม่ในอนาคต: คำนวณสีแบบคงที่ (Deterministic HSL Hash)
    // ใช้ Golden Angle เพื่อกระจายสีอย่างสม่ำเสมอ และล็อกความสว่าง/ความสดไม่ให้เพี้ยนเป็นสีม่วงสุ่ม
    let hash = 0;
    for (let i = 0; i < upper.length; i++) {
      hash = upper.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs((hash * 137.5) % 360);
    return `hsl(${hue.toFixed(0)}, 70%, 52%)`;
  },

  // Helper: แปลง Hex หรือ HSL เป็น RGBA พร้อมค่าความโปร่งแสง (Alpha)
  hexToRgba(colorStr, alpha) {
    if (!colorStr) return `rgba(148, 163, 184, ${alpha})`;
    if (colorStr.startsWith('hsl')) {
      return colorStr.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
    }
    let c = colorStr.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
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

    // ดึงประเภทสินทรัพย์ที่ไม่ซ้ำจากข้อมูลจริง พร้อมเรียงลำดับตามความเสี่ยง orderedClassKeys
    const classes = [...new Set(allAssets.map(a => a.class).filter(Boolean))].sort((a, b) => {
      const idxA = this.orderedClassKeys.indexOf(a);
      const idxB = this.orderedClassKeys.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

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

    // เรียงลำดับประเภทสินทรัพย์ตามลำดับความเสี่ยงและภูมิศาสตร์ (เสี่ยงต่ำสุด > Store of Value > ตราสารทุน)
    const labels = Object.keys(classTotals).sort((a, b) => {
      const idxA = this.orderedClassKeys.indexOf(a);
      const idxB = this.orderedClassKeys.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    const data = labels.map(l => classTotals[l]);

    // ใช้ระบบสีมาตรฐานและระบบคำนวณสีอัตโนมัติ getAssetColor
    const backgroundColors = labels.map(l => this.getAssetColor(l));

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

  // View 2.2: Stacked Area Chart (Historical Asset Class Allocation Evolution) - v3.4.1
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

    // รายการ 10 สินทรัพย์มาตรฐาน เรียงจากฐานล่างสุด (เสี่ยงต่ำสุด CASH) ขึ้นไปบนสุด (เสี่ยงสูงสุด SEMIFUND)
    const classKeys = ['CASH', 'BOND', 'FCD', 'GOLD', 'GOLDFUND', 'THSTOCK', 'ASIAFUND', 'CHIFUND', 'USAFUND', 'SEMIFUND'];

    const datasets = classKeys.map(cls => {
      const color = this.getAssetColor(cls);
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
        backgroundColor: this.hexToRgba(color, 0.70),
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

    // Plugin to render Asset Class text directly inside each colored area
    const stackedAreaLabelsPlugin = {
      id: 'stackedAreaLabels',
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        if (!scales.x || !scales.y || !chartArea) return;

        const metaList = chart.data.datasets.map((_, i) => chart.getDatasetMeta(i));
        const pointCount = chart.data.labels.length;
        if (pointCount === 0) return;

        ctx.save();
        ctx.font = '600 11px "Inter", "Prompt", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        metaList.forEach((meta, datasetIdx) => {
          if (meta.hidden) return;
          const label = chart.data.datasets[datasetIdx].label;
          if (!label) return;

          // Scan points from 40% to 95% of timeline to find widest/thickest visible spot
          const startScan = Math.floor(pointCount * 0.35);
          const endScan = Math.min(pointCount - 1, Math.floor(pointCount * 0.95));

          let bestIdx = -1;
          let maxThickness = 0;
          let bestX = 0;
          let bestY = 0;

          for (let j = startScan; j <= endScan; j++) {
            const currPoint = meta.data[j];
            if (!currPoint) continue;

            const currY = currPoint.y;
            let baselineY;
            if (datasetIdx === 0) {
              baselineY = scales.y.getPixelForValue(0);
            } else {
              const prevPoint = metaList[datasetIdx - 1]?.data[j];
              baselineY = prevPoint ? prevPoint.y : scales.y.getPixelForValue(0);
            }

            const thickness = baselineY - currY;
            if (thickness > maxThickness) {
              maxThickness = thickness;
              bestIdx = j;
              bestX = currPoint.x;
              bestY = currY + (thickness / 2);
            }
          }

          // Render label if the band thickness is sufficiently large (>= 15px)
          if (maxThickness >= 15 && bestIdx !== -1) {
            if (bestX >= chartArea.left + 25 && bestX <= chartArea.right - 25) {
              // Subtle white contrast glow for clear readability on tinted background
              ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
              ctx.shadowBlur = 4;
              ctx.fillStyle = '#0f172a'; // Bold dark text
              ctx.fillText(label, bestX, bestY);

              // Reset shadow
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }
          }
        });

        ctx.restore();
      }
    };

    this.assetHistoryChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets
      },
      plugins: [stackedAreaLabelsPlugin],
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

        // ตรวจสอบว่าเป็นคลาสที่กำหนดไว้ใน CSS หรือไม่ หากเป็นคลาสใหม่ให้ใช้สีไดนามิก
        const assetColor = this.getAssetColor(a.class);
        const isKnownClass = this.orderedClassKeys.includes((a.class || '').toUpperCase());
        const inlineTagStyle = isKnownClass ? '' : `style="background: ${this.hexToRgba(assetColor, 0.2)}; color: ${assetColor}; border: 1px solid ${this.hexToRgba(assetColor, 0.35)};"`;

        const tr = document.createElement('tr');
        tr.className = 'holdings-data-row hover:bg-slate-800/20 transition-colors border-b border-gray-800/30';
        tr.innerHTML = `
          <td class="px-4 py-3 font-semibold asset-name-cell">${a.asset_name}</td>
          <td class="px-4 py-3"><span class="badge-tag tag-${a.class || 'OTHER'}" ${inlineTagStyle}>${a.class || 'OTHER'}</span></td>
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

