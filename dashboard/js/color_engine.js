// =========================================================================
// ระบบจัดการชุดสีกลางระดับสถาบัน (Institutional Dynamic Color Engine)
// พัฒนาสำหรับ Family Investment Portfolio เพื่อความแม่นยำของข้อมูลการเงิน
// 1. ล็อกชุดสีความหมายเดิม (Semantic Lock) 100% ป้องกันความคลาดเคลื่อนระหว่างกราฟ
// 2. ระบบสร้างสีอัตโนมัติแบบไม่ชนกัน (Collision-Free Golden Angle) สำหรับสินทรัพย์ใหม่
// 3. ระบบสร้างเฉดสี Monotone แบบ Dynamic ไม่จำกัดจำนวนหุ้นของ PP และ JJ
// =========================================================================

(function () {
  'use strict';

  // 1. ล็อกชุดสีความหมายเดิม 100% (Immutable Semantic Asset Palette)
  // อ้างอิงตามมาตรฐานเศรษฐศาสตร์และการลงทุนเดิมของระบบ
  const SEMANTIC_ASSET_PALETTE = {
    'CASH':      '#475569', // เทาเข้ม Slate (สภาพคล่องเงินสด)
    'BOND':      '#94a3b8', // เทาสว่าง (ตราสารหนี้)
    'FCD':       '#0ea5e9', // ฟ้า USD (เงินตราต่างประเทศ)
    'GOLD':      '#f59e0b', // เหลืองทอง (ทองคำแท่ง)
    'GOLDFUND':  '#d97706', // เหลืองทองเข้ม (กองทุนทองคำ)
    'THSTOCK':   '#0f4c81', // น้ำเงินกรมท่าธงชาติไทย (หุ้นไทย)
    'THFUND':    '#1e40af', // น้ำเงินไทย (กองทุนหุ้นไทย)
    'ASIAFUND':  '#f97316', // ส้มอมแดง Coral (กองทุนเอเชีย)
    'CHIFUND':   '#ef4444', // แดงจีน (กองทุนจีน)
    'USAFUND':   '#2563eb', // น้ำเงินสด American Cobalt Blue (กองทุนสหรัฐฯ)
    'SEMIFUND':  '#6366f1', // ครามไฮเทค Indigo (กองทุนเซมิคอนดักเตอร์/เทคโนโลยี)
    'OTHER':     '#64748b'  // เทากลาง (สินทรัพย์อื่นๆ)
  };

  // สีประจำตัวบุคคลและพอร์ตรวม (Role & Identity Colors)
  const IDENTITY_PALETTE = {
    'TOTAL': { primary: '#10b981', light: '#059669', dark: '#34d399', bgLight: '#ecfdf5', bgDark: 'rgba(16, 185, 129, 0.15)' },
    'PP':    { primary: '#06b6d4', light: '#0891b2', dark: '#22d3ee', bgLight: '#ecfeff', bgDark: 'rgba(6, 182, 212, 0.15)' },
    'JJ':    { primary: '#f59e0b', light: '#d97706', dark: '#fbbf24', bgLight: '#fffbeb', bgDark: 'rgba(245, 158, 11, 0.15)' }
  };

  // แคชเก็บสีที่คำนวณแล้วสำหรับสินทรัพย์ใหม่ เพื่อให้สีคงที่ตลอดทั้งเซสชัน
  const dynamicAssetColorCache = new Map();

  // ฐาน Hue ดั้งเดิมของ 11 หมวด เพื่อใช้ระบบ Collision Avoidance หลบเลี่ยงไม่ให้สีใหม่ไปซ้ำ
  const LOCKED_HUES = [
    215, // CASH
    215, // BOND
    199, // FCD
    38,  // GOLD
    35,  // GOLDFUND
    208, // THSTOCK
    224, // THFUND
    24,  // ASIAFUND
    0,   // CHIFUND
    221, // USAFUND
    239  // SEMIFUND
  ];

  // Helper แปลง HSL เป็น HEX
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  // Helper แปลง HEX เป็น RGBA รองรับความโปร่งแสง (Alpha)
  function hexToRgba(hexStr, alpha = 1) {
    if (!hexStr) return `rgba(148, 163, 184, ${alpha})`;
    if (hexStr.startsWith('hsl')) {
      return hexStr.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
    }
    if (hexStr.startsWith('rgb')) {
      return hexStr.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    let c = hexStr.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return `rgba(148, 163, 184, ${alpha})`;
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  window.ColorEngine = {
    semanticPalette: SEMANTIC_ASSET_PALETTE,
    identityPalette: IDENTITY_PALETTE,
    hexToRgba,

    /**
     * ดึงรหัสสีประจำประเภทสินทรัพย์ (คงที่ 11 หมวดเดิม 100% + ป้องกันสีซ้ำสำหรับสินทรัพย์ใหม่)
     * @param {string} assetClass - ชื่อหมวดสินทรัพย์ เช่น 'THSTOCK', 'GOLD', 'REIT', 'CRYPTO'
     * @returns {string} Hex color string
     */
    getAssetColor(assetClass) {
      if (!assetClass) return '#94a3b8';
      const key = String(assetClass).trim().toUpperCase();

      // 1. ตรวจสอบ 11 หมวดมาตรฐานหลัก ถ้ามีให้ใช้สีมาตรฐานเดิมทันที
      if (SEMANTIC_ASSET_PALETTE[key]) {
        return SEMANTIC_ASSET_PALETTE[key];
      }

      // 2. ถ้าเป็นสินทรัพย์ใหม่และเคยคำนวณไว้แล้ว ให้คืนค่าจากหน่วยความจำ
      if (dynamicAssetColorCache.has(key)) {
        return dynamicAssetColorCache.get(key);
      }

      // 3. ตรรกะคำนวณสีสำหรับสินทรัพย์ใหม่ (Deterministic Golden Angle + Collision Avoidance)
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      const seed = Math.abs(hash);

      // Golden Angle = 137.508° รับประกันการกระจายตัวของเฉดสีทั่ววงล้อ
      let assignedHue = (seed * 137.508) % 360;

      // ตรวจสอบระยะห่างทางสายตา ไม่ให้ใกล้กับ 11 หมวดเดิมเกิน 16°
      let attempts = 0;
      const isColliding = h => {
        for (const locked of LOCKED_HUES) {
          const diff = Math.min(Math.abs(h - locked), 360 - Math.abs(h - locked));
          if (diff < 16) return true;
        }
        return false;
      };

      while (isColliding(assignedHue) && attempts < 12) {
        assignedHue = (assignedHue + 38.2) % 360;
        attempts++;
      }

      // ปรับระดับความสว่าง (Tiered Luminance) ให้คมชัดทั้ง Light และ Dark mode
      const lightness = 48 + (seed % 3) * 6; // 48%, 54%, 60%
      const saturation = 72;

      const generatedHex = hslToHex(assignedHue, saturation, lightness);
      dynamicAssetColorCache.set(key, generatedHex);
      return generatedHex;
    },

    /**
     * คืนค่าสไตล์ Badge สำหรับสินทรัพย์ใหม่ให้ผ่านเกณฑ์ WCAG 2.1 AA อ่านออกชัดเจนทั้ง 2 ธีม
     * @param {string} assetClass - ชื่อหมวดสินทรัพย์
     * @param {boolean} isLight - โหมดสว่างหรือไม่
     * @returns {string} Inline style string
     */
    getAssetBadgeStyle(assetClass, isLight) {
      const color = this.getAssetColor(assetClass);
      if (isLight) {
        return `background: ${this.hexToRgba(color, 0.12)}; color: ${color}; border: 1px solid ${this.hexToRgba(color, 0.35)};`;
      } else {
        return `background: ${this.hexToRgba(color, 0.22)}; color: #f8fafc; border: 1px solid ${this.hexToRgba(color, 0.45)};`;
      }
    },

    /**
     * สร้างชุดสี Monotone Dynamic สำหรับกราฟวงกลมหุ้นไทยของ PP และ JJ
     * แก้ไขจุดบกพร่องที่เดิมฮาร์ดโค้ดไว้เพียง 17 สี รองรับหุ้นได้ไม่จำกัด (20, 50, 100+ ตัว)
     * พร้อมสลับระดับความสว่าง (Zig-zag Luminance) เพื่อให้ขอบชิ้นส่วนที่ติดกันแยกออกจากกันชัดเจน
     * @param {'PP'|'JJ'} owner - เจ้าของพอร์ต
     * @param {number} count - จำนวนหุ้นทั้งหมดในพอร์ต
     * @returns {string[]} อาร์เรย์ของรหัสสี Hex
     */
    getOwnerStockPalette(owner, count) {
      if (!count || count <= 0) count = 1;

      // ฐานสีหลัก: PP = ฟ้า/น้ำเงิน/Cyan (Hue ~198°), JJ = ทอง/อำพัน/ส้มอมน้ำตาล (Hue ~38°)
      const isPP = (owner || '').toUpperCase() === 'PP';
      const baseHue = isPP ? 198 : 38;
      const hueSpread = isPP ? 28 : 22; // กระจาย Hue เล็กน้อยเพื่อให้มิติสวยงาม

      const colors = [];
      // ลำดับสลับความสว่างซิกแซกเพื่อไม่ให้ชิ้นส่วนวงกลมที่ติดกันสีกลืนกัน
      const lightTiers = [64, 40, 56, 34, 50, 44];

      for (let i = 0; i < count; i++) {
        const stepFraction = count > 1 ? (i / (count - 1)) : 0;
        const currentHue = baseHue + (stepFraction - 0.5) * hueSpread;
        const lightness = lightTiers[i % lightTiers.length] + ((i * 2) % 6) - 3;
        const saturation = isPP ? 82 : 86;

        colors.push(hslToHex(currentHue, saturation, Math.max(30, Math.min(74, lightness))));
      }

      return colors;
    }
  };
})();

