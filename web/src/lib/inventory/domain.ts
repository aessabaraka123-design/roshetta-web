/**
 * web/src/lib/inventory/domain.ts
 * Shared pure domain logic, FEFO/FIFO batch engine, unit conversions, RBAC policy,
 * stock ledger helpers & offline optimistic projection for Inventory.
 * Identical mirror of roshetta_server/inventory-domain.js and C:/roshetta_app/src/domain/inventoryDomain.js.
 */

export const DEFAULT_MIN_QTY_BOXES = 5;
export const EXPIRY_CRITICAL_DAYS = 30;
export const EXPIRY_WARNING_DAYS = 60;
export const STAGNANT_DAYS_THRESHOLD = 90;

export interface UnitTier {
  name: string;
  count: number;
  price: number;
  barcode?: string;
}

export interface BatchRecord {
  id: string;
  qty: number;
  originalQty?: number;
  remaining?: number;
  cost: number;
  costUnitSize?: number;
  price: number;
  expiry: string;
  batch_number: string;
  purchaseId: string;
  receiptEventId?: string;
  receiptLine?: number | string;
  reason?: string;
  createdAt: string;
}

export interface InventoryItemRecord {
  id: string;
  pharmacy_id?: string;
  barcode?: string;
  name: string;
  scientificName?: string;
  category?: string;
  manufacturer?: string;
  price: number;
  cost?: number;
  qty: number;
  minQty?: number;
  expiry?: string;
  lastSaleDate?: string;
  syncStatus?: string;
  isControlled?: number | boolean;
  units?: string | UnitTier[] | null;
  batch_number?: string;
  branch_id?: string | null;
  branchName?: string;
  batches?: string | BatchRecord[] | null;
  archived_at?: string | null;
  pending_qty?: number | null;
  pending_cost?: number | null;
  pending_price?: number | null;
}

export interface StockMovementRecord {
  id: string;
  pharmacy_id?: string;
  drug_id: string;
  drug_name: string;
  type: string;
  qty_before: number;
  qty_after: number;
  delta: number;
  unit_cost: number;
  batch_id: string;
  batch_number: string;
  reference_id: string;
  event_id: string;
  actor_name: string;
  notes: string;
  branch_id: string | null;
  created_at: string;
}

export interface StockAdjustmentRecord {
  id: string;
  drug_id: string;
  drug_name: string;
  barcode: string;
  reason: string;
  qty: number;
  cost?: number;
  loss_value?: number;
  recorded_by?: string;
  branch_id?: string | null;
  created_at: string;
}

export interface BranchRecord {
  id: string;
  name: string;
  status?: string;
}

export const STOCK_MOVEMENT_TYPES: Record<string, { code: string; labelAr: string; labelEn: string; direction: "in" | "out" | "adjust" }> = {
  purchase_receipt: { code: "purchase_receipt", labelAr: "استلام مشتريات", labelEn: "Purchase Receipt", direction: "in" },
  purchase_reversal: { code: "purchase_reversal", labelAr: "عكس/إلغاء مشتريات", labelEn: "Purchase Reversal", direction: "out" },
  sale: { code: "sale", labelAr: "مبيعات", labelEn: "Sale", direction: "out" },
  refund: { code: "refund", labelAr: "مرتجع مبيعات", labelEn: "Sales Refund", direction: "in" },
  stock_take: { code: "stock_take", labelAr: "جرد المخزون", labelEn: "Stock Take", direction: "adjust" },
  waste_adjustment: { code: "waste_adjustment", labelAr: "تالف / هدر", labelEn: "Waste / Damage", direction: "out" },
  manual_edit: { code: "manual_edit", labelAr: "تعديل يدوي", labelEn: "Manual Edit", direction: "adjust" },
  batch_split: { code: "batch_split", labelAr: "إضافة دفعة", labelEn: "Batch Added", direction: "in" },
  archive_zero: { code: "archive_zero", labelAr: "أرشفة", labelEn: "Archived", direction: "out" },
  restore: { code: "restore", labelAr: "استعادة من الأرشيف", labelEn: "Restored", direction: "in" },
  opening_balance: { code: "opening_balance", labelAr: "رصيد افتتاحي", labelEn: "Opening Balance", direction: "in" },
};

export const STOCK_ADJUSTMENT_REASONS = [
  { code: "damaged", labelAr: "تالف / كسر", labelEn: "Damaged / Broken" },
  { code: "expired", labelAr: "منتهي الصلاحية", labelEn: "Expired Stock" },
  { code: "lost", labelAr: "فقدان / عجز", labelEn: "Lost / Missing" },
  { code: "sample", labelAr: "مستهلك / عينة", labelEn: "Used / Sample" },
  { code: "other", labelAr: "أخرى", labelEn: "Other" },
];

export const INVENTORY_CATEGORIES = [
  { code: "general_medicines", labelAr: "أدوية عامة", labelEn: "General Medicines", aliases: ["أدوية عامة", "ادوية عامة", "general medicines", "general", "عام", "أدوية", "ادوية"] },
  { code: "antibiotics", labelAr: "مضادات حيوية", labelEn: "Antibiotics", aliases: ["مضادات حيوية", "antibiotics", "مضاد حيوي"] },
  { code: "painkillers", labelAr: "مسكنات", labelEn: "Painkillers", aliases: ["مسكنات", "مسكن", "painkillers", "analgesics"] },
  { code: "vitamins", labelAr: "فيتامينات ومكملات", labelEn: "Vitamins & Supplements", aliases: ["فيتامينات ومكملات", "فيتامينات", "vitamins", "supplements"] },
  { code: "chronic", labelAr: "أدوية مزمنة", labelEn: "Chronic Care", aliases: ["أدوية مزمنة", "امراض مزمنة", "chronic", "chronic care"] },
  { code: "pediatrics", labelAr: "أطفال", labelEn: "Pediatrics", aliases: ["أطفال", "اطفال", "pediatrics", "kids"] },
  { code: "cosmetics", labelAr: "مستحضرات تجميل", labelEn: "Cosmetics & Skin", aliases: ["مستحضرات تجميل", "عناية بالبشرة", "تجميل", "cosmetics", "skincare", "beauty"] },
  { code: "medical_supplies", labelAr: "مستلزمات طبية", labelEn: "Medical Supplies", aliases: ["مستلزمات طبية", "مستلزمات", "medical supplies", "supplies"] },
  { code: "other", labelAr: "أخرى", labelEn: "Other", aliases: ["أخرى", "اخرى", "other"] },
];

export const UNIT_DICTIONARY: Record<string, { code: string; ar: string; enSingle: string; enPlural: string }> = {
  "علبة": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "علب": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "box": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "boxes": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "box(es)": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "can": { code: "box", ar: "علبة", enSingle: "Box", enPlural: "Boxes" },
  "كرتونة": { code: "carton", ar: "كرتونة", enSingle: "Carton", enPlural: "Cartons" },
  "carton": { code: "carton", ar: "كرتونة", enSingle: "Carton", enPlural: "Cartons" },
  "شريط": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "أشرطة": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "اشرطة": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "strip": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "strips": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "tape": { code: "strip", ar: "شريط", enSingle: "Strip", enPlural: "Strips" },
  "حبة": { code: "pill", ar: "حبة", enSingle: "Pill", enPlural: "Pills" },
  "حبوب": { code: "pill", ar: "حبة", enSingle: "Pill", enPlural: "Pills" },
  "pill": { code: "pill", ar: "حبة", enSingle: "Pill", enPlural: "Pills" },
  "pills": { code: "pill", ar: "حبة", enSingle: "Pill", enPlural: "Pills" },
  "grain": { code: "pill", ar: "حبة", enSingle: "Pill", enPlural: "Pills" },
  "قرص": { code: "tablet", ar: "قرص", enSingle: "Tablet", enPlural: "Tablets" },
  "أقراص": { code: "tablet", ar: "أقراص", enSingle: "Tablet", enPlural: "Tablets" },
  "اقراص": { code: "tablet", ar: "أقراص", enSingle: "Tablet", enPlural: "Tablets" },
  "tablet": { code: "tablet", ar: "قرص", enSingle: "Tablet", enPlural: "Tablets" },
  "tablets": { code: "tablet", ar: "أقراص", enSingle: "Tablet", enPlural: "Tablets" },
  "كبسولة": { code: "capsule", ar: "كبسولة", enSingle: "Capsule", enPlural: "Capsules" },
  "كبسولات": { code: "capsule", ar: "كبسولة", enSingle: "Capsule", enPlural: "Capsules" },
  "capsule": { code: "capsule", ar: "كبسولة", enSingle: "Capsule", enPlural: "Capsules" },
  "capsules": { code: "capsule", ar: "كبسولة", enSingle: "Capsule", enPlural: "Capsules" },
  "زجاجة": { code: "bottle", ar: "زجاجة", enSingle: "Bottle", enPlural: "Bottles" },
  "قارورة": { code: "bottle", ar: "قارورة", enSingle: "Bottle", enPlural: "Bottles" },
  "bottle": { code: "bottle", ar: "زجاجة", enSingle: "Bottle", enPlural: "Bottles" },
  "bottles": { code: "bottle", ar: "زجاجة", enSingle: "Bottle", enPlural: "Bottles" },
  "أمبول": { code: "ampoule", ar: "أمبول", enSingle: "Ampoule", enPlural: "Ampoules" },
  "امبول": { code: "ampoule", ar: "أمبول", enSingle: "Ampoule", enPlural: "Ampoules" },
  "أمبولة": { code: "ampoule", ar: "أمبولة", enSingle: "Ampoule", enPlural: "Ampoules" },
  "امبولة": { code: "ampoule", ar: "أمبولة", enSingle: "Ampoule", enPlural: "Ampoules" },
  "ampoule": { code: "ampoule", ar: "أمبول", enSingle: "Ampoule", enPlural: "Ampoules" },
  "ampoules": { code: "ampoule", ar: "أمبول", enSingle: "Ampoule", enPlural: "Ampoules" },
  "حقنة": { code: "injection", ar: "حقنة", enSingle: "Injection", enPlural: "Injections" },
  "injection": { code: "injection", ar: "حقنة", enSingle: "Injection", enPlural: "Injections" },
  "أنبوب": { code: "tube", ar: "أنبوب", enSingle: "Tube", enPlural: "Tubes" },
  "انبوب": { code: "tube", ar: "أنبوب", enSingle: "Tube", enPlural: "Tubes" },
  "مرهم": { code: "ointment", ar: "مرهم", enSingle: "Ointment", enPlural: "Ointments" },
  "tube": { code: "tube", ar: "أنبوب", enSingle: "Tube", enPlural: "Tubes" },
  "tubes": { code: "tube", ar: "أنبوب", enSingle: "Tube", enPlural: "Tubes" },
  "كيس": { code: "sachet", ar: "كيس", enSingle: "Sachet", enPlural: "Sachets" },
  "أكياس": { code: "sachet", ar: "كيس", enSingle: "Sachet", enPlural: "Sachets" },
  "اكياس": { code: "sachet", ar: "كيس", enSingle: "Sachet", enPlural: "Sachets" },
  "sachet": { code: "sachet", ar: "كيس", enSingle: "Sachet", enPlural: "Sachets" },
  "sachets": { code: "sachet", ar: "كيس", enSingle: "Sachet", enPlural: "Sachets" },
  "قطرة": { code: "drop", ar: "قطرة", enSingle: "Drop", enPlural: "Drops" },
  "drop": { code: "drop", ar: "قطرة", enSingle: "Drop", enPlural: "Drops" },
  "drops": { code: "drop", ar: "قطرة", enSingle: "Drop", enPlural: "Drops" },
  "جرعة": { code: "dose", ar: "جرعة", enSingle: "Dose", enPlural: "Doses" },
  "dose": { code: "dose", ar: "جرعة", enSingle: "Dose", enPlural: "Doses" },
  "مل": { code: "ml", ar: "مل", enSingle: "ml", enPlural: "ml" },
  "ml": { code: "ml", ar: "مل", enSingle: "ml", enPlural: "ml" },
};

export function round2(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function round4(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

export function safeJson<T = any>(value: unknown, fallback: T = null as T): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    let parsed = JSON.parse(value);
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    return parsed == null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

export function normalizeSearchText(text?: unknown): string {
  if (text === undefined || text === null) return "";
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMedicineName(rawName?: string | null, isEn: boolean = false): { primary: string; secondary: string } {
  if (!rawName || typeof rawName !== "string") {
    return { primary: "", secondary: "" };
  }
  const clean = rawName.trim();
  if (!clean) return { primary: "", secondary: "" };

  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(clean);
  const hasLatin = /[a-zA-Z]/.test(clean);
  if (!hasArabic || !hasLatin) return { primary: clean, secondary: "" };

  if (clean.endsWith(")")) {
    let depth = 0;
    for (let i = clean.length - 1; i >= 0; i -= 1) {
      if (clean[i] === ")") depth += 1;
      else if (clean[i] === "(") {
        depth -= 1;
        if (depth === 0) {
          const part1 = clean.substring(0, i).trim();
          const part2 = clean.substring(i + 1, clean.length - 1).trim();
          const p1Ar = /[\u0600-\u06FF]/.test(part1);
          const p2Lat = /[a-zA-Z]/.test(part2);
          const p2Ar = /[\u0600-\u06FF]/.test(part2);
          const p1Lat = /[a-zA-Z]/.test(part1);
          if (p1Ar && p2Lat && !p2Ar) return isEn ? { primary: part2, secondary: part1 } : { primary: part1, secondary: part2 };
          if (p1Lat && p2Ar && !p1Ar) return isEn ? { primary: part1, secondary: part2 } : { primary: part2, secondary: part1 };
          break;
        }
      }
    }
  }

  const delimMatch = clean.match(/^(.+?)\s*[-/|]\s*(.+)$/);
  if (delimMatch) {
    const part1 = delimMatch[1].trim();
    const part2 = delimMatch[2].trim();
    const p1Ar = /[\u0600-\u06FF]/.test(part1);
    const p1Lat = /[a-zA-Z]/.test(part1);
    const p2Ar = /[\u0600-\u06FF]/.test(part2);
    const p2Lat = /[a-zA-Z]/.test(part2);
    if (p1Ar && !p1Lat && p2Lat) return isEn ? { primary: part2, secondary: part1 } : { primary: part1, secondary: part2 };
    if (p1Lat && !p1Ar && p2Ar) return isEn ? { primary: part1, secondary: part2 } : { primary: part2, secondary: part1 };
  }

  return { primary: clean, secondary: "" };
}

export function normalizeUserRole(role?: unknown): string {
  const raw = String(role || "").trim().toLowerCase();
  if (!raw) return "staff";
  if (raw === "manager" || raw === "مدير" || raw === "admin") return "manager";
  if (raw === "owner" || raw === "مالك") return "owner";
  if (raw === "branchmanager" || raw === "branch_manager" || raw === "مدير فرع") return "branchManager";
  if (raw === "pharmacist" || raw === "صيدلي") return "pharmacist";
  if (raw === "cashier" || raw === "كاشير") return "cashier";
  if (raw === "accountant" || raw === "محاسب") return "accountant";
  return raw;
}

export function canManageInventory(role?: unknown): boolean {
  return ["manager", "owner", "branchManager"].includes(normalizeUserRole(role));
}

export function canViewCosts(role?: unknown, hideCostsSetting: boolean = false): boolean {
  return !hideCostsSetting && canManageInventory(role);
}

export function canDispenseControlled(user?: { role?: unknown; controlledMedsAccess?: unknown } | null): boolean {
  if (!user) return false;
  if (canManageInventory(user.role)) return true;
  return [true, 1, "1", "true"].includes(user.controlledMedsAccess as any);
}

export function resolveCategoryCode(raw?: unknown): string {
  const target = normalizeSearchText(raw);
  if (!target) return "general_medicines";
  for (const cat of INVENTORY_CATEGORIES) {
    if (cat.code.toLowerCase() === target) return cat.code;
    if (cat.aliases.some((alias) => normalizeSearchText(alias) === target)) return cat.code;
  }
  return "other";
}

export function normalizeCategoryLabel(raw?: unknown, language: string = "ar"): string {
  const code = resolveCategoryCode(raw);
  const matched = INVENTORY_CATEGORIES.find((c) => c.code === code);
  if (!matched || (code === "other" && raw && normalizeSearchText(raw) !== "اخرى" && normalizeSearchText(raw) !== "other")) {
    return String(raw || (language === "en" ? "General Medicines" : "أدوية عامة")).trim();
  }
  return language === "en" ? matched.labelEn : matched.labelAr;
}

export function getCategoryList(language: string = "ar") {
  return INVENTORY_CATEGORIES.map((c) => ({
    code: c.code,
    label: language === "en" ? c.labelEn : c.labelAr,
    labelAr: c.labelAr,
    labelEn: c.labelEn,
  }));
}

export function isMainBranchAlias(value?: unknown): boolean {
  const v = normalizeSearchText(value);
  return v === "main" || v === "الفرع الرئيسي" || v === "فرع رئيسي" || v === "رئيسي" || v === "default";
}

export function isArchivedBranch(branch?: BranchRecord | null): boolean {
  const s = normalizeSearchText(branch && branch.status);
  return s === "مؤرشف" || s === "archived" || s === "deleted";
}

export function getActiveBranches(branches: BranchRecord[] = []): BranchRecord[] {
  return (Array.isArray(branches) ? branches : []).filter((b) => b && !isArchivedBranch(b));
}

export function resolveBranchId(branches: BranchRecord[] = [], targetBranch: unknown = null, fallbackBranchId: string | null = null): string | null {
  const list = getActiveBranches(branches);
  const target = String(targetBranch ?? "").trim();
  if (!target || target === "all" || target === "PENDING") return fallbackBranchId;
  const byId = list.find((b) => String(b.id) === target);
  if (byId) return String(byId.id);
  const targetNorm = normalizeSearchText(target);
  const byName = list.find((b) => normalizeSearchText(b.name) === targetNorm);
  if (byName) return String(byName.id);
  if (isMainBranchAlias(target)) {
    const mainRow = list.find((b) => isMainBranchAlias(b.id) || isMainBranchAlias(b.name));
    if (mainRow) return String(mainRow.id);
    if (list.length > 0) return String(list[0].id);
    return "Main";
  }
  return target;
}

export function resolveBranchName(branches: BranchRecord[] = [], branchId: unknown = null, rawName: string = "", language: string = "ar"): string {
  const list = Array.isArray(branches) ? branches : [];
  const bid = String(branchId ?? "").trim();
  if (!bid) {
    if (rawName) return String(rawName);
    return language === "en" ? "Main Branch" : "الفرع الرئيسي";
  }
  const found = list.find((b) => String(b.id) === bid || normalizeSearchText(b.name) === normalizeSearchText(bid));
  if (found && found.name) return String(found.name);
  if (isMainBranchAlias(bid)) return language === "en" ? "Main Branch" : "الفرع الرئيسي";
  return rawName ? String(rawName) : bid;
}

export function itemMatchesBranchFilter(item: any, branchFilter: unknown, branches: BranchRecord[] = []): boolean {
  if (!item) return false;
  const f = String(branchFilter || "all").trim();
  if (!f || f === "all" || f === "الكل") return true;

  const list = getActiveBranches(branches);
  const targetBranch = list.find((b) => String(b.id) === f || normalizeSearchText(b.name) === normalizeSearchText(f));
  const targetId = targetBranch ? String(targetBranch.id) : f;
  const targetNameNorm = normalizeSearchText(targetBranch ? targetBranch.name : f);

  const itemBid = String(item.branch_id ?? item.branchId ?? "").trim();
  const itemBnameNorm = normalizeSearchText(item.branchName ?? item.branch_name ?? item.branch ?? "");

  if (itemBid) {
    if (itemBid === targetId) return true;
    if (isMainBranchAlias(itemBid) && isMainBranchAlias(targetId)) return true;
    return Boolean(targetNameNorm) && normalizeSearchText(itemBid) === targetNameNorm;
  }
  if (itemBnameNorm) {
    if (itemBnameNorm === targetNameNorm) return true;
    if (isMainBranchAlias(itemBnameNorm) && (isMainBranchAlias(targetId) || isMainBranchAlias(targetNameNorm))) return true;
    return false;
  }
  return isMainBranchAlias(targetId) || isMainBranchAlias(targetNameNorm) || (list.length > 0 && String(list[0].id) === targetId);
}

function daysInMonthUtc(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function normalizeExpiryIso(raw?: unknown): string {
  if (raw === undefined || raw === null) return "";
  const str = String(raw).trim();
  if (!str) return "";

  const isoPrefixMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (isoPrefixMatch) {
    const y = parseInt(isoPrefixMatch[1], 10);
    const m = parseInt(isoPrefixMatch[2], 10);
    const dRaw = parseInt(isoPrefixMatch[3], 10);
    if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && dRaw >= 1 && dRaw <= 31) {
      const clampedDay = Math.min(dRaw, daysInMonthUtc(y, m));
      return `${y}-${pad2(m)}-${pad2(clampedDay)}`;
    }
    return "";
  }

  const clean = str.replace(/[\/.\s]/g, "-");
  const parts = clean.split("-").filter(Boolean);

  if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    let year: number;
    let month: number;
    if (p0 > 1000) {
      year = p0;
      month = p1;
    } else if (p1 > 1000) {
      month = p0;
      year = p1;
    } else if (p1 > 12) {
      month = p0;
      year = p1 < 100 ? 2000 + p1 : p1;
    } else if (p0 > 12) {
      year = p0 < 100 ? 2000 + p0 : p0;
      month = p1;
    } else {
      month = p0;
      year = 2000 + p1;
    }
    if (year >= 1900 && year <= 2200 && month >= 1 && month <= 12) {
      return `${year}-${pad2(month)}-${pad2(daysInMonthUtc(year, month))}`;
    }
    return "";
  }

  if (parts.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1]) && /^\d+$/.test(parts[2])) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    let y: number;
    let m: number;
    let d: number;
    if (p0 > 1000) {
      y = p0;
      m = p1;
      d = p2;
    } else if (p2 > 1000) {
      d = p0;
      m = p1;
      y = p2;
    } else {
      d = p0;
      m = p1;
      y = 2000 + p2;
    }
    if (y >= 1900 && y <= 2200 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const clampedDay = Math.min(d, daysInMonthUtc(y, m));
      return `${y}-${pad2(m)}-${pad2(clampedDay)}`;
    }
    return "";
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = parsed.getUTCMonth() + 1;
    const d = parsed.getUTCDate();
    if (y >= 1900 && y <= 2200) return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  return "";
}

export function toMonthPickerValue(raw?: unknown): string {
  const iso = normalizeExpiryIso(raw);
  return iso ? iso.slice(0, 7) : "";
}

export function parseExpiryDate(raw?: unknown): Date | null {
  const iso = normalizeExpiryIso(raw);
  if (!iso) return null;
  const parts = iso.split("-");
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function getExpiryStatus(expiryRaw?: unknown, nowInput: Date | string | number | null = null) {
  const iso = normalizeExpiryIso(expiryRaw);
  const date = parseExpiryDate(iso);
  if (!date) {
    return {
      iso: "",
      monthValue: "",
      date: null as Date | null,
      daysLeft: null as number | null,
      isExpired: false,
      isCritical: false,
      isExpiringSoon: false,
      status: "none" as "none" | "ok" | "warning" | "critical" | "expired",
    };
  }
  const nowDate = nowInput ? (nowInput instanceof Date ? nowInput : new Date(nowInput)) : new Date();
  const nowDayMs = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), 0, 0, 0, 0);
  const expDayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
  const daysLeft = Math.round((expDayMs - nowDayMs) / 86400000);
  const isExpired = daysLeft < 0;
  const isCritical = !isExpired && daysLeft <= EXPIRY_CRITICAL_DAYS;
  const isExpiringSoon = !isExpired && daysLeft <= EXPIRY_WARNING_DAYS;
  let status: "none" | "ok" | "warning" | "critical" | "expired" = "ok";
  if (isExpired) status = "expired";
  else if (isCritical) status = "critical";
  else if (isExpiringSoon) status = "warning";
  return {
    iso,
    monthValue: iso.slice(0, 7),
    date,
    daysLeft,
    isExpired,
    isCritical,
    isExpiringSoon,
    status,
  };
}

export function cleanBatchName(name?: unknown): string {
  if (!name) return "";
  return String(name)
    .replace(/\s*\(القديم\)\s*/g, "")
    .replace(/\s*\(الجديد\)\s*/g, "")
    .replace(/\s*\(old\)\s*/gi, "")
    .replace(/\s*\(new\)\s*/gi, "")
    .trim();
}

export function getLocalizedUnit(rawUnitName?: unknown, count: number = 1, language: string = "ar"): string {
  const isEn = language === "en";
  if (!rawUnitName) return isEn ? (count === 1 ? "Box" : "Boxes") : "علبة";
  const key = String(rawUnitName).trim().toLowerCase();
  const matched = UNIT_DICTIONARY[key];
  if (matched) {
    if (isEn) return count === 1 ? matched.enSingle : matched.enPlural;
    return matched.ar;
  }
  return String(rawUnitName).trim();
}

export function parseUnitsArray(unitsRaw?: unknown): UnitTier[] {
  const parsed = safeJson(unitsRaw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((u: any) => u && typeof u === "object")
    .map((u: any, idx: number) => ({
      name: String(u.name || (idx === 0 ? "علبة" : idx === 1 ? "شريط" : "حبة")).trim(),
      count: Math.max(1, Number(u.count) || 1),
      price: round2(u.price),
      barcode: String(u.barcode || "").trim(),
    }));
}

export function buildUnitsArray(input: Record<string, any> = {}): UnitTier[] {
  const boxName = String(input.boxName || "علبة").trim() || "علبة";
  const boxPrice = round2(input.boxPrice ?? input.price);
  const boxBarcode = String(input.boxBarcode || "").trim();

  const hasSub1 = Boolean(input.hasSub1) && (Number(input.sub1PerBox) || 0) > 1;
  if (!hasSub1) {
    return [{ name: boxName, count: 1, price: boxPrice, ...(boxBarcode ? { barcode: boxBarcode } : {}) }];
  }

  const s1Count = Math.max(2, Math.floor(Number(input.sub1PerBox) || 2));
  const s1Name = String(input.sub1Name || "شريط").trim() || "شريط";
  const s1Barcode = String(input.sub1Barcode || "").trim();
  const hasSub2 = Boolean(input.hasSub2) && (Number(input.sub2PerSub1) || 0) > 1;

  if (!hasSub2) {
    const s1Price = input.sub1Price !== undefined && input.sub1Price !== ""
      ? round2(input.sub1Price)
      : round2(boxPrice / s1Count);
    return [
      { name: boxName, count: s1Count, price: boxPrice, ...(boxBarcode ? { barcode: boxBarcode } : {}) },
      { name: s1Name, count: 1, price: s1Price, ...(s1Barcode ? { barcode: s1Barcode } : {}) },
    ];
  }

  const s2Count = Math.max(2, Math.floor(Number(input.sub2PerSub1) || 2));
  const s2Name = String(input.sub2Name || "حبة").trim() || "حبة";
  const s2Barcode = String(input.sub2Barcode || "").trim();
  const totalBaseInBox = s1Count * s2Count;
  const s1Price = input.sub1Price !== undefined && input.sub1Price !== ""
    ? round2(input.sub1Price)
    : round2(boxPrice / s1Count);
  const s2Price = input.sub2Price !== undefined && input.sub2Price !== ""
    ? round2(input.sub2Price)
    : round2(s1Price / s2Count);

  return [
    { name: boxName, count: totalBaseInBox, price: boxPrice, ...(boxBarcode ? { barcode: boxBarcode } : {}) },
    { name: s1Name, count: s2Count, price: s1Price, ...(s1Barcode ? { barcode: s1Barcode } : {}) },
    { name: s2Name, count: 1, price: s2Price, ...(s2Barcode ? { barcode: s2Barcode } : {}) },
  ];
}

export function extractBoxMultiplier(unitsRaw?: unknown): number {
  const units = parseUnitsArray(unitsRaw);
  if (units.length > 0 && Number(units[0].count) > 1) return Number(units[0].count);
  return 1;
}

export function decomposeBaseQty(baseQty: number, unitsRaw?: unknown) {
  const num = Number(baseQty) || 0;
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  const units = parseUnitsArray(unitsRaw);

  if (units.length <= 1) {
    return {
      baseQty: round2(num),
      absBaseQty: round2(abs),
      sign,
      levelsCount: 1,
      boxMultiplier: 1,
      stripMultiplier: 1,
      boxes: round2(abs),
      strips: 0,
      pills: 0,
    };
  }

  const boxMultiplier = Math.max(1, Number(units[0].count) || 1);
  const boxes = Math.floor(abs / boxMultiplier);
  const remAfterBoxes = round4(abs - boxes * boxMultiplier);

  if (units.length === 2) {
    return {
      baseQty: round2(num),
      absBaseQty: round2(abs),
      sign,
      levelsCount: 2,
      boxMultiplier,
      stripMultiplier: 1,
      boxes,
      strips: 0,
      pills: round2(remAfterBoxes),
    };
  }

  const stripMultiplier = Math.max(1, Number(units[1].count) || 1);
  const strips = Math.floor(remAfterBoxes / stripMultiplier);
  const pills = round2(remAfterBoxes - strips * stripMultiplier);

  return {
    baseQty: round2(num),
    absBaseQty: round2(abs),
    sign,
    levelsCount: 3,
    boxMultiplier,
    stripMultiplier,
    boxes,
    strips,
    pills,
  };
}

export function composeBaseQty(parts: Record<string, any> = {}, unitsRaw: unknown = null): number {
  const units = parseUnitsArray(unitsRaw);
  const boxCount = parts.boxCount ? Number(parts.boxCount) : extractBoxMultiplier(units);
  const stripCount = parts.stripCount ? Number(parts.stripCount) : (units.length >= 3 ? Math.max(1, Number(units[1].count) || 1) : 1);
  const boxes = Math.max(0, Number(parts.boxes) || 0);
  const strips = Math.max(0, Number(parts.strips) || 0);
  const pills = Math.max(0, Number(parts.pills) || 0);
  const loose = Math.max(0, Number(parts.looseBaseQty) || 0);
  return round2(boxes * boxCount + strips * stripCount + pills + loose);
}

export function formatQtyWithUnits(qtyOrItem: any, unitsArg: unknown = null, language: string = "ar", opts: { zeroLabel?: string } = {}): string {
  const isEn = language === "en";
  const isItemObj = qtyOrItem && typeof qtyOrItem === "object";
  const rawQty = isItemObj ? qtyOrItem.qty : qtyOrItem;
  const unitsRaw = unitsArg !== null && unitsArg !== undefined ? unitsArg : (isItemObj ? qtyOrItem.units : null);
  const q = Number(rawQty) || 0;

  if (q === 0) {
    return opts.zeroLabel || (isEn ? "Out of Stock" : "نفد المخزون");
  }

  const units = parseUnitsArray(unitsRaw);
  const decomp = decomposeBaseQty(q, units);
  const connector = isEn ? " and " : " و ";
  const prefix = decomp.sign < 0 ? "-" : "";

  if (decomp.levelsCount === 3) {
    const parts: string[] = [];
    if (decomp.boxes > 0) parts.push(`${decomp.boxes} ${getLocalizedUnit(units[0].name, decomp.boxes, language)}`);
    if (decomp.strips > 0) parts.push(`${decomp.strips} ${getLocalizedUnit(units[1].name, decomp.strips, language)}`);
    if (decomp.pills > 0) parts.push(`${decomp.pills} ${getLocalizedUnit(units[2].name, decomp.pills, language)}`);
    return prefix + (parts.length ? parts.join(connector) : `0 ${getLocalizedUnit(units[0].name, 0, language)}`);
  }

  if (decomp.levelsCount === 2) {
    const parts: string[] = [];
    if (decomp.boxes > 0) parts.push(`${decomp.boxes} ${getLocalizedUnit(units[0].name, decomp.boxes, language)}`);
    if (decomp.pills > 0) parts.push(`${decomp.pills} ${getLocalizedUnit(units[1].name, decomp.pills, language)}`);
    return prefix + (parts.length ? parts.join(connector) : `0 ${getLocalizedUnit(units[0].name, 0, language)}`);
  }

  const singleUnitName = units[0] ? units[0].name : (isItemObj ? qtyOrItem.unit : "علبة");
  return `${prefix}${round2(Math.abs(q))} ${getLocalizedUnit(singleUnitName, Math.abs(q), language)}`;
}

export function findUnitByBarcode(item: any, scannedBarcode: unknown) {
  if (!item || !scannedBarcode) return null;
  const needle = String(scannedBarcode).trim();
  if (!needle) return null;

  const units = parseUnitsArray(item.units);
  if (String(item.barcode || "").trim() === needle) {
    const boxUnit = units[0] || { name: "علبة", count: 1, price: round2(item.price) };
    return {
      matched: true,
      unitIndex: 0,
      unitName: boxUnit.name,
      unitCount: Math.max(1, Number(boxUnit.count) || 1),
      price: round2(boxUnit.price || item.price),
    };
  }

  for (let i = 0; i < units.length; i += 1) {
    if (units[i].barcode && units[i].barcode === needle) {
      return {
        matched: true,
        unitIndex: i,
        unitName: units[i].name,
        unitCount: Math.max(1, Number(units[i].count) || 1),
        price: round2(units[i].price),
      };
    }
  }
  return null;
}

export function batchAvailableQty(b: any): number {
  if (!b || typeof b !== "object") return 0;
  return round2(b.remaining !== undefined && b.remaining !== null ? b.remaining : b.qty);
}

export function normalizeBatchRecord(batch: any, fallbackMeta: Record<string, any> = {}, index: number = 0): BatchRecord {
  const b = batch && typeof batch === "object" ? batch : {};
  const expiry = normalizeExpiryIso(b.expiry || b.expiry_date || fallbackMeta.expiry || "");
  const available = b.remaining !== undefined && b.remaining !== null ? round2(b.remaining) : round2(b.qty);
  const originalQty = b.qty !== undefined && b.qty !== null ? round2(b.qty) : available;
  return {
    id: String(b.id || `BATCH-${index + 1}`),
    qty: available,
    originalQty,
    remaining: available,
    cost: round2(b.cost ?? b.purchase_price ?? fallbackMeta.cost),
    ...(Number(b.costUnitSize) > 0 ? { costUnitSize: Number(b.costUnitSize) } : {}),
    price: round2(b.price ?? fallbackMeta.price),
    expiry,
    batch_number: String(b.batch_number || b.batchNumber || fallbackMeta.batch_number || "").trim(),
    purchaseId: b.purchaseId ? String(b.purchaseId) : "",
    ...(b.receiptEventId ? { receiptEventId: String(b.receiptEventId) } : {}),
    ...(b.receiptLine !== undefined && b.receiptLine !== null ? { receiptLine: b.receiptLine } : {}),
    ...(b.reason ? { reason: String(b.reason) } : {}),
    createdAt: String(b.createdAt || b.date_added || b.date || fallbackMeta.createdAt || ""),
  };
}

export function parseBatchesArray(rawBatches: unknown, fallbackItem: Record<string, any> | null = null): BatchRecord[] {
  const parsed = safeJson(rawBatches, []);
  const meta = fallbackItem && typeof fallbackItem === "object" ? fallbackItem : {};
  let list: BatchRecord[] = Array.isArray(parsed)
    ? parsed
        .filter((b: any) => b && typeof b === "object")
        .map((b: any, idx: number) => normalizeBatchRecord(b, meta, idx))
        .filter((b: BatchRecord) => batchAvailableQty(b) > 0)
    : [];

  if (meta && Number(meta.pending_qty) > 0 && !list.some((b) => String(b.id).startsWith("LEGACY-PENDING-"))) {
    const pendingPrice = Number(meta.pending_price) || Number(meta.price) || 0;
    const pendingCost = Number(meta.pending_cost) || Number(meta.cost) || 0;
    const pendingExpiry = normalizeExpiryIso(meta.pending_expiry || meta.expiry || "");
    const pendingTotal = list.reduce((s, b) => s + batchAvailableQty(b), 0);
    const totalQty = Number(meta.qty) || 0;
    if (totalQty > pendingTotal) {
      list.push(
        normalizeBatchRecord(
          {
            id: `LEGACY-PENDING-${meta.id || "1"}`,
            qty: Math.min(Number(meta.pending_qty), totalQty - pendingTotal),
            cost: pendingCost,
            price: pendingPrice,
            expiry: pendingExpiry,
            batch_number: meta.batch_number || "",
          },
          meta,
          list.length
        )
      );
    }
  }

  if (list.length === 0 && meta && Number(meta.qty) > 0) {
    list = [
      normalizeBatchRecord(
        {
          id: `BATCH-${meta.id || "INIT"}-1`,
          qty: Number(meta.qty),
          cost: Number(meta.cost) || 0,
          price: Number(meta.price) || 0,
          expiry: meta.expiry || "",
          batch_number: meta.batch_number || "",
        },
        meta,
        0
      ),
    ];
  }
  return list;
}

export function sortBatchesFefo(batches: BatchRecord[] = []): BatchRecord[] {
  return (Array.isArray(batches) ? batches : [])
    .map((b, idx) => ({ ...normalizeBatchRecord(b, {}, idx), _idx: idx }))
    .filter((b) => batchAvailableQty(b) > 0)
    .sort((a, b) => {
      const aExp = normalizeExpiryIso(a.expiry);
      const bExp = normalizeExpiryIso(b.expiry);
      if (aExp && bExp && aExp !== bExp) return aExp < bExp ? -1 : 1;
      if (aExp && !bExp) return -1;
      if (!aExp && bExp) return 1;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
      return a._idx - b._idx;
    })
    .map(({ _idx, ...rest }) => rest);
}

export function deductBatchesFefo(
  batches: BatchRecord[],
  physicalQtyToDeduct: number,
  fallbackCost: number = 0,
  fallbackPrice: number = 0,
  boxMultiplier: number = 1
) {
  const ordered = sortBatchesFefo(batches);
  const reqQty = Math.max(0, Number(physicalQtyToDeduct) || 0);
  const mult = Math.max(1, Number(boxMultiplier) || 1);
  if (reqQty <= 0) {
    return {
      nextBatches: ordered,
      deductedQty: 0,
      shortfallQty: 0,
      totalCost: 0,
      weightedUnitCost: round2(fallbackCost),
      costLayers: [] as Array<{ batchId: string; batch_number: string; expiry: string; qty: number; unitCost: number; unitPrice: number; costValue: number }>,
      depleted: ordered.length === 0,
    };
  }

  let rem = reqQty;
  let totalCostBase = 0;
  let deductedQty = 0;
  const costLayers: Array<{ batchId: string; batch_number: string; expiry: string; qty: number; unitCost: number; unitPrice: number; costValue: number }> = [];
  const nextBatches: BatchRecord[] = [];

  for (const batch of ordered) {
    const bQty = batchAvailableQty(batch);
    if (rem <= 0) {
      nextBatches.push(batch);
      continue;
    }
    const take = Math.min(bQty, rem);
    rem = round4(rem - take);
    deductedQty = round4(deductedQty + take);
    const layerBoxCost = Number(batch.cost ?? fallbackCost) || 0;
    const layerUnitSize = Number(batch.costUnitSize) > 0 ? Number(batch.costUnitSize) : mult;
    const layerBoxPrice = Number(batch.price ?? fallbackPrice) || 0;
    const layerCostValue = round2((take / layerUnitSize) * layerBoxCost);
    totalCostBase = round2(totalCostBase + layerCostValue);
    costLayers.push({
      batchId: batch.id,
      batch_number: batch.batch_number || "",
      expiry: batch.expiry || "",
      qty: round2(take),
      unitCost: round2(layerBoxCost),
      unitPrice: round2(layerBoxPrice),
      costValue: layerCostValue,
    });
    const left = round2(bQty - take);
    if (left > 0) {
      nextBatches.push({ ...batch, qty: left, remaining: left });
    }
  }

  const shortfallQty = rem > 0 ? round2(rem) : 0;
  if (shortfallQty > 0) {
    totalCostBase = round2(totalCostBase + (shortfallQty / mult) * (Number(fallbackCost) || 0));
  }
  const weightedUnitCost = reqQty > 0 ? round2((totalCostBase / reqQty) * mult) : round2(fallbackCost);

  return {
    nextBatches,
    deductedQty: round2(deductedQty),
    shortfallQty,
    totalCost: round2(totalCostBase),
    weightedUnitCost,
    costLayers,
    depleted: nextBatches.length === 0,
  };
}

export function addOrMergeBatch(batches: BatchRecord[] = [], incomingBatch: Record<string, any> = {}, fallbackMeta: Record<string, any> = {}): BatchRecord[] {
  const list = sortBatchesFefo(batches);
  const norm = normalizeBatchRecord(incomingBatch, fallbackMeta, list.length);
  const normQty = batchAvailableQty(norm);
  if (normQty <= 0) return list;

  const existingIdx = list.findIndex(
    (b) =>
      normalizeExpiryIso(b.expiry) === normalizeExpiryIso(norm.expiry) &&
      String(b.batch_number || "") === String(norm.batch_number || "") &&
      String(b.purchaseId || "") === String(norm.purchaseId || "") &&
      round2(b.cost) === round2(norm.cost) &&
      round2(b.price) === round2(norm.price)
  );

  if (existingIdx >= 0) {
    const merged = list.map((b, idx) => {
      if (idx !== existingIdx) return b;
      const nextVal = round2(batchAvailableQty(b) + normQty);
      return { ...b, qty: nextVal, remaining: nextVal };
    });
    return sortBatchesFefo(merged);
  }
  return sortBatchesFefo([...list, norm]);
}

export function syncBatchesDelta(batches: BatchRecord[] = [], deltaBaseQty: number = 0, meta: Record<string, any> = {}): BatchRecord[] {
  const delta = round2(deltaBaseQty);
  if (delta === 0) return sortBatchesFefo(batches);
  if (delta > 0) {
    return addOrMergeBatch(
      batches,
      {
        id: meta.batchId || `BATCH-${Date.now().toString(36)}`,
        qty: delta,
        cost: meta.cost,
        price: meta.price,
        expiry: meta.expiry,
        batch_number: meta.batch_number,
        createdAt: meta.createdAt || new Date().toISOString(),
      },
      meta
    );
  }
  const { nextBatches } = deductBatchesFefo(batches, Math.abs(delta), meta.cost || 0, meta.price || 0, meta.boxMultiplier || 1);
  return nextBatches;
}

export function computeStockStatus(item: any, opts: { now?: Date | string | number } = {}) {
  const now = opts.now || new Date();
  const safeItem = item && typeof item === "object" ? item : {};
  const isArchived = Boolean(safeItem.archived_at);
  const baseQty = round2(safeItem.qty);
  const boxMultiplier = extractBoxMultiplier(safeItem.units);
  const rawMinQty = safeItem.minQty;
  const minQtyBoxes = rawMinQty !== undefined && rawMinQty !== null && rawMinQty !== "" && Number.isFinite(Number(rawMinQty))
    ? Math.max(0, Number(rawMinQty))
    : DEFAULT_MIN_QTY_BOXES;
  const minQtyBase = round2(minQtyBoxes * boxMultiplier);
  const isOutOfStock = baseQty <= 0;
  const isLowStock = !isArchived && !isOutOfStock && baseQty <= minQtyBase;
  const boxesRemaining = boxMultiplier > 0 ? round2(baseQty / boxMultiplier) : baseQty;
  const suggestedOrderBoxes = isArchived || baseQty > minQtyBase ? 0 : Math.max(1, Math.ceil(minQtyBoxes - boxesRemaining));

  const batches = sortBatchesFefo(parseBatchesArray(safeItem.batches, safeItem));
  const firstWithExpiry = batches.find((b) => b.qty > 0 && normalizeExpiryIso(b.expiry));
  const nearestExpiry = firstWithExpiry ? firstWithExpiry.expiry : normalizeExpiryIso(safeItem.expiry || "");
  const expiryStatus = getExpiryStatus(nearestExpiry, now);

  let costValue = 0;
  let retailValue = 0;
  if (batches.length > 0 && baseQty > 0) {
    for (const b of batches) {
      const bBoxes = (Number(b.qty) || 0) / boxMultiplier;
      costValue += bBoxes * (Number(b.cost ?? safeItem.cost) || 0);
      retailValue += bBoxes * (Number(b.price ?? safeItem.price) || 0);
    }
  } else if (baseQty > 0) {
    costValue = (baseQty / boxMultiplier) * (Number(safeItem.cost) || 0);
    retailValue = (baseQty / boxMultiplier) * (Number(safeItem.price) || 0);
  }

  let isStagnant = false;
  if (!isArchived && baseQty > 0 && safeItem.lastSaleDate) {
    const lastMs = new Date(safeItem.lastSaleDate).getTime();
    const nowMs = (now instanceof Date ? now : new Date(now)).getTime();
    if (Number.isFinite(lastMs) && Number.isFinite(nowMs)) {
      isStagnant = (nowMs - lastMs) / 86400000 >= STAGNANT_DAYS_THRESHOLD;
    }
  }

  return {
    isArchived,
    baseQty,
    boxMultiplier,
    boxesRemaining,
    minQtyBoxes,
    minQtyBase,
    isOutOfStock,
    isLowStock,
    suggestedOrderBoxes,
    nearestExpiry,
    expiryStatus,
    costValue: round2(costValue),
    retailValue: round2(retailValue),
    batchCount: batches.length,
    isStagnant,
  };
}

export function computeInventoryKpis(items: any[] = [], opts: { now?: Date | string | number } = {}) {
  const now = opts.now || new Date();
  let totalSkus = 0;
  let archivedCount = 0;
  let activeUnitsTotal = 0;
  let totalBoxesTotal = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiringCriticalCount = 0;
  let expiringWarningCount = 0;
  let expiredCount = 0;
  let controlledCount = 0;
  let stagnantCount = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (!item) continue;
    const st = computeStockStatus(item, { now });
    if (st.isArchived) {
      archivedCount += 1;
      continue;
    }
    totalSkus += 1;
    if (st.baseQty > 0) {
      activeUnitsTotal = round2(activeUnitsTotal + st.baseQty);
      totalBoxesTotal = round2(totalBoxesTotal + st.boxesRemaining);
    }
    if (st.isOutOfStock) outOfStockCount += 1;
    if (st.isLowStock) lowStockCount += 1;
    if (!st.isOutOfStock && st.expiryStatus.isExpired) expiredCount += 1;
    if (!st.isOutOfStock && st.expiryStatus.isCritical) expiringCriticalCount += 1;
    if (!st.isOutOfStock && st.expiryStatus.isExpiringSoon) expiringWarningCount += 1;
    if ([true, 1, "1"].includes(item.isControlled)) controlledCount += 1;
    if (st.isStagnant) stagnantCount += 1;
    totalCostValue = round2(totalCostValue + st.costValue);
    totalRetailValue = round2(totalRetailValue + st.retailValue);
  }

  return {
    totalSkus,
    archivedCount,
    activeUnitsTotal,
    totalBoxesTotal,
    lowStockCount,
    outOfStockCount,
    expiringCriticalCount,
    expiringWarningCount,
    expiredCount,
    controlledCount,
    stagnantCount,
    totalCostValue,
    totalRetailValue,
    potentialProfit: round2(totalRetailValue - totalCostValue),
  };
}

export function validateInventoryInput(payload: Record<string, any> = {}) {
  const name = String(payload.name || "").trim();
  if (!name) return { ok: false as const, code: "NAME_REQUIRED", message: "اسم الصنف مطلوب" };
  const price = Number(payload.price ?? payload.price_sell ?? 0);
  const cost = Number(payload.cost ?? payload.price_buy ?? 0);
  const qty = Number(payload.qty ?? 0);
  const minQty = payload.minQty !== undefined && payload.minQty !== null && payload.minQty !== ""
    ? Number(payload.minQty)
    : (payload.reorder_level !== undefined && payload.reorder_level !== null && payload.reorder_level !== "" ? Number(payload.reorder_level) : DEFAULT_MIN_QTY_BOXES);
  if (!Number.isFinite(price) || price < 0) return { ok: false as const, code: "INVALID_PRICE", message: "سعر البيع غير صالح" };
  if (!Number.isFinite(cost) || cost < 0) return { ok: false as const, code: "INVALID_COST", message: "سعر التكلفة غير صالح" };
  if (!Number.isFinite(qty) || qty < 0) return { ok: false as const, code: "INVALID_QTY", message: "الكمية غير صالحة" };
  if (!Number.isFinite(minQty) || minQty < 0) return { ok: false as const, code: "INVALID_MIN_QTY", message: "الحد الأدنى غير صالح" };
  return {
    ok: true as const,
    normalized: {
      name,
      scientificName: String(payload.scientificName || payload.scientific_name || "").trim(),
      barcode: String(payload.barcode || "").trim(),
      category: String(payload.category || "أدوية عامة").trim(),
      manufacturer: String(payload.manufacturer || "").trim(),
      price: round2(price),
      cost: round2(cost),
      qty: round2(qty),
      minQty: round2(minQty),
      expiry: normalizeExpiryIso(payload.expiry ?? payload.expiry_date ?? ""),
      batch_number: String(payload.batch_number || payload.batchNumber || "").trim(),
      isControlled: [true, 1, "1", "true"].includes(payload.isControlled) ? 1 : 0,
      units: parseUnitsArray(payload.units),
    },
  };
}

export function validateAdjustmentInput(payload: Record<string, any> = {}) {
  const drugId = String(payload.drug_id || payload.drugId || payload.id || "").trim();
  const qty = Number(payload.qty || 0);
  if (!drugId) return { ok: false as const, code: "ITEM_REQUIRED", message: "يجب اختيار الصنف" };
  if (!Number.isFinite(qty) || qty <= 0) return { ok: false as const, code: "INVALID_QTY", message: "كمية التلف يجب أن تكون أكبر من صفر" };
  return {
    ok: true as const,
    drugId,
    qty: round2(qty),
    reason: String(payload.reason || "damaged").trim(),
    notes: String(payload.notes || "").trim(),
  };
}

export function validateStockTakeInput(payload: Record<string, any> = {}) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) return { ok: false as const, code: "ITEMS_REQUIRED", message: "لا توجد أصناف للجرد" };
  for (const row of items) {
    const actual = Number(row?.actual ?? row?.actualBaseQty ?? 0);
    if (!row?.id || !Number.isFinite(actual) || actual < 0) {
      return { ok: false as const, code: "INVALID_STOCK_TAKE_ROW", message: "بيانات الجرد غير صالحة" };
    }
  }
  return { ok: true as const, items };
}

export function buildCanonicalInventoryCommand({ eventId, action, targetId = null, payload = {}, createdAt = null }: {
  eventId?: string;
  action: string;
  targetId?: string | null;
  payload?: Record<string, any>;
  createdAt?: string | null;
}) {
  return {
    eventId: String(eventId || `EVT-INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`),
    action: String(action || "").trim().toUpperCase(),
    targetId: targetId ? String(targetId) : (payload?.id ? String(payload.id) : null),
    payload: payload && typeof payload === "object" ? { ...payload } : {},
    createdAt: createdAt || new Date().toISOString(),
  };
}

function makeMovementRecord(
  id: string,
  item: Record<string, any>,
  type: string,
  qtyBefore: number,
  qtyAfter: number,
  unitCost: number,
  meta: Record<string, any> = {},
  createdAt: string = ""
): StockMovementRecord {
  const delta = round2((Number(qtyAfter) || 0) - (Number(qtyBefore) || 0));
  return {
    id,
    drug_id: String(item.id || ""),
    drug_name: String(item.name || ""),
    type,
    qty_before: round2(qtyBefore),
    qty_after: round2(qtyAfter),
    delta,
    unit_cost: round2(unitCost),
    batch_id: String(meta.batchId || ""),
    batch_number: String(meta.batch_number || item.batch_number || ""),
    reference_id: String(meta.referenceId || ""),
    event_id: String(meta.eventId || ""),
    actor_name: String(meta.actorName || ""),
    notes: String(meta.notes || ""),
    branch_id: item.branch_id ?? null,
    created_at: createdAt || new Date().toISOString(),
  };
}

export function applyInventoryCommandOptimistically(snapshot: Record<string, any> = {}, command: Record<string, any> = {}) {
  const invList = Array.isArray(snapshot.inventory) ? snapshot.inventory.map((i: any) => ({ ...i })) : [];
  const adjustments = Array.isArray(snapshot.stockAdjustments) ? snapshot.stockAdjustments.map((a: any) => ({ ...a })) : [];
  const movements = Array.isArray(snapshot.stockMovements) ? snapshot.stockMovements.map((m: any) => ({ ...m })) : [];
  const expenses = Array.isArray(snapshot.expenses) ? snapshot.expenses.map((e: any) => ({ ...e })) : [];

  const action = String(command.action || "").toUpperCase();
  const p = command.payload && typeof command.payload === "object" ? command.payload : {};
  const ts = command.createdAt || new Date().toISOString();
  const evId = command.eventId || `EVT-${Date.now()}`;
  const targetId = command.targetId || p.id || p.drug_id || p.drugId;

  if (action === "ADD_INVENTORY") {
    const newId = String(p.id || targetId || `MED-${Date.now()}`);
    const existingIdx = invList.findIndex((i: any) => String(i.id) === newId);
    const qty = round2(p.qty);
    const cost = round2(p.cost ?? p.price_buy);
    const price = round2(p.price ?? p.price_sell);
    const expiry = normalizeExpiryIso(p.expiry ?? p.expiry_date ?? "");
    const units = parseUnitsArray(p.units);
    const batches = qty > 0
      ? [normalizeBatchRecord({ id: `BATCH-${newId}-1`, qty, cost, price, expiry, batch_number: p.batch_number || "", createdAt: ts }, p, 0)]
      : [];
    const nextItem = {
      id: newId,
      barcode: String(p.barcode || "").trim(),
      name: String(p.name || "").trim(),
      scientificName: String(p.scientificName || "").trim(),
      category: String(p.category || "أدوية عامة").trim(),
      manufacturer: String(p.manufacturer || "").trim(),
      price,
      cost,
      qty,
      minQty: p.minQty !== undefined && p.minQty !== "" ? round2(p.minQty) : DEFAULT_MIN_QTY_BOXES,
      expiry,
      isControlled: [true, 1, "1", "true"].includes(p.isControlled) ? 1 : 0,
      units: units.length ? JSON.stringify(units) : null,
      batch_number: String(p.batch_number || "").trim(),
      branch_id: p.branch_id ?? null,
      batches: JSON.stringify(batches),
      archived_at: null,
    };
    if (existingIdx >= 0) invList[existingIdx] = nextItem;
    else invList.unshift(nextItem);
    if (qty > 0 && !movements.some((m: any) => m.event_id === evId && m.drug_id === newId)) {
      movements.unshift(makeMovementRecord(`SM-${evId}`, nextItem, "opening_balance", 0, qty, cost, { eventId: evId, batchId: batches[0].id, actorName: p.actorName }, ts));
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "UPDATE_INVENTORY" || action === "UPDATE_INVENTORY_DETAILS") {
    const idx = invList.findIndex((i: any) => String(i.id) === String(targetId));
    if (idx < 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
    const cur = invList[idx];
    const oldQty = round2(cur.qty);
    const nextQty = p.qty !== undefined ? round2(p.qty) : oldQty;
    const nextCost = p.cost !== undefined || p.price_buy !== undefined ? round2(p.cost ?? p.price_buy) : round2(cur.cost);
    const nextPrice = p.price !== undefined || p.price_sell !== undefined ? round2(p.price ?? p.price_sell) : round2(cur.price);
    const nextExpiry = p.expiry !== undefined || p.expiry_date !== undefined ? normalizeExpiryIso(p.expiry ?? p.expiry_date) : normalizeExpiryIso(cur.expiry);
    const units = p.units !== undefined ? parseUnitsArray(p.units) : parseUnitsArray(cur.units);
    const curBatches = parseBatchesArray(cur.batches, cur);
    const delta = round2(nextQty - oldQty);
    const nextBatches = delta !== 0
      ? syncBatchesDelta(curBatches, delta, { cost: nextCost, price: nextPrice, expiry: nextExpiry, batch_number: p.batch_number ?? cur.batch_number, boxMultiplier: extractBoxMultiplier(units), createdAt: ts })
      : curBatches.map((b, bi) => (bi === 0 ? { ...b, cost: nextCost, price: nextPrice, expiry: nextExpiry || b.expiry, batch_number: p.batch_number ?? b.batch_number } : b));

    const updated = {
      ...cur,
      ...(p.name !== undefined ? { name: String(p.name).trim() } : {}),
      ...(p.scientificName !== undefined ? { scientificName: String(p.scientificName).trim() } : {}),
      ...(p.barcode !== undefined ? { barcode: String(p.barcode).trim() } : {}),
      ...(p.category !== undefined ? { category: String(p.category).trim() } : {}),
      ...(p.manufacturer !== undefined ? { manufacturer: String(p.manufacturer).trim() } : {}),
      ...(p.isControlled !== undefined ? { isControlled: [true, 1, "1", "true"].includes(p.isControlled) ? 1 : 0 } : {}),
      ...(p.minQty !== undefined ? { minQty: round2(p.minQty) } : {}),
      ...(p.batch_number !== undefined ? { batch_number: String(p.batch_number).trim() } : {}),
      ...(p.branch_id !== undefined ? { branch_id: p.branch_id } : {}),
      ...(p.units !== undefined ? { units: units.length ? JSON.stringify(units) : null } : {}),
      price: nextPrice,
      cost: nextCost,
      qty: nextQty,
      expiry: nextExpiry,
      batches: JSON.stringify(nextBatches),
    };
    invList[idx] = updated;
    if (delta !== 0 && !movements.some((m: any) => m.event_id === evId && m.drug_id === updated.id)) {
      movements.unshift(makeMovementRecord(`SM-${evId}`, updated, "manual_edit", oldQty, nextQty, nextCost, { eventId: evId, actorName: p.actorName, notes: p.notes }, ts));
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "SPLIT_OR_ADD_BATCH") {
    const idx = invList.findIndex((i: any) => String(i.id) === String(targetId));
    if (idx < 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
    const cur = invList[idx];
    const mult = extractBoxMultiplier(cur.units);
    const addedBaseQty = p.addedBaseQty !== undefined ? round2(p.addedBaseQty) : round2((Number(p.addedBoxes ?? p.qty ?? 0) || 0) * mult);
    if (addedBaseQty <= 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };

    const curBatches = parseBatchesArray(cur.batches, cur);
    const newBatch = normalizeBatchRecord(
      {
        id: p.batchId || `BATCH-${evId}`,
        qty: addedBaseQty,
        cost: p.cost ?? p.purchase_price ?? cur.cost,
        price: p.price ?? cur.price,
        expiry: p.expiry ?? p.expiry_date ?? cur.expiry,
        batch_number: p.batch_number ?? p.batchNumber ?? "",
        createdAt: ts,
      },
      cur,
      curBatches.length
    );
    const nextBatches = addOrMergeBatch(curBatches, newBatch, cur);
    const fefoHead = nextBatches[0] || newBatch;
    const oldQty = round2(cur.qty);
    const nextQty = round2(oldQty + addedBaseQty);
    const updated = {
      ...cur,
      qty: nextQty,
      expiry: fefoHead.expiry || cur.expiry,
      price: round2(fefoHead.price || cur.price),
      cost: round2(fefoHead.cost || cur.cost),
      batch_number: fefoHead.batch_number || cur.batch_number,
      batches: JSON.stringify(nextBatches),
    };
    invList[idx] = updated;
    if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
      movements.unshift(makeMovementRecord(`SM-${evId}`, updated, "batch_split", oldQty, nextQty, newBatch.cost, { eventId: evId, batchId: newBatch.id, batch_number: newBatch.batch_number, actorName: p.actorName }, ts));
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "STOCK_TAKE") {
    const rows = Array.isArray(p.items) ? p.items : [];
    for (const row of rows) {
      const idx = invList.findIndex((i: any) => String(i.id) === String(row.id));
      if (idx < 0) continue;
      const cur = invList[idx];
      const oldQty = round2(cur.qty);
      const actualQty = round2(row.actual ?? row.actualBaseQty ?? oldQty);
      const delta = round2(actualQty - oldQty);
      const mult = extractBoxMultiplier(cur.units);
      const nextBatches = syncBatchesDelta(parseBatchesArray(cur.batches, cur), delta, {
        cost: cur.cost,
        price: cur.price,
        expiry: cur.expiry,
        batch_number: cur.batch_number,
        boxMultiplier: mult,
        createdAt: ts,
      });
      const updated = { ...cur, qty: actualQty, batches: JSON.stringify(nextBatches) };
      invList[idx] = updated;
      if (delta !== 0) {
        const lossVal = delta < 0 ? round2((Math.abs(delta) / mult) * (Number(cur.cost) || 0)) : 0;
        const adjId = `ADJ-${evId}-${cur.id}`;
        if (!adjustments.some((a: any) => a.id === adjId)) {
          adjustments.unshift({
            id: adjId,
            drug_id: cur.id,
            drug_name: cur.name,
            barcode: cur.barcode || "",
            reason: delta < 0 ? (row.reason || "stock_take_shortage") : "stock_take_surplus",
            qty: delta,
            cost: round2(cur.cost),
            loss_value: lossVal,
            recorded_by: p.actorName || "System",
            branch_id: cur.branch_id ?? null,
            created_at: ts,
          });
        }
        if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
          movements.unshift(makeMovementRecord(`SM-${evId}-${cur.id}`, updated, "stock_take", oldQty, actualQty, cur.cost, { eventId: evId, actorName: p.actorName, notes: row.notes }, ts));
        }
      }
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "RECORD_STOCK_ADJUSTMENT") {
    const idx = invList.findIndex((i: any) => String(i.id) === String(targetId));
    if (idx < 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
    const cur = invList[idx];
    const mult = extractBoxMultiplier(cur.units);
    const removeQty = Math.max(0, round2(p.qty));
    const oldQty = round2(cur.qty);
    const nextQty = Math.max(0, round2(oldQty - removeQty));
    const res = deductBatchesFefo(parseBatchesArray(cur.batches, cur), removeQty, cur.cost, cur.price, mult);
    const updated = { ...cur, qty: nextQty, batches: JSON.stringify(res.nextBatches) };
    invList[idx] = updated;
    const adjId = String(p.id || `ADJ-${evId}`);
    if (!adjustments.some((a: any) => a.id === adjId)) {
      adjustments.unshift({
        id: adjId,
        drug_id: cur.id,
        drug_name: cur.name,
        barcode: cur.barcode || "",
        reason: String(p.reason || "damaged"),
        qty: -removeQty,
        cost: res.weightedUnitCost,
        loss_value: res.totalCost,
        recorded_by: p.actorName || "System",
        branch_id: cur.branch_id ?? null,
        created_at: ts,
      });
    }
    if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
      movements.unshift(makeMovementRecord(`SM-${evId}`, updated, "waste_adjustment", oldQty, nextQty, res.weightedUnitCost, { eventId: evId, actorName: p.actorName, notes: p.reason }, ts));
    }
    if (res.totalCost > 0) {
      expenses.unshift({
        id: `EXP-ADJ-${evId}`,
        category: "هدر وتلفيات",
        amount: res.totalCost,
        notes: `${cur.name} (${p.reason || "damaged"})`,
        paymentMethod: "non_cash",
        branch_id: cur.branch_id ?? null,
        date: ts,
      });
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "DELETE_INVENTORY" || action === "ARCHIVE_INVENTORY") {
    const idx = invList.findIndex((i: any) => String(i.id) === String(targetId));
    if (idx < 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
    const cur = invList[idx];
    if (p.hardDelete) {
      invList.splice(idx, 1);
    } else {
      invList[idx] = { ...cur, archived_at: ts, qty: 0, batches: JSON.stringify([]) };
      if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
        movements.unshift(makeMovementRecord(`SM-${evId}`, invList[idx], "archive_zero", cur.qty, 0, cur.cost, { eventId: evId, actorName: p.actorName }, ts));
      }
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  if (action === "RESTORE_INVENTORY") {
    const idx = invList.findIndex((i: any) => String(i.id) === String(targetId));
    if (idx < 0) return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
    const cur = invList[idx];
    invList[idx] = { ...cur, archived_at: null };
    if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
      movements.unshift(makeMovementRecord(`SM-${evId}`, invList[idx], "restore", cur.qty, cur.qty, cur.cost, { eventId: evId, actorName: p.actorName }, ts));
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
  }

  return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses };
}
