/**
 * web/src/lib/purchases/domain.ts
 * Shared pure domain logic & deterministic projection engine for Purchases & Suppliers.
 * Identical mirror of roshetta_server/purchases-domain.js and C:/roshetta_app/src/domain/purchasesDomain.js.
 */

export type PaymentMethodCode = "cash" | "bank" | "jawwal_pay" | "palpay" | "card";
export type InvoiceStatusCode = "draft" | "completed" | "canceled";
export type BatchActionCode = "split" | "merge_update";

export interface UnitTier {
  name: string;
  count: number;
  price: number;
}

export interface CanonicalCommand<P = any> {
  eventId: string;
  action: string;
  targetId: string | null;
  payload: P;
  createdAt: string;
}

export const PAYMENT_METHODS: Record<
  PaymentMethodCode,
  { code: PaymentMethodCode; labelAr: string; labelEn: string; isCash: boolean; requiresRef: boolean }
> = {
  cash: { code: "cash", labelAr: "كاش", labelEn: "Cash", isCash: true, requiresRef: false },
  bank: { code: "bank", labelAr: "تحويل بنكي", labelEn: "Bank Transfer", isCash: false, requiresRef: true },
  jawwal_pay: { code: "jawwal_pay", labelAr: "جوال باي", labelEn: "Jawwal Pay", isCash: false, requiresRef: true },
  palpay: { code: "palpay", labelAr: "بال باي", labelEn: "PalPay", isCash: false, requiresRef: true },
  card: { code: "card", labelAr: "بطاقة", labelEn: "Card / Visa", isCash: false, requiresRef: true },
};

export const INVOICE_STATUSES: Record<
  InvoiceStatusCode,
  { code: InvoiceStatusCode; labelAr: string; labelEn: string; badgeTone: "amber" | "emerald" | "rose" }
> = {
  draft: { code: "draft", labelAr: "بانتظار الاستلام", labelEn: "Pending Receipt", badgeTone: "amber" },
  completed: { code: "completed", labelAr: "معتمدة ومستلمة", labelEn: "Completed", badgeTone: "emerald" },
  canceled: { code: "canceled", labelAr: "ملغاة", labelEn: "Canceled", badgeTone: "rose" },
};

export function round2(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function clamp(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(Math.max(num, min), max);
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

export function normalizeInvoiceStatus(status?: unknown, fallback: InvoiceStatusCode = "completed"): InvoiceStatusCode {
  const s = String(status || "").trim().toLowerCase();
  if (s === "draft" || s === "pending") return "draft";
  if (s === "completed" || s === "received") return "completed";
  if (s === "canceled" || s === "cancelled" || s === "reversed" || s === "reversal") return "canceled";
  return fallback;
}

export function isDraftStatus(status?: unknown): boolean {
  return normalizeInvoiceStatus(status, "completed") === "draft";
}

export function isCompletedStatus(status?: unknown): boolean {
  return normalizeInvoiceStatus(status, "completed") === "completed";
}

export function isCanceledStatus(status?: unknown): boolean {
  return normalizeInvoiceStatus(status, "completed") === "canceled";
}

export function formatInvoiceStatus(status?: unknown, lang: string = "ar") {
  const code = normalizeInvoiceStatus(status, "completed");
  const meta = INVOICE_STATUSES[code] || INVOICE_STATUSES.completed;
  return {
    code,
    label: lang === "en" ? meta.labelEn : meta.labelAr,
    labelAr: meta.labelAr,
    labelEn: meta.labelEn,
    badgeTone: meta.badgeTone,
  };
}

export function normalizePaymentMethod(pm?: unknown): string {
  if (!pm) return "cash";
  const clean = String(pm).trim().toLowerCase();
  if (
    ["cash", "نقدي", "كاش", "كاش / نقدي", "كاش (نقدي من الصندوق)", "نقداً (كاش)"].includes(clean) ||
    clean.includes("كاش") ||
    clean.includes("نقدي")
  ) {
    return "cash";
  }
  if (["jawwal_pay", "jawwalpay", "jawwal", "جوال باي", "جوال"].includes(clean) || clean.includes("جوال")) return "jawwal_pay";
  if (["palpay", "pal_pay", "بال باي", "بالباي"].includes(clean) || clean.includes("بال باي") || clean.includes("بالباي")) return "palpay";
  if (
    ["card", "بطاقة", "فيزا", "visa", "فيزا / بطاقة", "فيزا / بطاقة دفع"].includes(clean) ||
    clean.includes("فيزا") ||
    clean.includes("بطاقة")
  ) {
    return "card";
  }
  if (
    ["bank", "بنكي", "بنك", "تحويل بنكي", "حوالة بنكية", "تحويل بنكي (حوالة مصرفية)"].includes(clean) ||
    clean.includes("بنك") ||
    clean.includes("تحويل")
  ) {
    return "bank";
  }
  if (["cheque", "check", "شيك", "شيك بنكي", "شيكات"].includes(clean) || clean.includes("شيك")) return "cheque";
  if (["credit", "آجل", "اجل", "ذمم", "دين", "على الحساب"].includes(clean)) return "credit";
  if (["split", "مختلط", "مجزأ"].includes(clean)) return "split";
  if (["debt_payment", "تسديد دين", "سداد دين", "دفعة دين", "سداد دَين"].includes(clean)) return "debt_payment";
  return clean;
}

export function formatPaymentMethod(pm?: unknown, lang: string = "ar") {
  const code = normalizePaymentMethod(pm);
  const meta = (PAYMENT_METHODS as Record<string, any>)[code];
  if (meta) {
    return {
      code,
      label: lang === "en" ? meta.labelEn : meta.labelAr,
      labelAr: meta.labelAr,
      labelEn: meta.labelEn,
      isCash: meta.isCash,
      requiresRef: meta.requiresRef,
    };
  }
  return {
    code,
    label: String(pm || code),
    labelAr: String(pm || code),
    labelEn: String(pm || code),
    isCash: code === "cash",
    requiresRef: false,
  };
}

export function generateUuid(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateClientId(prefix: string = "ID"): string {
  const cleanPrefix = String(prefix || "ID").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || "ID";
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(10000 + Math.random() * 90000).toString(36).toUpperCase();
  return `${cleanPrefix}-${ts}-${rnd}`;
}

export function buildCanonicalCommand<P = any>({
  action,
  targetId = null,
  payload = {} as P,
  eventId,
  createdAt,
}: {
  action: string;
  targetId?: string | null;
  payload?: P;
  eventId?: string;
  createdAt?: string;
}): CanonicalCommand<P> {
  return {
    eventId: eventId || generateUuid(),
    action: String(action || "").trim().toUpperCase(),
    targetId: targetId == null ? null : String(targetId),
    payload: payload || ({} as P),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function isMainBranchAlias(value?: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return ["main", "الصيدلية الرئيسية", "الفرع الرئيسي", "الفرع الرئيسى", "رئيسي"].includes(normalized);
}

export function resolveBranchId(input?: any, branches: any[] = []): string {
  const raw =
    typeof input === "object" && input !== null
      ? input.branch_id ?? input.branchId ?? input.branch ?? input.branchName ?? ""
      : input ?? "";
  const trimmed = String(raw || "").trim();
  const list = Array.isArray(branches) ? branches : [];
  if (!trimmed) {
    const main = list.find((b) => String(b.id) === "Main" || isMainBranchAlias(b.name));
    return main ? String(main.id) : list[0]?.id ? String(list[0].id) : "Main";
  }
  const byId = list.find((b) => String(b.id) === trimmed);
  if (byId) return String(byId.id);
  const byName = list.find((b) => String(b.name || "").trim() === trimmed);
  if (byName) return String(byName.id);
  if (isMainBranchAlias(trimmed)) {
    const main = list.find((b) => String(b.id) === "Main" || isMainBranchAlias(b.name));
    return main ? String(main.id) : "Main";
  }
  return trimmed;
}

export function resolveBranchName(input?: any, branches: any[] = [], lang: string = "ar"): string {
  const fallback = lang === "en" ? "Main Branch" : "الفرع الرئيسي";
  const rawId =
    typeof input === "object" && input !== null
      ? input.branch_id ?? input.branchId ?? input.branch ?? input.branchName ?? ""
      : input ?? "";
  const trimmed = String(rawId || "").trim();
  const list = Array.isArray(branches) ? branches : [];
  if (!trimmed || isMainBranchAlias(trimmed)) {
    const main = list.find((b) => String(b.id) === "Main" || isMainBranchAlias(b.name));
    return main?.name || fallback;
  }
  const matched = list.find((b) => String(b.id) === trimmed || String(b.name || "").trim() === trimmed);
  return matched?.name || trimmed || fallback;
}

export function cleanBatchName(name?: unknown): string {
  return String(name || "")
    .replace(/\s*\(القديم\)|\s*\(الجديد\)|\s*\(دفعة قديمة\)|\s*\(دفعة جديدة\)/g, "")
    .trim();
}

export function parseUnitsArray(rawUnits: unknown, basePrice: number = 0): UnitTier[] {
  const parsed = safeJson<any>(rawUnits, null);
  if (!parsed) return [];
  if (Array.isArray(parsed)) {
    return parsed
      .filter((u) => u && (u.name || Number(u.count) > 0))
      .map((u) => ({
        name: String(u.name || "وحدة").trim(),
        count: Math.max(1, Number(u.count) || 1),
        price: round2(u.price != null && u.price !== "" ? Number(u.price) : Number(basePrice) || 0),
      }));
  }
  if (typeof parsed === "object" && parsed.has_parts) {
    const p1Qty = Math.max(1, Number(parsed.part1_qty) || 1);
    const hasP2 = Boolean(parsed.has_subparts && Number(parsed.part2_qty) > 0);
    const p2Qty = hasP2 ? Math.max(1, Number(parsed.part2_qty) || 1) : 1;
    const totalSmallestPerBox = p1Qty * p2Qty;
    const bp = Number(basePrice) || 0;
    const p1Price =
      parsed.part1_price != null && Number(parsed.part1_price) > 0 ? round2(parsed.part1_price) : round2(bp / p1Qty);
    if (hasP2) {
      const p2Price =
        parsed.part2_price != null && Number(parsed.part2_price) > 0 ? round2(parsed.part2_price) : round2(p1Price / p2Qty);
      return [
        { name: String(parsed.box_name || "علبة").trim(), count: totalSmallestPerBox, price: round2(bp) },
        { name: String(parsed.part1_name || "شريط").trim(), count: p2Qty, price: p1Price },
        { name: String(parsed.part2_name || "حبة").trim(), count: 1, price: p2Price },
      ];
    }
    return [
      { name: String(parsed.box_name || "علبة").trim(), count: p1Qty, price: round2(bp) },
      { name: String(parsed.part1_name || "شريط").trim(), count: 1, price: p1Price },
    ];
  }
  return [];
}

export function normalizeUnitsInput({
  unitMode = 1,
  boxName = "علبة",
  boxPrice = 0,
  part1Name = "شريط",
  part1Qty = 1,
  part1Price = 0,
  part2Name = "حبة",
  part2Qty = 1,
  part2Price = 0,
  units = null,
}: {
  unitMode?: number;
  boxName?: string;
  boxPrice?: number;
  part1Name?: string;
  part1Qty?: number;
  part1Price?: number;
  part2Name?: string;
  part2Qty?: number;
  part2Price?: number;
  units?: unknown;
} = {}): UnitTier[] | null {
  if (units) {
    const arr = parseUnitsArray(units, boxPrice);
    return arr.length ? arr : null;
  }
  const mode = Number(unitMode) || 1;
  if (mode <= 1) return null;
  const p1 = Math.max(1, Number(part1Qty) || 1);
  const bp = Number(boxPrice) || 0;
  const p1Pr = Number(part1Price) > 0 ? round2(part1Price) : round2(bp / p1);
  if (mode === 3) {
    const p2 = Math.max(1, Number(part2Qty) || 1);
    const p2Pr = Number(part2Price) > 0 ? round2(part2Price) : round2(p1Pr / p2);
    return [
      { name: String(boxName || "علبة").trim(), count: p1 * p2, price: round2(bp) },
      { name: String(part1Name || "شريط").trim(), count: p2, price: p1Pr },
      { name: String(part2Name || "حبة").trim(), count: 1, price: p2Pr },
    ];
  }
  return [
    { name: String(boxName || "علبة").trim(), count: p1, price: round2(bp) },
    { name: String(part1Name || "شريط").trim(), count: 1, price: p1Pr },
  ];
}

export function extractUnitMultiplier(item: any): number {
  if (!item) return 1;
  if (item.unit_size != null && Number(item.unit_size) > 0) return Math.max(1, Number(item.unit_size));
  if (item.unitSize != null && Number(item.unitSize) > 0) return Math.max(1, Number(item.unitSize));
  const units = parseUnitsArray(item.units);
  if (units.length > 0 && Number(units[0].count) > 0) return Math.max(1, Number(units[0].count));
  return 1;
}

export function computeLineTotals(item: any) {
  const qty = Math.max(0, Number(item?.qty) || 0);
  const cost = Math.max(0, Number(item?.cost !== undefined && item?.cost !== "" ? item.cost : item?.purchase_price ?? 0) || 0);
  const price = Math.max(0, Number(item?.price !== undefined && item?.price !== "" ? item.price : item?.sell_price ?? 0) || 0);
  const multiplier = extractUnitMultiplier(item);
  return {
    qty,
    cost: round2(cost),
    price: round2(price),
    multiplier,
    physicalQty: Math.round(qty * multiplier),
    lineTotal: round2(qty * cost),
  };
}

export function computeInvoiceSummary({
  items = [],
  paidAmount = 0,
  availableCredit = 0,
  creditSettledOverride = undefined,
  status = "completed",
}: {
  items?: any[];
  paidAmount?: number;
  availableCredit?: number;
  creditSettledOverride?: number;
  status?: unknown;
} = {}) {
  const normStatus = normalizeInvoiceStatus(status, "completed");
  const list = Array.isArray(items) ? items : [];
  const computedItemsTotal = round2(list.reduce((sum, item) => sum + computeLineTotals(item).lineTotal, 0));
  if (normStatus === "draft") {
    return {
      status: "draft" as InvoiceStatusCode,
      totalCost: computedItemsTotal,
      paidAmount: 0,
      creditSettled: 0,
      remaining: 0,
      netSupplierDelta: 0,
    };
  }
  const creditAvail = Math.max(0, Number(availableCredit) || 0);
  const paid = clamp(paidAmount, 0, computedItemsTotal);
  const unpaidBeforeCredit = Math.max(0, round2(computedItemsTotal - paid));
  const maxCredit = Math.min(creditAvail, unpaidBeforeCredit);
  const creditSettled =
    creditSettledOverride != null && (creditSettledOverride as any) !== ""
      ? clamp(creditSettledOverride, 0, maxCredit)
      : maxCredit;
  const remaining = Math.max(0, round2(unpaidBeforeCredit - creditSettled));
  const netSupplierDelta = round2(computedItemsTotal - paid);
  return {
    status: normStatus,
    totalCost: computedItemsTotal,
    paidAmount: round2(paid),
    creditSettled: round2(creditSettled),
    remaining,
    netSupplierDelta,
  };
}

export function getInvoicePaidAtReceipt(inv: any): number {
  if (!inv) return 0;
  const totalPaid = Number(inv.paid_amount ?? inv.paid ?? 0) || 0;
  const fifoPaid = Number(inv.fifo_paid || 0) || 0;
  const voucherPaid = Number(inv.direct_voucher_paid || 0) || 0;
  return Math.max(0, round2(totalPaid - fifoPaid - voucherPaid));
}

export function validateSupplierInput(input: any = {}, lang: string = "ar") {
  const errors: string[] = [];
  const name = String(input.name || "").trim();
  if (!name) errors.push(lang === "en" ? "Supplier name is required" : "اسم المورد مطلوب");
  return { valid: errors.length === 0, errors, firstError: errors[0] || "" };
}

export function validatePaymentInput(input: any = {}, lang: string = "ar") {
  const errors: string[] = [];
  const amount = Number(input.amount ?? input.payment);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push(lang === "en" ? "Payment amount must be greater than zero" : "مبلغ السداد يجب أن يكون أكبر من صفر");
  }
  const method = normalizePaymentMethod(input.paymentMethod || input.payment_method || "cash");
  if (!(PAYMENT_METHODS as Record<string, any>)[method]) {
    errors.push(lang === "en" ? "Unsupported payment method" : "طريقة الدفع غير مدعومة");
  }
  if (input.maxRemaining != null && Number.isFinite(Number(input.maxRemaining)) && amount > Number(input.maxRemaining) + 0.01) {
    errors.push(lang === "en" ? "Payment exceeds remaining balance" : "مبلغ السداد يتجاوز المتبقي على الفاتورة");
  }
  return { valid: errors.length === 0, errors, firstError: errors[0] || "" };
}

export function validatePurchaseInput(input: any = {}, lang: string = "ar") {
  const errors: string[] = [];
  const status = normalizeInvoiceStatus(input.status, "completed");
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    errors.push(lang === "en" ? "At least one item is required" : "يجب إضافة صنف واحد على الأقل للفاتورة");
  }
  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const lineName = String(line?.name || "").trim();
    const qty = Number(line?.qty);
    const cost = Number(line?.cost ?? line?.purchase_price ?? 0);
    if (!lineName) {
      errors.push(lang === "en" ? `Item #${i + 1} name is required` : `اسم الصنف رقم ${i + 1} مطلوب`);
      break;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(lang === "en" ? `Quantity for ${lineName} must be > 0` : `كمية "${lineName}" يجب أن تكون أكبر من صفر`);
      break;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      errors.push(lang === "en" ? `Cost for ${lineName} cannot be negative` : `تكلفة "${lineName}" غير صالحة`);
      break;
    }
  }
  if (status === "completed") {
    const total = round2(items.reduce((s: number, it: any) => s + computeLineTotals(it).lineTotal, 0));
    const paid = Number(input.paidAmount ?? input.paid_amount ?? 0);
    if (!Number.isFinite(paid) || paid < 0) {
      errors.push(lang === "en" ? "Paid amount cannot be negative" : "المبلغ المدفوع لا يمكن أن يكون سالباً");
    } else if (paid > total + 0.01) {
      errors.push(lang === "en" ? "Paid amount cannot exceed invoice total" : "المبلغ المدفوع يتجاوز إجمالي الفاتورة");
    }
  }
  return { valid: errors.length === 0, errors, firstError: errors[0] || "" };
}

export function computeStatementKpis(rows: any[] = [], purchases: any[] = [], supplierId: string = "", currentBalance: number = 0) {
  let totalPaid = 0;
  const reversedIds = new Set(
    (rows || []).filter((r) => r && r.type === "reversal" && r.reference_id).map((r) => String(r.reference_id))
  );
  const countedInvoiceIds = new Set<string>();
  for (const row of rows) {
    if (row.type === "payment") {
      totalPaid += Number(row.amount) || 0;
    } else if (row.type === "invoice" || row.type === "credit_settlement") {
      const refKey = row.reference_id ? String(row.reference_id) : "";
      if (refKey && (reversedIds.has(refKey) || countedInvoiceIds.has(refKey))) continue;
      if (refKey) countedInvoiceIds.add(refKey);
      const linkedInv = purchases.find((p) => String(p.id) === refKey);
      const directPaid = linkedInv ? getInvoicePaidAtReceipt(linkedInv) : Number(row.paidAmount) || 0;
      totalPaid += directPaid;
    }
  }
  const openInvoicesCount = (purchases || []).filter(
    (p) => String(p.supplier_id) === String(supplierId) && isCompletedStatus(p.status) && Number(p.remaining) > 0
  ).length;
  return {
    totalPaid: round2(totalPaid),
    currentBalance: round2(currentBalance),
    transactionsCount: rows.length,
    openInvoicesCount,
  };
}

export function applyCommandOptimistically(snapshot: any = {}, command: Partial<CanonicalCommand> = {}) {
  const suppliers: any[] = Array.isArray(snapshot.suppliers) ? snapshot.suppliers.map((s: any) => ({ ...s })) : [];
  const purchases: any[] = Array.isArray(snapshot.purchases) ? snapshot.purchases.map((p: any) => ({ ...p })) : [];
  const supplierTransactions: any[] = Array.isArray(snapshot.supplierTransactions)
    ? snapshot.supplierTransactions.map((t: any) => ({ ...t }))
    : [];
  const expenses: any[] = Array.isArray(snapshot.expenses) ? snapshot.expenses.map((e: any) => ({ ...e })) : [];

  const action = String(command.action || "").toUpperCase();
  const payload = command.payload || {};
  const targetId = command.targetId || payload.id || null;
  const now = command.createdAt || payload.date || new Date().toISOString();
  const eventId = command.eventId || generateUuid();

  const findSupplier = (suppId?: string, suppName?: string) => {
    if (suppId) {
      const byId = suppliers.find((s) => String(s.id) === String(suppId));
      if (byId) return byId;
    }
    if (suppName) {
      const targetName = String(suppName).trim().toLowerCase();
      return suppliers.find((s) => String(s.name || "").trim().toLowerCase() === targetName) || null;
    }
    return null;
  };

  if (action === "ADD_SUPPLIER") {
    const id = String(payload.id || targetId || generateClientId("SUP"));
    if (!suppliers.some((s) => String(s.id) === id)) {
      suppliers.unshift({
        id,
        name: String(payload.name || "").trim(),
        phone: String(payload.phone || "").trim(),
        email: String(payload.email || "").trim(),
        company: String(payload.company || "").trim(),
        notes: String(payload.notes || "").trim(),
        branch_id: payload.branch_id || null,
        balance: 0,
        date_added: now,
        isPending: true,
        eventId,
      });
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if (action === "UPDATE_SUPPLIER" && targetId) {
    const idx = suppliers.findIndex((s) => String(s.id) === String(targetId));
    if (idx >= 0) suppliers[idx] = { ...suppliers[idx], ...payload, isPending: true, eventId };
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if (action === "DELETE_SUPPLIER" && targetId) {
    return {
      suppliers: suppliers.filter((s) => String(s.id) !== String(targetId)),
      purchases,
      supplierTransactions,
      expenses,
    };
  }

  if (action === "CREATE_PURCHASE" || action === "ADD_PURCHASE") {
    const status = normalizeInvoiceStatus(payload.status, "completed");
    const invId = String(payload.id || targetId || generateClientId(status === "draft" ? "PO" : "PINV"));
    if (!purchases.some((p) => String(p.id) === invId)) {
      const supplier = findSupplier(payload.supplier_id || payload.supplierId, payload.supplier_name || payload.supplierName);
      const before = Number(supplier?.balance) || 0;
      const summary = computeInvoiceSummary({
        items: payload.items || [],
        paidAmount: payload.paidAmount ?? payload.paid_amount ?? 0,
        availableCredit: before < 0 ? Math.abs(before) : 0,
        creditSettledOverride: payload.creditSettled ?? payload.credit_settled,
        status,
      });
      const invNum = String(payload.invoice_number || payload.invoiceNumber || payload.supplierInvoiceNumber || "");
      const method = formatPaymentMethod(payload.paymentMethod || payload.payment_method || "cash");
      purchases.unshift({
        id: invId,
        supplier_id: String(payload.supplier_id || payload.supplierId || supplier?.id || ""),
        supplier_name: String(payload.supplier_name || payload.supplierName || supplier?.name || ""),
        items: payload.items || [],
        total: summary.totalCost,
        total_cost: summary.totalCost,
        paid: summary.paidAmount,
        paid_amount: summary.paidAmount,
        fifo_paid: 0,
        direct_voucher_paid: 0,
        credit_settled: summary.creditSettled,
        creditSettled: summary.creditSettled,
        remaining: summary.remaining,
        invoice_number: invNum,
        invoiceNumber: invNum,
        branch_id: payload.branch_id || payload.branchId || "Main",
        notes: payload.notes || "",
        status,
        payment_method: method.code,
        date: now,
        isPending: true,
        eventId,
      });
      if (status === "completed" && supplier) {
        const after = round2(before + summary.netSupplierDelta);
        supplier.balance = after;
        supplierTransactions.unshift({
          id: `STX-PENDING-${eventId}-INV`,
          supplier_id: supplier.id,
          type: summary.creditSettled > 0 ? "credit_settlement" : "invoice",
          reference_id: invId,
          invoice_number: invNum || invId,
          amount: summary.totalCost,
          paidAmount: summary.paidAmount,
          remainingAmount: summary.remaining,
          balance_before: before,
          balance_after: after,
          payment_method: summary.paidAmount > 0 ? method.code : "",
          branch_id: payload.branch_id || payload.branchId || supplier.branch_id || "Main",
          date: now,
          notes: "فاتورة شراء (قيد المزامنة)",
          isPending: true,
          eventId,
        });
        if (summary.paidAmount > 0) {
          expenses.unshift({
            id: String(payload.expId || `EXP-PENDING-${eventId}-PINV`),
            category: "سداد موردين",
            description: `دفعة فاتورة شراء: ${supplier.name}`,
            amount: summary.paidAmount,
            paymentMethod: method.code,
            branch_id: payload.branch_id || payload.branchId || supplier.branch_id || "Main",
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            reference_id: invId,
            date: now,
            isPending: true,
            eventId,
          });
        }
      }
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if ((action === "UPDATE_OR_APPROVE_PURCHASE" || action === "RECEIVE_PURCHASE" || action === "COMPLETE_PURCHASE") && targetId) {
    const idx = purchases.findIndex((p) => String(p.id) === String(targetId));
    if (idx >= 0) {
      const existing = purchases[idx];
      const nextStatus = action === "COMPLETE_PURCHASE" ? "completed" : normalizeInvoiceStatus(payload.status || existing.status, existing.status);
      const nextItems = Array.isArray(payload.items) ? payload.items : existing.items || [];
      const supplier = findSupplier(payload.supplier_id || existing.supplier_id, payload.supplier_name || existing.supplier_name);
      const prevWasDraft = isDraftStatus(existing.status);
      const before = Number(supplier?.balance) || 0;
      const summary = computeInvoiceSummary({
        items: nextItems,
        paidAmount: payload.paidAmount ?? payload.paid_amount ?? existing.paid_amount ?? 0,
        availableCredit: prevWasDraft ? (before < 0 ? Math.abs(before) : 0) : 0,
        creditSettledOverride: payload.creditSettled ?? payload.credit_settled ?? (prevWasDraft ? undefined : existing.credit_settled),
        status: nextStatus,
      });
      const oldImpact = prevWasDraft ? 0 : round2((Number(existing.total_cost) || 0) - (Number(existing.paid_amount) || 0));
      const diff = nextStatus === "completed" ? round2(summary.netSupplierDelta - oldImpact) : 0;
      const creditSettled = prevWasDraft
        ? summary.creditSettled
        : Math.min(Math.max(0, Number(existing.credit_settled || 0)), summary.netSupplierDelta);
      const remaining = prevWasDraft ? summary.remaining : Math.max(0, round2(summary.netSupplierDelta - creditSettled));

      purchases[idx] = {
        ...existing,
        ...payload,
        items: nextItems,
        status: nextStatus,
        total: summary.totalCost,
        total_cost: summary.totalCost,
        paid: summary.paidAmount,
        paid_amount: summary.paidAmount,
        credit_settled: creditSettled,
        creditSettled,
        remaining,
        isPending: true,
        eventId,
      };
      if (supplier && diff !== 0) {
        const after = round2(before + diff);
        supplier.balance = after;
        supplierTransactions.unshift({
          id: `STX-PENDING-${eventId}-UPD`,
          supplier_id: supplier.id,
          type: prevWasDraft && creditSettled > 0 ? "credit_settlement" : "invoice",
          reference_id: existing.id,
          invoice_number: existing.invoice_number || existing.id,
          amount: prevWasDraft ? summary.totalCost : diff,
          balance_before: before,
          balance_after: after,
          date: now,
          notes: prevWasDraft ? "اعتماد فاتورة شراء (قيد المزامنة)" : "تعديل فاتورة شراء (قيد المزامنة)",
          isPending: true,
          eventId,
        });
      }
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if (action === "DELETE_PURCHASE" && targetId) {
    const idx = purchases.findIndex((p) => String(p.id) === String(targetId));
    if (idx >= 0) {
      const inv = purchases[idx];
      if (isCompletedStatus(inv.status) && inv.supplier_id) {
        const supplier = findSupplier(inv.supplier_id, inv.supplier_name);
        if (supplier) {
          const directPaid = getInvoicePaidAtReceipt(inv);
          const impact = round2((Number(inv.total_cost) || 0) - directPaid);
          const before = Number(supplier.balance) || 0;
          const after = round2(before - impact);
          supplier.balance = after;
          supplierTransactions.unshift({
            id: `STX-PENDING-${eventId}-REV`,
            supplier_id: supplier.id,
            type: "reversal",
            reference_id: inv.id,
            invoice_number: inv.invoice_number || inv.id,
            amount: impact,
            remainingAmount: 0,
            balance_before: before,
            balance_after: after,
            date: now,
            notes: "إلغاء فاتورة شراء (قيد المزامنة)",
            isPending: true,
            eventId,
          });
        }
      }
      purchases.splice(idx, 1);
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if (action === "PAY_PURCHASE_INVOICE" && targetId) {
    const amount = Math.max(0, Number(payload.payment ?? payload.amount) || 0);
    const inv = purchases.find((p) => String(p.id) === String(targetId));
    const method = formatPaymentMethod(payload.paymentMethod || payload.payment_method || "cash");
    if (inv && amount > 0) {
      inv.paid_amount = round2((Number(inv.paid_amount) || 0) + amount);
      inv.paid = inv.paid_amount;
      inv.direct_voucher_paid = round2((Number(inv.direct_voucher_paid) || 0) + amount);
      inv.remaining = Math.max(0, round2((Number(inv.remaining) || 0) - amount));
      inv.isPending = true;
      const supplier = findSupplier(inv.supplier_id, inv.supplier_name);
      if (supplier) {
        const before = Number(supplier.balance) || 0;
        const after = round2(before - amount);
        supplier.balance = after;
        const expId = String(payload.expId || `EXP-PENDING-${eventId}-PAY`);
        supplierTransactions.unshift({
          id: `STX-PENDING-${eventId}-PAY`,
          supplier_id: supplier.id,
          type: "payment",
          reference_id: expId,
          invoice_number: inv.invoice_number || inv.id,
          amount,
          balance_before: before,
          balance_after: after,
          payment_method: method.code,
          branch_id: payload.branch_id || inv.branch_id || supplier.branch_id || "Main",
          date: now,
          notes: `دفعة على فاتورة شراء #${inv.invoice_number || inv.id} (قيد المزامنة)`,
          isPending: true,
          eventId,
        });
      }
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  if (action === "PAY_SUPPLIER" && targetId) {
    const amount = Math.max(0, Number(payload.amount) || 0);
    const supplier = findSupplier(targetId, payload.supplier_name);
    const method = formatPaymentMethod(payload.paymentMethod || payload.payment_method || "cash");
    if (supplier && amount > 0) {
      const before = Number(supplier.balance) || 0;
      const after = round2(before - amount);
      supplier.balance = after;
      const expId = String(payload.expId || payload.id || `EXP-PENDING-${eventId}-SUPP`);
      supplierTransactions.unshift({
        id: `STX-PENDING-${eventId}-SUPP`,
        supplier_id: supplier.id,
        type: "payment",
        reference_id: expId,
        invoice_number: "",
        amount,
        balance_before: before,
        balance_after: after,
        payment_method: method.code,
        branch_id: payload.branch_id || supplier.branch_id || "Main",
        created_by: payload.paidBy || payload.created_by || "",
        date: now,
        notes: `دفعة للمورد (${method.labelAr}) (قيد المزامنة)`,
        isPending: true,
        eventId,
      });
      const open = purchases
        .filter((p) => {
          if (!isCompletedStatus(p.status) || Number(p.remaining) <= 0) return false;
          if (p.supplier_id) return String(p.supplier_id) === String(supplier.id);
          return String(p.supplier_name || "").trim().toLowerCase() === String(supplier.name || "").trim().toLowerCase();
        })
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.id).localeCompare(String(b.id)));
      let remAlloc = amount;
      for (const inv of open) {
        if (remAlloc <= 0) break;
        const curRem = Number(inv.remaining) || 0;
        const deduct = Math.min(remAlloc, curRem);
        inv.remaining = Math.max(0, round2(curRem - deduct));
        inv.paid_amount = round2((Number(inv.paid_amount) || 0) + deduct);
        inv.paid = inv.paid_amount;
        inv.fifo_paid = round2((Number(inv.fifo_paid) || 0) + deduct);
        remAlloc = round2(remAlloc - deduct);
      }
    }
    return { suppliers, purchases, supplierTransactions, expenses };
  }

  return { suppliers, purchases, supplierTransactions, expenses };
}

export function projectSupplierStatement({
  baseStatement = null,
  supplierId = "",
  supplier = null,
  purchases = [],
  pendingCommands = [],
  branches = [],
  lang = "ar",
}: {
  baseStatement?: any;
  supplierId?: string;
  supplier?: any;
  purchases?: any[];
  pendingCommands?: CanonicalCommand[];
  branches?: any[];
  lang?: string;
} = {}) {
  const base = baseStatement || { supplier: supplier || { id: supplierId, balance: 0 }, kpis: null, transactions: [] };
  const baseRows = Array.isArray(base.transactions) ? base.transactions : [];
  const relevantCmds = (Array.isArray(pendingCommands) ? pendingCommands : []).filter((cmd) => {
    const p = cmd?.payload || {};
    const cmdSupp =
      cmd?.targetId && ["PAY_SUPPLIER", "UPDATE_SUPPLIER"].includes(cmd.action) ? cmd.targetId : p.supplier_id || p.supplierId;
    if (cmdSupp && String(cmdSupp) === String(supplierId)) return true;
    if (["UPDATE_OR_APPROVE_PURCHASE", "COMPLETE_PURCHASE", "DELETE_PURCHASE", "PAY_PURCHASE_INVOICE"].includes(cmd?.action)) {
      const inv = (purchases || []).find((x) => String(x.id) === String(cmd.targetId));
      return inv && String(inv.supplier_id) === String(supplierId);
    }
    return false;
  });

  if (relevantCmds.length === 0) {
    const curBal = Number(base.supplier?.balance ?? supplier?.balance ?? 0);
    const kpis = base.kpis || computeStatementKpis(baseRows, purchases, supplierId, curBal);
    return { supplier: base.supplier || supplier, kpis, transactions: baseRows };
  }

  let working: { suppliers: any[]; purchases: any[]; supplierTransactions: any[]; expenses: any[] } = {
    suppliers: [base.supplier || supplier || { id: supplierId, balance: 0 }].filter(Boolean),
    purchases: purchases || [],
    supplierTransactions: [...baseRows],
    expenses: [],
  };

  for (const cmd of relevantCmds) {
    const alreadySynced = baseRows.some(
      (r: any) => (cmd.eventId && r.eventId === cmd.eventId) || (cmd.payload?.expId && r.reference_id === cmd.payload.expId)
    );
    if (!alreadySynced) {
      working = applyCommandOptimistically(working, cmd);
    }
  }

  const resolvedSupp = working.suppliers.find((s: any) => String(s.id) === String(supplierId)) || base.supplier || supplier;
  const rows = working.supplierTransactions
    .filter((t: any) => String(t.supplier_id) === String(supplierId))
    .map((row: any) => ({
      ...row,
      branchName: row.branchName || resolveBranchName(row.branch_id, branches, lang),
      paymentMethodLabel: row.paymentMethodLabel || (row.payment_method ? formatPaymentMethod(row.payment_method, lang).label : ""),
    }))
    .sort((a: any, b: any) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id)));

  const kpis = computeStatementKpis(rows, working.purchases, supplierId, Number(resolvedSupp?.balance || 0));
  return { supplier: resolvedSupp, kpis, transactions: rows };
}
