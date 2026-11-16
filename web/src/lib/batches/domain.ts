/**
 * web/src/lib/batches/domain.ts
 * Pure Isomorphic Batches & Expiry Dates Domain for Roshetta.
 * Strictly adheres to GS1, FDA/EMA, and international hospital/community pharmacy FEFO standards.
 * Shared across Web, Mobile, and Backend.
 */

export const EXPIRY_CRITICAL_DAYS = 30; // <= 30 days is critical
export const EXPIRY_WARNING_DAYS = 90;  // <= 90 days is warning / expiring soon

export type ExpiryTier = "expired" | "critical" | "warning" | "good" | "none";

export interface ExpiryStatusEvaluation {
  iso: string;
  monthValue: string;
  date: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
  isCritical: boolean;
  isExpiringSoon: boolean;
  tier: ExpiryTier;
  status: ExpiryTier;
  labelAr: string;
  labelEn: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  isSellable: boolean; // Expired drugs must NEVER be sold!
}

export interface BatchItem {
  id: string;
  drug_id: string;
  drug_name: string;
  scientificName?: string;
  barcode?: string;
  category?: string;
  batch_number: string;
  expiry: string;
  expiry_date?: string;
  qty: number;
  remaining: number;
  remainingBoxes?: number;
  boxMultiplier?: number;
  units?: any;
  cost: number;
  purchase_price?: number;
  price: number;
  purchaseId?: string;
  branch_id?: string | null;
  branch_name?: string;
  branch?: string;
  createdAt?: string;
  expiryStatus?: ExpiryStatusEvaluation;
}

export interface BatchesKPIs {
  totalBatches: number;
  expiredBatches: number;
  criticalBatches: number;
  warningBatches: number;
  goodBatches: number;
  totalPhysicalQty: number;
  capitalAtRisk: number; // Wholesale cost of (expired + critical + warning) batches
  expiredLossValue: number; // Wholesale cost of already expired batches
  potentialRetailLoss: number; // Retail value of expiring batches
  tierBreakdown: Array<{
    tier: ExpiryTier;
    labelAr: string;
    labelEn: string;
    count: number;
    qty: number;
    costValue: number;
    retailValue: number;
    color: string;
    percentage: number;
  }>;
}

export function round2(num: number): number {
  return Math.round((Number(num) || 0) * 100) / 100;
}

/**
 * Normalizes any date string or year-month format to standard ISO YYYY-MM-DD.
 * If given YYYY-MM (e.g. "2026-11"), sets to the LAST day of that month (e.g. "2026-11-30"),
 * which is the standard regulatory definition for pharmaceutical expiration dates.
 */
export function normalizeExpiryIso(raw?: unknown): string {
  if (!raw) return "";
  let s = String(raw).trim();
  if (!s) return "";

  // Remove common separators and normalize slashes to dashes
  s = s.replace(/[\/\\.]/g, "-");

  // Handle MM-YY or MM-YYYY (e.g. 11-26 or 11-2026)
  const mmyyMatch = s.match(/^(\d{1,2})-(\d{2}|\d{4})$/);
  if (mmyyMatch) {
    const month = parseInt(mmyyMatch[1], 10);
    let year = parseInt(mmyyMatch[2], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }
  }

  // Handle YYYY-MM
  const yymmMatch = s.match(/^(\d{4})-(\d{1,2})$/);
  if (yymmMatch) {
    const year = parseInt(yymmMatch[1], 10);
    const month = parseInt(yymmMatch[2], 10);
    if (month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }
  }

  // Handle YYYY-MM-DD
  const yymmddMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (yymmddMatch) {
    const year = parseInt(yymmddMatch[1], 10);
    const month = parseInt(yymmddMatch[2], 10);
    const day = parseInt(yymmddMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().split("T")[0];
  }

  return "";
}

export function parseExpiryDate(iso: string): Date | null {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

/**
 * Pure evaluation of a batch's expiry status against current or specified date.
 */
export function evaluateBatchExpiry(
  expiryRaw?: unknown,
  nowInput: Date | string | number | null = null
): ExpiryStatusEvaluation {
  const iso = normalizeExpiryIso(expiryRaw);
  const date = parseExpiryDate(iso);

  if (!date) {
    return {
      iso: "",
      monthValue: "",
      date: null,
      daysLeft: null,
      isExpired: false,
      isCritical: false,
      isExpiringSoon: false,
      tier: "none",
      status: "none",
      labelAr: "بدون تاريخ صلاحية",
      labelEn: "No Expiry Date",
      color: "#64748B",
      badgeBg: "bg-slate-100",
      badgeText: "text-slate-700",
      isSellable: true,
    };
  }

  const nowDate = nowInput ? (nowInput instanceof Date ? nowInput : new Date(nowInput)) : new Date();
  const nowDayMs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), 0, 0, 0, 0);
  const expDayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);

  const daysLeft = Math.round((expDayMs - nowDayMs) / 86400000);
  const isExpired = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= EXPIRY_CRITICAL_DAYS;
  const isExpiringSoon = !isExpired && daysLeft <= EXPIRY_WARNING_DAYS;

  let tier: ExpiryTier = "good";
  let labelAr = "صالح وسليم";
  let labelEn = "Good / Valid";
  let color = "#059669";
  let badgeBg = "bg-emerald-50 border-emerald-200";
  let badgeText = "text-emerald-700";

  if (isExpired) {
    tier = "expired";
    labelAr = "منتهي الصلاحية (ممنوع البيع)";
    labelEn = "Expired (Sale Blocked)";
    color = "#DC2626";
    badgeBg = "bg-red-50 border-red-200";
    badgeText = "text-red-700 font-bold";
  } else if (isCritical) {
    tier = "critical";
    labelAr = `حرج جداً (${daysLeft} يوم متبقي)`;
    labelEn = `Critical (${daysLeft}d left)`;
    color = "#EA580C";
    badgeBg = "bg-orange-50 border-orange-200";
    badgeText = "text-orange-700 font-bold";
  } else if (isExpiringSoon) {
    tier = "warning";
    labelAr = `قريب الانتهاء (${daysLeft} يوم متبقي)`;
    labelEn = `Expiring Soon (${daysLeft}d left)`;
    color = "#D97706";
    badgeBg = "bg-amber-50 border-amber-200";
    badgeText = "text-amber-700";
  }

  return {
    iso,
    monthValue: iso.slice(0, 7),
    date,
    daysLeft,
    isExpired,
    isCritical,
    isExpiringSoon,
    tier,
    status: tier,
    labelAr,
    labelEn,
    color,
    badgeBg,
    badgeText,
    isSellable: !isExpired,
  };
}

/**
 * Calculates complete Batches KPIs & Capital at Risk.
 */
export function calculateBatchesKPIs(batches: BatchItem[], nowInput: Date | string | null = null): BatchesKPIs {
  let totalBatches = 0;
  let expiredBatches = 0;
  let criticalBatches = 0;
  let warningBatches = 0;
  let goodBatches = 0;

  let totalPhysicalQty = 0;
  let capitalAtRisk = 0;
  let expiredLossValue = 0;
  let potentialRetailLoss = 0;

  const tierMap: Record<ExpiryTier, { count: number; qty: number; costValue: number; retailValue: number }> = {
    expired: { count: 0, qty: 0, costValue: 0, retailValue: 0 },
    critical: { count: 0, qty: 0, costValue: 0, retailValue: 0 },
    warning: { count: 0, qty: 0, costValue: 0, retailValue: 0 },
    good: { count: 0, qty: 0, costValue: 0, retailValue: 0 },
    none: { count: 0, qty: 0, costValue: 0, retailValue: 0 },
  };

  (batches || []).forEach((b) => {
    const qty = round2(Number(b.remaining ?? b.qty) || 0);
    if (qty <= 0) return;

    totalBatches += 1;
    totalPhysicalQty += qty;

    const unitCost = round2(Number(b.cost ?? b.purchase_price) || 0);
    const unitPrice = round2(Number(b.price) || 0);
    const costTotal = round2(qty * unitCost);
    const retailTotal = round2(qty * unitPrice);

    const est = b.expiryStatus || evaluateBatchExpiry(b.expiry || b.expiry_date, nowInput);
    const tier = est.tier;

    if (tier === "expired") {
      expiredBatches += 1;
      expiredLossValue += costTotal;
      capitalAtRisk += costTotal;
      potentialRetailLoss += retailTotal;
    } else if (tier === "critical") {
      criticalBatches += 1;
      capitalAtRisk += costTotal;
      potentialRetailLoss += retailTotal;
    } else if (tier === "warning") {
      warningBatches += 1;
      capitalAtRisk += costTotal;
      potentialRetailLoss += retailTotal;
    } else {
      goodBatches += 1;
    }

    tierMap[tier].count += 1;
    tierMap[tier].qty += qty;
    tierMap[tier].costValue += costTotal;
    tierMap[tier].retailValue += retailTotal;
  });

  totalPhysicalQty = round2(totalPhysicalQty);
  capitalAtRisk = round2(capitalAtRisk);
  expiredLossValue = round2(expiredLossValue);
  potentialRetailLoss = round2(potentialRetailLoss);

  const tierMeta: Record<ExpiryTier, { labelAr: string; labelEn: string; color: string }> = {
    expired: { labelAr: "منتهية الصلاحية", labelEn: "Expired", color: "#DC2626" },
    critical: { labelAr: "حرجة (<= 30 يوم)", labelEn: "Critical (<= 30d)", color: "#EA580C" },
    warning: { labelAr: "قريبة الانتهاء (<= 90 يوم)", labelEn: "Expiring Soon (<= 90d)", color: "#D97706" },
    good: { labelAr: "صالحة وسليمة", labelEn: "Good / Valid", color: "#059669" },
    none: { labelAr: "بدون تاريخ", labelEn: "No Expiry", color: "#64748B" },
  };

  const tierBreakdown = (["expired", "critical", "warning", "good", "none"] as ExpiryTier[]).map((tierKey) => {
    const data = tierMap[tierKey];
    const meta = tierMeta[tierKey];
    return {
      tier: tierKey,
      labelAr: meta.labelAr,
      labelEn: meta.labelEn,
      count: data.count,
      qty: round2(data.qty),
      costValue: round2(data.costValue),
      retailValue: round2(data.retailValue),
      color: meta.color,
      percentage: totalBatches > 0 ? round2((data.count / totalBatches) * 100) : 0,
    };
  });

  return {
    totalBatches,
    expiredBatches,
    criticalBatches,
    warningBatches,
    goodBatches,
    totalPhysicalQty,
    capitalAtRisk,
    expiredLossValue,
    potentialRetailLoss,
    tierBreakdown,
  };
}

/**
 * Filters a list of batches by status tier, branch, and search query.
 */
export function filterBatchesList(
  batches: BatchItem[],
  filters: {
    status?: string;
    branchId?: string;
    search?: string;
    nowInput?: Date | string | null;
  }
): BatchItem[] {
  const { status = "all", branchId = "all", search = "", nowInput = null } = filters;
  const q = search.trim().toLowerCase();

  return (batches || []).filter((b) => {
    // Branch filter
    if (branchId && branchId !== "all") {
      const bBranch = String(b.branch_id || b.branch || "");
      if (bBranch !== branchId && b.branch_name !== branchId) {
        return false;
      }
    }

    const est = b.expiryStatus || evaluateBatchExpiry(b.expiry || b.expiry_date, nowInput);

    // Status filter
    if (status === "expired" && !est.isExpired) return false;
    if (status === "critical" && !est.isCritical) return false;
    if (status === "warning" && (!est.isExpiringSoon || est.isCritical || est.isExpired)) return false;
    if (status === "expiring" && !(est.isExpiringSoon || est.isExpired)) return false;
    if (status === "good" && (est.isExpired || est.isExpiringSoon)) return false;

    // Search query
    if (q) {
      const drugName = String(b.drug_name || "").toLowerCase();
      const sciName = String(b.scientificName || "").toLowerCase();
      const batchNum = String(b.batch_number || "").toLowerCase();
      const barcode = String(b.barcode || "").toLowerCase();
      const cat = String(b.category || "").toLowerCase();

      if (!drugName.includes(q) && !sciName.includes(q) && !batchNum.includes(q) && !barcode.includes(q) && !cat.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Formats standard packaging units representation.
 */
export function formatBatchQuantity(
  qty: number,
  units?: any,
  language: "ar" | "en" = "ar"
): string {
  const isEn = language === "en";
  const num = round2(Number(qty) || 0);
  if (!units || typeof units !== "object") {
    return `${num} ${isEn ? "Units" : "وحدة"}`;
  }

  const mult = Number(units.count ?? units.box_count ?? units.strips_per_box) || 1;
  if (mult <= 1) {
    return `${num} ${isEn ? (units.base_unit || "Box") : (units.base_unit || "علبة")}`;
  }

  const boxes = Math.floor(num / mult);
  const loose = round2(num % mult);

  if (boxes > 0 && loose > 0) {
    return isEn
      ? `${boxes} Box(es) + ${loose} Loose`
      : `${boxes} علبة + ${loose} وحدة`;
  }
  if (boxes > 0) {
    return isEn ? `${boxes} Box(es)` : `${boxes} علبة`;
  }
  return isEn ? `${loose} Loose` : `${loose} وحدة`;
}

/**
 * Builds an official Pharmaceutical Destruction & Disposal Report HTML
 * (محضر رسمي لإتلاف وتكهين أدوية منتهية الصلاحية) with signatures and financial loss tally.
 */
export function buildDisposalVoucherHtml(params: {
  batches: BatchItem[];
  pharmacyName: string;
  branchName?: string;
  recordedBy?: string;
  reason?: string;
  language?: string;
}): string {
  const {
    batches,
    pharmacyName,
    branchName = "الفرع الرئيسي",
    recordedBy = "الصيدلي المسؤول",
    reason = "انتهاء فترة الصلاحية الدوائية (Disposed & Written-off)",
    language = "ar",
  } = params;

  const isRtl = language !== "en";
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let totalCostLoss = 0;
  let totalRetailValue = 0;
  let totalUnits = 0;

  batches.forEach((b) => {
    const q = round2(Number(b.remaining ?? b.qty) || 0);
    const c = round2(Number(b.cost ?? b.purchase_price) || 0);
    const p = round2(Number(b.price) || 0);
    totalUnits += q;
    totalCostLoss += round2(q * c);
    totalRetailValue += round2(q * p);
  });

  return `
    <div style="width: 100%; max-width: 780px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.8; box-sizing: border-box; padding: 24px; border: 2.5px solid #dc2626; border-radius: 12px;">
      
      <!-- Top Title Block -->
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #dc2626; padding-bottom: 14px; margin-bottom: 16px;">
        <tr>
          <td style="vertical-align: middle; width: 60%;">
            <div style="font-size: 21px; font-weight: bold; color: #991b1b; line-height: 1.4;">
              ${isRtl ? "محضر رسمي لإتلاف وتكهين أدوية منتهية الصلاحية" : "Official Pharmaceutical Destruction Protocol"}
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #334155; margin-top: 2px;">
              ${pharmacyName} — ${branchName}
            </div>
          </td>
          <td style="vertical-align: middle; width: 40%; text-align: ${isRtl ? "left" : "right"};">
            <div style="background: #fef2f2; border: 1.5px solid #fecaca; display: inline-block; padding: 8px 14px; border-radius: 8px;">
              <div style="font-size: 11px; color: #991b1b; font-weight: bold;">
                ${isRtl ? "تاريخ المحضر والتحرير:" : "Protocol Date & Time:"}
              </div>
              <div style="font-size: 13px; font-weight: bold; color: #1e293b; font-family: monospace;">
                ${dateStr} ${timeStr}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Executive Loss Statement -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 0 -4px 18px -4px;">
        <tr>
          <td style="background: #fef2f2; border: 1.5px solid #f87171; border-radius: 8px; padding: 10px 14px; width: 33.3%;">
            <div style="font-size: 11px; font-weight: bold; color: #991b1b;">${isRtl ? "إجمالي خسارة التكلفة (Wholesale Loss)" : "Total Cost Loss"}</div>
            <div style="font-size: 20px; font-weight: 900; color: #dc2626; font-family: monospace;">₪${totalCostLoss.toFixed(2)}</div>
          </td>
          <td style="background: #fff7ed; border: 1.5px solid #fdba74; border-radius: 8px; padding: 10px 14px; width: 33.3%;">
            <div style="font-size: 11px; font-weight: bold; color: #9a3412;">${isRtl ? "القيمة البيعية المتلفة" : "Total Retail Loss"}</div>
            <div style="font-size: 20px; font-weight: 900; color: #c2410c; font-family: monospace;">₪${totalRetailValue.toFixed(2)}</div>
          </td>
          <td style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; width: 33.3%;">
            <div style="font-size: 11px; font-weight: bold; color: #334155;">${isRtl ? "عدد التشغيلات / الكمية" : "Batches / Total Qty"}</div>
            <div style="font-size: 20px; font-weight: 900; color: #0f172a; font-family: monospace;">${batches.length} تشغيلة (${totalUnits})</div>
          </td>
        </tr>
      </table>

      <!-- Reason Note -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px;">
        <span style="font-weight: bold; color: #475569;">${isRtl ? "سبب التكهين والإجراء:" : "Reason & Action:"}</span>
        <span style="color: #1e293b; margin-inline-start: 6px;">${reason}</span>
      </div>

      <!-- Itemized Batches Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; margin-bottom: 24px;">
        <thead>
          <tr style="background: #991b1b; color: #ffffff;">
            <th style="padding: 8px 10px; width: 35px; text-align: center; border: 1px solid #991b1b;">#</th>
            <th style="padding: 8px 10px; width: 40%; text-align: ${isRtl ? "right" : "left"}; border: 1px solid #991b1b;">${isRtl ? "الصنف الدوائي" : "Drug Name"}</th>
            <th style="padding: 8px 10px; width: 18%; text-align: center; border: 1px solid #991b1b;">${isRtl ? "رقم التشغيلة (Batch #)" : "Batch #"}</th>
            <th style="padding: 8px 10px; width: 16%; text-align: center; border: 1px solid #991b1b;">${isRtl ? "تاريخ الصلاحية" : "Expiry"}</th>
            <th style="padding: 8px 10px; width: 12%; text-align: center; border: 1px solid #991b1b;">${isRtl ? "الكمية" : "Qty"}</th>
            <th style="padding: 8px 10px; width: 14%; text-align: center; border: 1px solid #991b1b;">${isRtl ? "خسارة التكلفة (₪)" : "Cost Loss (₪)"}</th>
          </tr>
        </thead>
        <tbody>
          ${batches.map((b, idx) => {
            const q = round2(Number(b.remaining ?? b.qty) || 0);
            const c = round2(Number(b.cost ?? b.purchase_price) || 0);
            const lineCost = round2(q * c);
            const exp = normalizeExpiryIso(b.expiry || b.expiry_date);
            return `
              <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#fef2f2"}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 7px 10px; text-align: center; color: #64748b; font-weight: bold; border: 1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding: 7px 10px; font-weight: bold; color: #0f172a; border: 1px solid #e2e8f0;">${b.drug_name || "دواء غير مسمى"}</td>
                <td style="padding: 7px 10px; text-align: center; font-family: monospace; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">${b.batch_number || "—"}</td>
                <td style="padding: 7px 10px; text-align: center; font-family: monospace; font-weight: bold; color: #dc2626; border: 1px solid #e2e8f0;">${exp}</td>
                <td style="padding: 7px 10px; text-align: center; font-weight: bold; border: 1px solid #e2e8f0;">${q}</td>
                <td style="padding: 7px 10px; text-align: center; font-weight: bold; color: #dc2626; font-family: monospace; border: 1px solid #e2e8f0;">₪${lineCost.toFixed(2)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <!-- Sign-off & Legal Declarations -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: avoid;">
        <tr>
          <td style="width: 33.3%; text-align: center; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 30px;">
              ${isRtl ? "إعداد وتحرير الصيدلي" : "Prepared by Pharmacist"}
            </div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 4px; font-size: 9.5px; color: #94a3b8;">
              ${recordedBy}
            </div>
          </td>
          <td style="width: 33.3%; text-align: center; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 30px;">
              ${isRtl ? "لجنة الإتلاف / المراجعة" : "Audit & Verification Committee"}
            </div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 4px; font-size: 9.5px; color: #94a3b8;">
              ${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}
            </div>
          </td>
          <td style="width: 33.3%; text-align: center; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 30px;">
              ${isRtl ? "اعتماد المدير المسؤول" : "Responsible Manager Approval"}
            </div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 4px; font-size: 9.5px; color: #94a3b8;">
              ${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}
            </div>
          </td>
        </tr>
      </table>

      <!-- System Footer -->
      <div style="margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 10px; color: #94a3b8;">
        ${isRtl ? "نظام روشتة لإدارة الصيدليات • محضر إتلاف وتكهين دوائي معتمد" : "Roshetta Pharmacy System • Authorized Disposal Protocol"}
      </div>
    </div>
  `;
}
