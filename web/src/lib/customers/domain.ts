/**
 * web/src/lib/customers/domain.ts
 * Shared pure domain logic & deterministic projection engine for Customers, Debts & Credit Vouchers.
 * Identical mirror of roshetta_server/customers-domain.js and C:/roshetta_app/src/domain/customersDomain.js.
 */

export type VoucherPaymentMethodCode = "cash" | "bank" | "jawwal_pay" | "palpay" | "card";
export type PosPaymentChannelCode = VoucherPaymentMethodCode | "credit" | "split";
export type CustomerTransactionType =
  | "payment"
  | "credit_sale"
  | "manual_debit"
  | "opening_balance"
  | "credit_refund"
  | "debt_cancel";

export interface BranchRecord {
  id: string;
  name: string;
  status?: string;
}

export interface CustomerRecord {
  id: string;
  pharmacy_id?: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  branch_id?: string | null;
  branchName?: string;
  debt: number;
  lastVisit?: string;
}

export interface CustomerTransactionRecord {
  id: string;
  pharmacy_id?: string;
  customer_id: string;
  type: CustomerTransactionType | string;
  voucher_number?: string;
  reference_id?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method?: string;
  paymentMethodLabel?: string;
  electronic_ref?: string;
  branch_id?: string | null;
  branch_name?: string;
  cashier_name?: string;
  notes?: string;
  date?: string;
}

export interface CustomerStatementKpis {
  currentBalance: number;
  isStoreCredit: boolean;
  totalCashSales: number;
  totalCreditSales: number;
  totalPayments: number;
  cashSalesCount: number;
  creditSalesCount: number;
  paymentsCount: number;
  transactionsCount: number;
}

export interface CustomerStatementResult {
  customer: CustomerRecord;
  kpis: CustomerStatementKpis;
  transactions: CustomerTransactionRecord[];
  sales: any[];
  paidSales?: any[];
  creditSales?: any[];
  payments?: any[];
}

export interface CanonicalCustomerCommand<P = any> {
  eventId: string;
  action: string;
  targetId: string | null;
  payload: P;
  createdAt: string;
}

export const CUSTOMER_PAYMENT_METHODS: Record<
  VoucherPaymentMethodCode,
  { code: VoucherPaymentMethodCode; labelAr: string; labelEn: string; emoji: string; isCash: boolean; requiresRef: boolean }
> = {
  cash: { code: "cash", labelAr: "نقدي (كاش)", labelEn: "Cash", emoji: "💵", isCash: true, requiresRef: false },
  bank: { code: "bank", labelAr: "تحويل بنكي", labelEn: "Bank Transfer", emoji: "🏦", isCash: false, requiresRef: true },
  jawwal_pay: { code: "jawwal_pay", labelAr: "جوال باي", labelEn: "Jawwal Pay", emoji: "📱", isCash: false, requiresRef: true },
  palpay: { code: "palpay", labelAr: "بال باي", labelEn: "PalPay", emoji: "💳", isCash: false, requiresRef: true },
  card: { code: "card", labelAr: "بطاقة فيزا", labelEn: "Card / Visa", emoji: "💳", isCash: false, requiresRef: true },
};

export const VOUCHER_PAYMENT_CHANNELS = Object.values(CUSTOMER_PAYMENT_METHODS);

export function formatTransactionType(typeRaw: unknown, lang: "ar" | "en" = "ar") {
  const code = String(typeRaw || "payment") as CustomerTransactionType;
  const meta = TRANSACTION_TYPES[code];
  const isDebit = code === "credit_sale" || code === "manual_debit";
  if (meta) {
    return {
      code,
      label: lang === "en" ? meta.labelEn : meta.labelAr,
      tone: meta.tone,
      direction: isDebit ? ("debit" as const) : ("credit" as const),
    };
  }
  return {
    code,
    label: code,
    tone: "slate",
    direction: "debit" as const,
  };
}

export const POS_PAYMENT_CHANNELS: Record<
  PosPaymentChannelCode,
  { code: PosPaymentChannelCode; labelAr: string; labelEn: string; emoji: string; isCash: boolean; requiresRef: boolean }
> = {
  ...CUSTOMER_PAYMENT_METHODS,
  credit: { code: "credit", labelAr: "آجل / ذمم", labelEn: "Credit (Debt)", emoji: "📝", isCash: false, requiresRef: false },
  split: { code: "split", labelAr: "دفع مجزأ", labelEn: "Split Payment", emoji: "⚖️", isCash: false, requiresRef: false },
};

export const TRANSACTION_TYPES: Record<
  CustomerTransactionType,
  { code: CustomerTransactionType; labelAr: string; labelEn: string; tone: string }
> = {
  payment: { code: "payment", labelAr: "سند قبض وسداد", labelEn: "Payment Voucher", tone: "emerald" },
  credit_sale: { code: "credit_sale", labelAr: "فاتورة مبيعات آجل", labelEn: "Credit Sale", tone: "rose" },
  manual_debit: { code: "manual_debit", labelAr: "قيد دين يدوي", labelEn: "Manual Debt Entry", tone: "amber" },
  opening_balance: { code: "opening_balance", labelAr: "رصيد افتتاحي", labelEn: "Opening Balance", tone: "slate" },
  credit_refund: { code: "credit_refund", labelAr: "مرتجع لرصيد العميل", labelEn: "Refund to Store Credit", tone: "teal" },
  debt_cancel: { code: "debt_cancel", labelAr: "إلغاء دين لمرتجع", labelEn: "Debt Cancelled by Refund", tone: "indigo" },
};

export function round2(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function safeJson<T = any>(raw: unknown, fallback: T = null as unknown as T): T {
  if (raw == null) return fallback;
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return fallback;
  }
}

export function normalizeSearchText(text: unknown): string {
  if (!text) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function generateUuid(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateClientId(prefix = "CUST"): string {
  const cleanPrefix = String(prefix || "CUST").replace(/[^A-Z0-9-]/gi, "").toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = generateUuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${cleanPrefix}-${stamp}-${rand}`;
}

export function buildCanonicalCustomerCommand<P = any>({
  action,
  targetId = null,
  payload = {} as P,
  eventId = null,
  createdAt = null,
}: {
  action: string;
  targetId?: string | null;
  payload?: P;
  eventId?: string | null;
  createdAt?: string | null;
}): CanonicalCustomerCommand<P> {
  return {
    eventId: eventId || generateUuid(),
    action: String(action || "").trim().toUpperCase(),
    targetId: targetId == null ? null : String(targetId),
    payload: payload || ({} as P),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function isMainBranchAlias(value: unknown): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return ["main", "__main__", "الصيدلية الرئيسية", "الفرع الرئيسي", "الفرع الرئيسى", "المقر الرئيسي", "رئيسي"].includes(normalized);
}

const ARCHIVED_BRANCH_STATUSES = new Set(["مؤرشف", "archived", "deleted"]);

export function getActiveBranches(branches: any[] = []): any[] {
  return (Array.isArray(branches) ? branches : []).filter(
    (b) => b && !ARCHIVED_BRANCH_STATUSES.has(String(b.status || "").trim().toLowerCase())
  );
}

export function resolveBranchId(input: any, branches: any[] = []): string {
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

export function resolveBranchName(input: any, branches: any[] = [], lang: "ar" | "en" = "ar"): string {
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

export function matchesCustomerBranch(customer: any, selectedBranchId: string, branches: any[] = []): boolean {
  if (!selectedBranchId || selectedBranchId === "all") return true;
  const targetId = resolveBranchId(selectedBranchId, branches);
  const targetName = resolveBranchName(targetId, branches);
  const rawCustBranch = String(customer?.branch_id ?? customer?.branchId ?? customer?.branch ?? "").trim();
  if (!rawCustBranch) {
    const main = (branches || []).find((b) => String(b.id) === "Main" || isMainBranchAlias(b.name));
    return String(targetId) === "Main" || isMainBranchAlias(targetName) || Boolean(main && String(main.id) === String(targetId));
  }
  const resolvedCustBranch = resolveBranchId(rawCustBranch, branches);
  return String(resolvedCustBranch) === String(targetId);
}

export function normalizeVoucherPaymentMethod(methodRaw: unknown): VoucherPaymentMethodCode {
  const raw = String(methodRaw || "").trim();
  const m = raw.toLowerCase();
  if (!m || m === "cash" || m === "نقدي" || m === "نقد" || m === "كاش" || m === "نقدا") return "cash";
  if (m === "bank" || m === "بنكي" || m.includes("تحويل") || m.includes("بنك")) return "bank";
  if (m === "jawwal_pay" || m === "jawwalpay" || m === "jawwal" || m.includes("جوال")) return "jawwal_pay";
  if (m === "palpay" || m === "pal_pay" || m === "pal pay" || m.includes("بال باي") || m.includes("بال")) return "palpay";
  if (m === "card" || m === "visa" || m.includes("فيزا") || m.includes("بطاقة") || m.includes("شبكة")) return "card";
  return "cash";
}

export function normalizeSalePaymentMethod(methodRaw: unknown): string {
  const raw = String(methodRaw || "").trim();
  const m = raw.toLowerCase();
  if (!m || m === "cash" || m === "نقدي" || m === "نقد" || m === "كاش" || m === "نقدا") return "cash";
  if (m === "jawwal_pay" || m === "jawwalpay" || m === "jawwal" || m.includes("جوال")) return "jawwal_pay";
  if (m === "palpay" || m === "pal_pay" || m === "pal pay" || m.includes("بال")) return "palpay";
  if (m === "card" || m === "visa" || m.includes("فيزا") || m.includes("بطاقة")) return "card";
  if (m === "bank" || m === "بنكي" || m.includes("تحويل") || m.includes("بنك")) return "bank";
  if (m === "credit" || m === "credit_sale" || m === "آجل" || m === "اجل" || m === "ذمم" || m === "دين" || m === "على الحساب" || m.includes("آجل")) return "credit";
  if (m === "split" || m.includes("مجز") || m.includes("مختلط")) return "split";
  if (m === "debt_payment" || m === "سداد دين" || m === "سداد دَين" || m === "تسديد دين" || m === "سداد") return "debt_payment";
  if (m === "credit_adjustment") return "credit_adjustment";
  if (m === "free" || m === "مجاني") return "free";
  return m;
}

export function formatPaymentMethod(methodRaw: unknown, lang: "ar" | "en" = "ar") {
  const code = normalizeSalePaymentMethod(methodRaw) as PosPaymentChannelCode;
  const meta = POS_PAYMENT_CHANNELS[code];
  if (meta) {
    return {
      code: meta.code,
      label: lang === "en" ? meta.labelEn : meta.labelAr,
      labelAr: meta.labelAr,
      labelEn: meta.labelEn,
      emoji: meta.emoji,
      isCash: meta.isCash,
      requiresRef: meta.requiresRef,
    };
  }
  if (String(code) === "credit_adjustment") {
    return {
      code: "credit_adjustment",
      label: lang === "en" ? "Store Credit Refund" : "إيداع مرتجع لرصيد العميل",
      labelAr: "إيداع مرتجع لرصيد العميل",
      labelEn: "Store Credit Refund",
      emoji: "♻️",
      isCash: false,
      requiresRef: false,
    };
  }
  return {
    code: code || "cash",
    label: lang === "en" ? "Cash" : "نقدي (كاش)",
    labelAr: "نقدي (كاش)",
    labelEn: "Cash",
    emoji: "💵",
    isCash: true,
    requiresRef: false,
  };
}

export function extractPaymentsMap(sale: any): Record<string, any> | null {
  if (!sale) return null;
  const p1 = safeJson<any>(sale.payments, null);
  if (p1 && typeof p1 === "object" && !Array.isArray(p1)) return p1;
  const p2 = safeJson<any>(sale.splitPayments, null);
  if (p2 && typeof p2 === "object" && !Array.isArray(p2)) return p2;
  return null;
}

export function isDebtPaymentRecord(sale: any): boolean {
  if (!sale) return false;
  const st = String(sale.status || "").trim().toLowerCase();
  const tp = String(sale.type || "").trim().toLowerCase();
  const id = String(sale.id || "").trim().toUpperCase();
  const pm = normalizeSalePaymentMethod(sale.paymentMethod || sale.payment_method);
  return (
    st === "debt_payment" ||
    tp === "debt_payment" ||
    tp === "refund_credit" ||
    pm === "debt_payment" ||
    pm === "credit_adjustment" ||
    id.startsWith("PAY") ||
    id.startsWith("RET-CR") ||
    id.startsWith("DP-") ||
    id.startsWith("CPAY-") ||
    id.includes("-DP-")
  );
}

export function isRefundProxyRecord(sale: any): boolean {
  if (!sale) return false;
  const st = String(sale.status || "").trim().toLowerCase();
  const id = String(sale.id || "").trim().toUpperCase();
  return st === "refund_proxy" || id.startsWith("REF-");
}

export function isFullyRefundedSale(sale: any): boolean {
  if (!sale || isDebtPaymentRecord(sale) || isRefundProxyRecord(sale)) return false;
  const st = String(sale.status || "").trim().toLowerCase();
  return st === "refunded" || Boolean(sale.isRefunded || sale.is_refunded || sale.refunded);
}

export function isPartiallyRefundedSale(sale: any): boolean {
  if (!sale || isDebtPaymentRecord(sale) || isRefundProxyRecord(sale) || isFullyRefundedSale(sale)) return false;
  const st = String(sale.status || "").trim().toLowerCase();
  return (
    st === "partially_refunded" ||
    st === "partial_refund" ||
    (Number(sale.refundedAmount || 0) > 0 && Number(sale.total || 0) > 0)
  );
}

export function getSaleCreditAmount(sale: any): number {
  if (!sale || isDebtPaymentRecord(sale) || isRefundProxyRecord(sale) || isFullyRefundedSale(sale)) return 0;
  const pm = normalizeSalePaymentMethod(sale.paymentMethod || sale.payment_method);
  const paymentsMap = extractPaymentsMap(sale);
  if (pm === "credit") {
    return round2(Math.max(0, Number(sale.total) || 0));
  }
  if (paymentsMap && Number(paymentsMap.credit || 0) > 0) {
    return round2(Math.max(0, Number(paymentsMap.credit) || 0));
  }
  return 0;
}

export function isCreditSaleRecord(sale: any): boolean {
  if (!sale || isDebtPaymentRecord(sale) || isRefundProxyRecord(sale)) return false;
  const pm = normalizeSalePaymentMethod(sale.paymentMethod || sale.payment_method);
  const paymentsMap = extractPaymentsMap(sale);
  return pm === "credit" || (paymentsMap !== null && Number(paymentsMap.credit || 0) > 0);
}

export function isPaidSaleRecord(sale: any): boolean {
  return Boolean(sale && !isDebtPaymentRecord(sale) && !isRefundProxyRecord(sale) && !isCreditSaleRecord(sale));
}

export function classifySaleRecord(sale: any) {
  const debtPayment = isDebtPaymentRecord(sale);
  const refundProxy = isRefundProxyRecord(sale);
  const creditSale = isCreditSaleRecord(sale);
  const paidSale = Boolean(sale && !debtPayment && !refundProxy && !creditSale);
  return {
    isDebtPayment: debtPayment,
    isRefundProxy: refundProxy,
    isCreditSale: creditSale,
    isPaidSale: paidSale,
    isFullyRefunded: isFullyRefundedSale(sale),
    isPartiallyRefunded: isPartiallyRefundedSale(sale),
    creditAmount: getSaleCreditAmount(sale),
    paymentMethod: normalizeSalePaymentMethod(sale?.paymentMethod || sale?.payment_method),
    paymentsMap: extractPaymentsMap(sale),
  };
}

export function computeCustomerBalanceImpact({
  currentDebt = 0,
  actionType = "payment",
  amount = 0,
}: {
  currentDebt?: number;
  actionType?: "payment" | "credit_refund" | "debt_cancel" | "opening_credit" | "manual_debit" | "credit_sale" | "opening_debit";
  amount?: number;
} = {}) {
  const before = round2(Number(currentDebt) || 0);
  const amt = round2(Math.max(0, Number(amount) || 0));
  let delta = 0;
  if (actionType === "payment" || actionType === "credit_refund" || actionType === "debt_cancel" || actionType === "opening_credit") {
    delta = -amt;
  } else if (actionType === "manual_debit" || actionType === "credit_sale" || actionType === "opening_debit") {
    delta = amt;
  }
  const after = round2(before + delta);
  return {
    before,
    delta: round2(delta),
    after,
    isStoreCreditResult: after < -0.005,
  };
}

export function computeRefundSettlement({
  sale,
  itemsToRefund = [],
  mode = "partial",
  customerDebt = 0,
}: {
  sale: any;
  itemsToRefund?: any[];
  mode?: "full" | "partial";
  customerDebt?: number;
} = { sale: null }) {
  if (!sale) {
    return {
      refundAmount: 0,
      creditPart: 0,
      paidPart: 0,
      debtToCancel: 0,
      paidAmountToRefund: 0,
      hasCustomerSettlementChoice: false,
    };
  }
  const saleTotal = round2(Math.max(0, Number(sale.total) || 0));
  const saleItems = safeJson<any[]>(sale.items, []);
  const grossItemsTotal = saleItems.reduce((sum, it) => {
    const q = Math.max(0, Number(it.cartQty ?? it.qty ?? 1));
    const p = Math.max(0, Number(it.price ?? it.unitPrice ?? 0));
    return sum + q * p;
  }, 0);

  let rawRefund = 0;
  if (mode === "full") {
    rawRefund = saleTotal;
  } else {
    const rawItemsRefund = (Array.isArray(itemsToRefund) ? itemsToRefund : []).reduce((sum, it) => {
      const q = Math.max(0, Number(it.quantity ?? it.qty ?? 0));
      const matched = saleItems.find((si) => String(si.id) === String(it.id)) || it;
      const p = Math.max(0, Number(matched.price ?? matched.unitPrice ?? it.unitPrice ?? it.price ?? 0));
      return sum + q * p;
    }, 0);
    const ratio = grossItemsTotal > 0 ? saleTotal / grossItemsTotal : 1;
    rawRefund = round2(Math.min(saleTotal, rawItemsRefund * ratio));
  }

  const pm = normalizeSalePaymentMethod(sale.paymentMethod || sale.payment_method);
  const pMap = extractPaymentsMap(sale);
  const hasSplitCredit = pMap !== null && Number(pMap.credit || 0) > 0;
  const isCredit = pm === "credit" || hasSplitCredit;

  let creditPart = 0;
  let paidPart = saleTotal;
  if (hasSplitCredit) {
    creditPart = round2(Math.min(saleTotal, Math.max(0, Number(pMap!.credit) || 0)));
    paidPart = round2(Math.max(0, saleTotal - creditPart));
  } else if (isCredit) {
    const posDebt = Math.max(0, Number(customerDebt) || 0);
    if (posDebt < saleTotal) {
      paidPart = round2(Math.max(0, saleTotal - posDebt));
      creditPart = round2(Math.max(0, saleTotal - paidPart));
    } else {
      creditPart = saleTotal;
      paidPart = 0;
    }
  }

  const maxCancelable = round2(Math.min(rawRefund, creditPart, Math.max(0, Number(customerDebt) || 0)));
  const debtToCancel = isCredit ? maxCancelable : 0;
  const paidAmountToRefund = round2(Math.max(0, rawRefund - debtToCancel));
  const cust = safeJson<any>(sale.customer, null);
  const hasCustomer = Boolean(cust && cust.id);

  return {
    refundAmount: rawRefund,
    creditPart,
    paidPart,
    debtToCancel,
    paidAmountToRefund,
    hasCustomerSettlementChoice: Boolean(hasCustomer && paidAmountToRefund > 0.005),
  };
}

export function validateCustomerInput(input: any = {}, lang: "ar" | "en" = "ar") {
  const errors: string[] = [];
  const name = String(input.name || "").trim();
  if (!name) {
    errors.push(lang === "en" ? "Customer name is required" : "يرجى إدخال اسم العميل");
  }
  if (input.openingBalance !== undefined && input.openingBalance !== "" && input.openingBalance !== null) {
    const ob = Number(input.openingBalance);
    if (!Number.isFinite(ob) || ob < 0) {
      errors.push(lang === "en" ? "Opening balance must be zero or greater" : "الرصيد الافتتاحي يجب أن يكون صفراً أو أكبر");
    }
  }
  return { valid: errors.length === 0, errors, firstError: errors[0] || "" };
}

export function validateDebtVoucherInput(input: any = {}, lang: "ar" | "en" = "ar") {
  const errors: string[] = [];
  if (!input.customerId && !input.custId) {
    errors.push(lang === "en" ? "Please select a customer" : "يرجى اختيار العميل أولاً");
  }
  const amt = Number(input.amount ?? input.payment ?? 0);
  if (!Number.isFinite(amt) || amt <= 0) {
    errors.push(lang === "en" ? "Amount must be greater than zero" : "المبلغ يجب أن يكون أكبر من صفر");
  }
  const kind = String(input.kind || "payment").toLowerCase();
  if (kind !== "payment" && kind !== "manual_debit") {
    errors.push(lang === "en" ? "Unsupported voucher type" : "نوع السند غير مدعوم");
  }
  if (kind === "payment") {
    const m = normalizeVoucherPaymentMethod(input.paymentMethod || input.payment_method || "cash");
    if (!CUSTOMER_PAYMENT_METHODS[m]) {
      errors.push(lang === "en" ? "Unsupported payment method" : "طريقة الدفع غير مدعومة");
    }
  }
  return { valid: errors.length === 0, errors, firstError: errors[0] || "" };
}

export function computeCustomerStatementKpis(transactions: any[] = [], sales: any[] = [], customer: any = null) {
  const custId = String(customer?.id || "");
  const allSales = (Array.isArray(sales) ? sales : []).filter((s) => {
    if (!s || isDebtPaymentRecord(s) || isRefundProxyRecord(s)) return false;
    const c = safeJson<any>(s.customer, null);
    if (c && c.id) return String(c.id) === custId;
    return String(s.customer_id || "") === custId;
  });

  const paidSales = allSales.filter((s) => isPaidSaleRecord(s));
  const creditSales = allSales.filter((s) => isCreditSaleRecord(s));
  const txList = Array.isArray(transactions) ? transactions : [];

  const totalCashSales = round2(
    paidSales.reduce((sum, s) => (isFullyRefundedSale(s) ? sum : sum + (Number(s.total) || 0)), 0)
  );
  const totalCreditSales = round2(
    creditSales.reduce((sum, s) => (isFullyRefundedSale(s) ? sum : sum + getSaleCreditAmount(s)), 0)
  );
  const paymentRows = txList.filter((t) => t && (t.type === "payment" || t.type === "credit_refund"));
  const totalPayments = round2(
    paymentRows.reduce((sum, t) => sum + Math.max(0, Number(t.amount) || 0), 0)
  );

  const currentBalance = round2(Number(customer?.debt) || 0);
  return {
    currentBalance,
    isStoreCredit: currentBalance < -0.005,
    totalCashSales,
    totalCreditSales,
    totalPayments,
    cashSalesCount: paidSales.length,
    creditSalesCount: creditSales.length,
    paymentsCount: paymentRows.length,
    transactionsCount: txList.length,
  };
}

export function applyCustomerCommandOptimistically(snapshot: any = {}, command: CanonicalCustomerCommand = {} as any) {
  const customers = Array.isArray(snapshot.customers) ? snapshot.customers.map((c: any) => ({ ...c })) : [];
  const sales = Array.isArray(snapshot.sales) ? snapshot.sales.map((s: any) => ({ ...s })) : [];
  const customerTransactions = Array.isArray(snapshot.customerTransactions)
    ? snapshot.customerTransactions.map((t: any) => ({ ...t }))
    : [];

  const action = String(command.action || "").toUpperCase();
  const payload = command.payload || {};
  const targetId = command.targetId || payload.id || payload.customerId || null;
  const now = command.createdAt || payload.date || new Date().toISOString();
  const eventId = command.eventId || generateUuid();

  const findCustomer = (cid: any) => {
    if (!cid) return null;
    return customers.find((c: any) => String(c.id) === String(cid)) || null;
  };

  if (action === "ADD_PATIENT" || action === "ADD_CUSTOMER") {
    const custId = String(payload.id || targetId || generateClientId("CUST"));
    if (!customers.some((c: any) => String(c.id) === custId)) {
      const openingRaw = Math.max(0, round2(Number(payload.openingBalance) || 0));
      const openingType = payload.openingType === "credit" ? "opening_credit" : "opening_debit";
      const initDebt = openingRaw > 0 ? (openingType === "opening_credit" ? -openingRaw : openingRaw) : 0;
      customers.unshift({
        id: custId,
        name: String(payload.name || "").trim(),
        phone: String(payload.phone || "").trim(),
        address: String(payload.address || "").trim(),
        notes: String(payload.notes || "").trim(),
        branch_id: payload.branch_id || null,
        branchName: payload.branchName || "",
        debt: round2(initDebt),
        lastVisit: now.split("T")[0],
        isPending: true,
        eventId,
      });
      if (openingRaw > 0) {
        customerTransactions.unshift({
          id: `CTX-PENDING-${eventId}-OB`,
          customer_id: custId,
          type: "opening_balance",
          reference_id: custId,
          voucher_number: "",
          amount: openingRaw,
          balance_before: 0,
          balance_after: round2(initDebt),
          payment_method: "",
          branch_id: payload.branch_id || null,
          branch_name: payload.branchName || "",
          cashier_name: payload.cashierName || "",
          notes: openingType === "opening_credit" ? "رصيد افتتاحي دائن للعميل (قيد المزامنة)" : "رصيد افتتاحي مدين سابق (قيد المزامنة)",
          date: now,
          isPending: true,
          eventId,
        });
      }
    }
    return { customers, sales, customerTransactions };
  }

  if ((action === "UPDATE_PATIENT" || action === "UPDATE_CUSTOMER") && targetId) {
    const idx = customers.findIndex((c: any) => String(c.id) === String(targetId));
    if (idx >= 0) {
      const { debt: _ignoreDebt, ...safePatch } = payload;
      customers[idx] = { ...customers[idx], ...safePatch, isPending: true, eventId };
    }
    return { customers, sales, customerTransactions };
  }

  if ((action === "DELETE_PATIENT" || action === "DELETE_CUSTOMER") && targetId) {
    return {
      customers: customers.filter((c: any) => String(c.id) !== String(targetId)),
      sales,
      customerTransactions,
    };
  }

  if ((action === "PAY_DEBT" || action === "CREATE_DEBT_VOUCHER") && (targetId || payload.customerId)) {
    const cid = String(payload.customerId || targetId);
    const customer = findCustomer(cid);
    const amt = round2(Math.max(0, Number(payload.amount ?? payload.payment ?? 0)));
    if (customer && amt > 0) {
      const before = round2(Number(customer.debt) || 0);
      const after = round2(before - amt);
      customer.debt = after;
      customer.lastVisit = now.split("T")[0];
      customer.isPending = true;
      const method = normalizeVoucherPaymentMethod(payload.paymentMethod || payload.payment_method || "cash");
      const paymentId = String(payload.id || payload.paymentId || generateClientId("CPAY"));
      const bName = payload.branchName || customer.branchName || "الفرع الرئيسي";
      const cashier = payload.cashierName || "غير محدد";
      const eRef = String(payload.electronicRef || payload.refNumber || "");

      if (!sales.some((s: any) => String(s.id) === paymentId)) {
        sales.unshift({
          id: paymentId,
          items: [],
          total: amt,
          paymentMethod: method,
          status: "debt_payment",
          electronicRef: eRef,
          paymentStatus: "completed",
          customer: { id: customer.id, name: customer.name, phone: customer.phone || "" },
          date: now,
          cashierName: cashier,
          branchName: bName,
          branch_id: payload.branch_id || customer.branch_id || null,
          debtBefore: before,
          debtAfter: after,
          isPending: true,
          eventId,
        });
      }
      customerTransactions.unshift({
        id: `CTX-PENDING-${eventId}-PAY`,
        customer_id: cid,
        type: "payment",
        reference_id: paymentId,
        voucher_number: payload.voucher_number || "",
        amount: amt,
        balance_before: before,
        balance_after: after,
        payment_method: method,
        electronic_ref: eRef,
        branch_id: payload.branch_id || customer.branch_id || null,
        branch_name: bName,
        cashier_name: cashier,
        notes: after < -0.005 ? "سند قبض وإيداع رصيد دائن (قيد المزامنة)" : "سند قبض وسداد دين (قيد المزامنة)",
        date: now,
        isPending: true,
        eventId,
      });
    }
    return { customers, sales, customerTransactions };
  }

  if ((action === "ADD_CUSTOMER_DEBT" || action === "CREATE_CUSTOMER_DEBT") && (targetId || payload.customerId)) {
    const cid = String(payload.customerId || targetId);
    const customer = findCustomer(cid);
    const amt = round2(Math.max(0, Number(payload.amount ?? 0)));
    if (customer && amt > 0) {
      const before = round2(Number(customer.debt) || 0);
      const after = round2(before + amt);
      customer.debt = after;
      customer.lastVisit = now.split("T")[0];
      customer.isPending = true;
      const refId = String(payload.id || generateClientId("CDEB"));
      customerTransactions.unshift({
        id: `CTX-PENDING-${eventId}-DEB`,
        customer_id: cid,
        type: "manual_debit",
        reference_id: refId,
        voucher_number: payload.voucher_number || "",
        amount: amt,
        balance_before: before,
        balance_after: after,
        payment_method: "credit",
        electronic_ref: "",
        branch_id: payload.branch_id || customer.branch_id || null,
        branch_name: payload.branchName || customer.branchName || "الفرع الرئيسي",
        cashier_name: payload.cashierName || "غير محدد",
        notes: String(payload.notes || "تسجيل دين يدوي مباشر (قيد المزامنة)"),
        date: now,
        isPending: true,
        eventId,
      });
    }
    return { customers, sales, customerTransactions };
  }

  if (action === "CHECKOUT") {
    const custRef = safeJson<any>(payload.customer, null);
    if (custRef?.id) {
      const customer = findCustomer(custRef.id);
      const debtAdded = getSaleCreditAmount(payload);
      if (customer) {
        const before = round2(Number(customer.debt) || 0);
        const after = round2(before + debtAdded);
        customer.debt = after;
        customer.lastVisit = now.split("T")[0];
        if (debtAdded > 0) {
          customerTransactions.unshift({
            id: `CTX-PENDING-${eventId}-SALE`,
            customer_id: customer.id,
            type: "credit_sale",
            reference_id: String(payload.id || ""),
            voucher_number: "",
            amount: debtAdded,
            balance_before: before,
            balance_after: after,
            payment_method: normalizeSalePaymentMethod(payload.paymentMethod || "credit"),
            electronic_ref: String(payload.electronicRef || ""),
            branch_id: payload.branch_id || customer.branch_id || null,
            branch_name: payload.branchName || "",
            cashier_name: payload.cashierName || "",
            notes: `فاتورة مبيعات آجل #${payload.id || ""} (قيد المزامنة)`,
            date: now,
            isPending: true,
            eventId,
          });
        }
      }
    }
    return { customers, sales, customerTransactions };
  }

  if (action === "REFUND_PARTIAL" || action === "REFUND_FULL") {
    const saleId = String(targetId || payload.saleId || "");
    const origSale = sales.find((s: any) => String(s.id) === saleId);
    const opts = payload.refundOptions || {};
    const cid = origSale?.customer?.id || opts.customerId;
    if (cid) {
      const customer = findCustomer(cid);
      const cancelAmt = round2(Math.max(0, Number(opts.debtToCancel) || 0));
      const paidRefund = round2(Math.max(0, Number(opts.paidAmountToRefund) || 0));
      const isCreditBal = opts.returnPaidMode === "credit_balance";
      const totalReduction = round2(cancelAmt + (isCreditBal ? paidRefund : 0));
      if (customer && totalReduction > 0) {
        const before = round2(Number(customer.debt) || 0);
        const after = round2(before - totalReduction);
        customer.debt = after;
        if (cancelAmt > 0) {
          customerTransactions.unshift({
            id: `CTX-PENDING-${eventId}-CAN`,
            customer_id: cid,
            type: "debt_cancel",
            reference_id: saleId,
            amount: cancelAmt,
            balance_before: before,
            balance_after: round2(before - cancelAmt),
            payment_method: "credit",
            branch_name: opts.branchName || "",
            cashier_name: opts.cashierName || "",
            notes: `إلغاء دين لمرتجع فاتورة #${saleId}`,
            date: now,
            isPending: true,
            eventId,
          });
        }
        if (isCreditBal && paidRefund > 0) {
          const prevBal = round2(before - cancelAmt);
          customerTransactions.unshift({
            id: `CTX-PENDING-${eventId}-RETCR`,
            customer_id: cid,
            type: "credit_refund",
            reference_id: `RET-CR-${eventId}`,
            amount: paidRefund,
            balance_before: prevBal,
            balance_after: after,
            payment_method: "credit_adjustment",
            branch_name: opts.branchName || "",
            cashier_name: opts.cashierName || "",
            notes: `إيداع مرتجع لرصيد العميل #${saleId}`,
            date: now,
            isPending: true,
            eventId,
          });
        }
      }
    }
    return { customers, sales, customerTransactions };
  }

  return { customers, sales, customerTransactions };
}

export function projectCustomerStatement({
  baseStatement = null,
  customerId = "",
  customer = null,
  sales = [],
  customerTransactions = [],
  pendingCommands = [],
  branches = [],
  lang = "ar",
}: {
  baseStatement?: any;
  customerId?: string;
  customer?: any;
  sales?: any[];
  customerTransactions?: any[];
  pendingCommands?: any[];
  branches?: any[];
  lang?: "ar" | "en";
} = {}) {
  const baseCust = baseStatement?.customer || customer || { id: customerId, debt: 0 };
  const baseRows = Array.isArray(baseStatement?.transactions)
    ? baseStatement.transactions
    : (Array.isArray(customerTransactions) ? customerTransactions : []).filter(
        (t) => String(t.customer_id) === String(customerId)
      );
  const baseSales = Array.isArray(baseStatement?.sales) ? baseStatement.sales : sales || [];

  const relevantCmds = (Array.isArray(pendingCommands) ? pendingCommands : []).filter((cmd) => {
    const p = cmd?.payload || {};
    const act = String(cmd?.action || "").toUpperCase();
    const cmdCust =
      p.customerId ||
      p.customer_id ||
      p.customer?.id ||
      (["ADD_PATIENT", "ADD_CUSTOMER", "PAY_DEBT", "CREATE_DEBT_VOUCHER", "ADD_CUSTOMER_DEBT", "CREATE_CUSTOMER_DEBT", "UPDATE_PATIENT", "UPDATE_CUSTOMER"].includes(act)
        ? (cmd?.targetId || p.id)
        : null);
    if (cmdCust && String(cmdCust) === String(customerId)) return true;
    if (act === "REFUND_PARTIAL" || act === "REFUND_FULL") {
      if (p.refundOptions?.customerId && String(p.refundOptions.customerId) === String(customerId)) return true;
      const s = baseSales.find((x: any) => String(x.id) === String(cmd.targetId || p.saleId));
      return s && String(s.customer?.id || s.customer_id || "") === String(customerId);
    }
    return false;
  });

  const hasPendingCreate =
    !baseStatement &&
    relevantCmds.some(
      (cmd) =>
        ["ADD_PATIENT", "ADD_CUSTOMER"].includes(String(cmd?.action || "").toUpperCase()) &&
        String(cmd?.payload?.id || cmd?.targetId || "") === String(customerId) &&
        !baseRows.some((r: any) => cmd.eventId && r.eventId === cmd.eventId)
    );

  let working: { customers: any[]; sales: any[]; customerTransactions: any[] } = {
    customers: hasPendingCreate ? [] : [{ ...baseCust }],
    sales: [...baseSales],
    customerTransactions: [...baseRows],
  };

  for (const cmd of relevantCmds) {
    const alreadySynced = baseRows.some(
      (r: any) =>
        (cmd.eventId && r.eventId === cmd.eventId) ||
        (cmd.payload?.id && String(r.reference_id) === String(cmd.payload.id))
    );
    if (!alreadySynced) {
      working = applyCustomerCommandOptimistically(working, cmd);
    }
  }

  const resolvedCust = working.customers.find((c) => String(c.id) === String(customerId)) || baseCust;
  const rows = working.customerTransactions
    .filter((t) => String(t.customer_id) === String(customerId))
    .map((row) => ({
      ...row,
      branch_name: row.branch_name || row.branchName || resolveBranchName(row.branch_id, branches, lang),
      paymentMethodLabel: row.paymentMethodLabel || (row.payment_method ? formatPaymentMethod(row.payment_method, lang).label : ""),
    }))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id)));

  const kpis = computeCustomerStatementKpis(rows, working.sales, resolvedCust);
  return {
    customer: resolvedCust,
    kpis,
    transactions: rows,
    sales: working.sales,
  };
}
