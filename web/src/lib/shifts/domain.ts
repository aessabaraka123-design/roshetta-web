/**
 * Roshetta Pure Shifts & Cash Drawer Domain Engine
 * Isomorphic: Shared across Web (Next.js), Mobile (React Native), and Node.js Server.
 * 100% deterministic, zero side-effects, unit-testable.
 */

export interface DenominationCounts {
  n200?: number; // 200 ₪
  n100?: number; // 100 ₪
  n50?: number;  // 50 ₪
  n20?: number;  // 20 ₪
  c10?: number;  // 10 ₪
  c5?: number;   // 5 ₪
  c2?: number;   // 2 ₪
  c1?: number;   // 1 ₪
  c05?: number;  // 0.5 ₪
}

export const DENOMINATION_VALUES: Record<keyof DenominationCounts, number> = {
  n200: 200,
  n100: 100,
  n50: 50,
  n20: 20,
  c10: 10,
  c5: 5,
  c2: 2,
  c1: 1,
  c05: 0.5,
};

export const DENOMINATION_LABELS_AR: Record<keyof DenominationCounts, string> = {
  n200: "200 ₪ (ورقة)",
  n100: "100 ₪ (ورقة)",
  n50: "50 ₪ (ورقة)",
  n20: "20 ₪ (ورقة)",
  c10: "10 ₪ (معدن)",
  c5: "5 ₪ (معدن)",
  c2: "2 ₪ (معدن)",
  c1: "1 ₪ (معدن)",
  c05: "0.5 ₪ (نصف شيكل)",
};

export const DENOMINATION_LABELS_EN: Record<keyof DenominationCounts, string> = {
  n200: "200 ₪ Note",
  n100: "100 ₪ Note",
  n50: "50 ₪ Note",
  n20: "20 ₪ Note",
  c10: "10 ₪ Coin",
  c5: "5 ₪ Coin",
  c2: "2 ₪ Coin",
  c1: "1 ₪ Coin",
  c05: "0.5 ₪ Coin",
};

/**
 * Calculate total cash amount from physical currency denomination counts.
 */
export function calculateDenominationsTotal(counts: DenominationCounts = {}): number {
  let total = 0;
  for (const [key, value] of Object.entries(counts)) {
    const denom = DENOMINATION_VALUES[key as keyof DenominationCounts] || 0;
    const qty = Math.max(0, Number(value) || 0);
    total += denom * qty;
  }
  return round2(total);
}

/**
 * Standard 2-decimal rounding for currency operations
 */
export function round2(num: number): number {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Canonical payment method normalizer
 */
export function normalizePaymentChannel(method: string = ""): string {
  const m = String(method || "").trim().toLowerCase();
  if (m === "cash" || m === "نقدي" || m === "كاش" || m === "debt_payment") return "cash";
  if (m === "card" || m === "visa" || m === "mastercard" || m === "بطاقة" || m === "فيزا") return "card";
  if (m === "jawwal_pay" || m === "jawwal" || m === "جوال باي" || m === "جوال") return "jawwal_pay";
  if (m === "palpay" || m === "بال باي") return "palpay";
  if (m === "bank" || m === "تحويل بنكي" || m === "شيك" || m === "بنك") return "bank";
  if (m === "credit" || m === "ذمم" || m === "آجل" || m === "دين") return "credit";
  if (m === "split" || m === "متعدد") return "split";
  if (m === "credit_adjustment") return "credit_adjustment";
  return "other";
}

export interface ShiftCalculationInput {
  openingAmount: number;
  sales: any[];
  expenses: any[];
  debtPayments?: any[];
  shiftCashierName?: string;
  shiftCashierEmail?: string;
  shiftBranchId?: string;
  shiftBranchName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
}

export interface ShiftChannelBreakdown {
  cash: number;
  card: number;
  jawwal_pay: number;
  palpay: number;
  bank: number;
  credit: number;
  digital: number;
  totalSales: number;
  salesCount: number;
  refundsCount: number;
}

export interface ShiftExpenseBreakdown {
  cashExpenses: number;
  nonCashExpenses: number;
  totalExpenses: number;
  expensesCount: number;
}

export interface ShiftReconciliationResult {
  openingAmount: number;
  cashSales: number;
  cardSales: number;
  jawwalSales: number;
  palpaySales: number;
  bankSales: number;
  creditSales: number;
  digitalSales: number;
  totalSales: number;
  cashDebtPayments: number;
  cashExpenses: number;
  nonCashExpenses: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  salesCount: number;
}

/**
 * Pure calculation of live sales and tenders during a shift.
 */
export function computeShiftSales(
  sales: any[] = [],
  filter: {
    cashierName?: string;
    branchId?: string;
    branchName?: string;
    startTime?: string;
    endTime?: string;
  } = {}
): ShiftChannelBreakdown {
  let cash = 0;
  let card = 0;
  let jawwal_pay = 0;
  let palpay = 0;
  let bank = 0;
  let credit = 0;
  let salesCount = 0;
  let refundsCount = 0;

  const start = filter.startTime ? new Date(filter.startTime).getTime() : 0;
  const end = filter.endTime ? new Date(filter.endTime).getTime() : Infinity;
  const cashierNorm = (filter.cashierName || "").trim().toLowerCase();

  for (const s of sales) {
    if (!s) continue;
    if (s.status === "refunded" || s.paymentStatus === "failed") continue;

    // Filter by branch
    if (filter.branchId && s.branch_id && s.branch_id !== filter.branchId) continue;
    if (!filter.branchId && filter.branchName && s.branchName && s.branchName !== filter.branchName) continue;

    // Filter by date
    const sDateStr = s.date || s.created_at || s.createdAt || "";
    if (sDateStr) {
      const sTime = new Date(sDateStr).getTime();
      if (sTime < start || sTime > end) continue;
    }

    // Filter by cashier name if provided
    if (cashierNorm) {
      const sCashier = (s.cashierName || s.cashier_name || s.created_by || "").trim().toLowerCase();
      if (sCashier && sCashier !== cashierNorm) continue;
    }

    const sTotal = Number(s.total) || 0;
    const rawPm = normalizePaymentChannel(s.paymentMethod);

    let settlement: any = {};
    try {
      settlement = typeof s.notes === "string" ? JSON.parse(s.notes) : (s.notes || {});
    } catch {
      settlement = {};
    }

    const sameOriginalShift = Boolean(
      settlement.originalDate &&
      new Date(settlement.originalDate).getTime() >= start &&
      new Date(settlement.originalDate).getTime() <= end &&
      (!cashierNorm || (settlement.originalCashier || "").trim().toLowerCase() === cashierNorm)
    );

    // Handle customer credit adjustments
    if (rawPm === "credit_adjustment" && settlement.returnPaidMode === "credit_balance") {
      if (sameOriginalShift && Number(settlement.reflectedPaid) > 0) {
        const parts = settlement.originalPaidParts || {};
        const sum = Object.values(parts).reduce((tot: number, val: any) => tot + Number(val || 0), 0);
        for (const [k, v] of Object.entries(parts)) {
          const ch = normalizePaymentChannel(k);
          const add = sum > 0 ? (Number(settlement.reflectedPaid) * Number(v || 0)) / sum : 0;
          if (ch === "cash") cash += add;
          else if (ch === "card") card += add;
          else if (ch === "jawwal_pay") jawwal_pay += add;
          else if (ch === "palpay") palpay += add;
          else if (ch === "bank") bank += add;
          else if (ch === "credit") credit += add;
        }
      }
      continue;
    }

    let proxyScale = 1;
    if (s.status === "refund_proxy") {
      refundsCount++;
      if (sameOriginalShift) {
        if (settlement.returnPaidMode === "cash_out") {
          proxyScale = Math.max(0, (Math.abs(sTotal) - Number(settlement.reflectedPaid || 0)) / Math.abs(sTotal || 1));
        } else {
          continue;
        }
      }
    } else {
      salesCount++;
    }

    const addAmount = (ch: string, val: number) => {
      const amt = val * proxyScale;
      if (ch === "cash") cash += amt;
      else if (ch === "card") card += amt;
      else if (ch === "jawwal_pay") jawwal_pay += amt;
      else if (ch === "palpay") palpay += amt;
      else if (ch === "bank") bank += amt;
      else if (ch === "credit") credit += amt;
    };

    if (rawPm === "split" && s.payments) {
      let pObj: any = {};
      try {
        pObj = typeof s.payments === "string" ? JSON.parse(s.payments) : s.payments;
      } catch {
        pObj = {};
      }
      for (const [key, value] of Object.entries(pObj || {})) {
        addAmount(normalizePaymentChannel(key), Number(value) || 0);
      }
    } else {
      addAmount(rawPm, sTotal);
    }
  }

  const digital = round2(card + jawwal_pay + palpay + bank);
  const totalSales = round2(cash + digital + credit);

  return {
    cash: round2(cash),
    card: round2(card),
    jawwal_pay: round2(jawwal_pay),
    palpay: round2(palpay),
    bank: round2(bank),
    credit: round2(credit),
    digital,
    totalSales,
    salesCount,
    refundsCount,
  };
}

/**
 * Pure calculation of expenses during a shift.
 * Separates cash drawer outlays from non-cash shrinkages/losses.
 */
export function computeShiftExpenses(
  expenses: any[] = [],
  filter: {
    branchId?: string;
    branchName?: string;
    startTime?: string;
    endTime?: string;
  } = {}
): ShiftExpenseBreakdown {
  let cashExpenses = 0;
  let nonCashExpenses = 0;
  let expensesCount = 0;

  const start = filter.startTime ? new Date(filter.startTime).getTime() : 0;
  const end = filter.endTime ? new Date(filter.endTime).getTime() : Infinity;

  for (const e of expenses) {
    if (!e) continue;
    if (filter.branchId && e.branch_id && e.branch_id !== filter.branchId) continue;

    const eDateStr = e.date || e.created_at || e.createdAt || "";
    if (eDateStr) {
      const eTime = new Date(eDateStr).getTime();
      if (eTime < start || eTime > end) continue;
    }

    const cat = String(e.category || "").trim();
    const desc = String(e.description || "").trim();
    const creator = String(e.created_by || "").trim();

    // Isolate non-cash shrinkages & damages from drawer cash deductions
    const isNonCashLoss =
      cat === "هدر وتلفيات" ||
      desc.includes("عجز جرد") ||
      desc.includes("توالف") ||
      (creator === "System" && cat !== "سداد موردين");

    if (isNonCashLoss) {
      nonCashExpenses += Number(e.amount) || 0;
      continue;
    }

    expensesCount++;
    const eAmt = Number(e.amount) || 0;
    const pm = normalizePaymentChannel(e.paymentMethod || "cash");
    if (pm === "cash") {
      cashExpenses += eAmt;
    } else {
      nonCashExpenses += eAmt;
    }
  }

  return {
    cashExpenses: round2(cashExpenses),
    nonCashExpenses: round2(nonCashExpenses),
    totalExpenses: round2(cashExpenses + nonCashExpenses),
    expensesCount,
  };
}

/**
 * Complete Shift Reconciliation & Expected Cash Calculator
 */
export function reconcileShift(input: ShiftCalculationInput): ShiftReconciliationResult {
  const salesSummary = computeShiftSales(input.sales, {
    cashierName: input.shiftCashierName,
    branchId: input.shiftBranchId,
    branchName: input.shiftBranchName,
    startTime: input.shiftStartTime,
    endTime: input.shiftEndTime,
  });

  const expenseSummary = computeShiftExpenses(input.expenses, {
    branchId: input.shiftBranchId,
    branchName: input.shiftBranchName,
    startTime: input.shiftStartTime,
    endTime: input.shiftEndTime,
  });

  const opening = round2(input.openingAmount || 0);
  const cashDebt = round2(
    (input.debtPayments || []).reduce((acc, p) => {
      if (!p) return acc;
      const pm = normalizePaymentChannel(p.paymentMethod || p.method || "cash");
      return pm === "cash" ? acc + (Number(p.amount) || 0) : acc;
    }, 0)
  );

  // Expected Cash = Opening Float + Cash Sales + Cash Debt Payments - Cash Drawer Expenses
  const expectedDrawerCash = round2(opening + salesSummary.cash + cashDebt - expenseSummary.cashExpenses);

  return {
    openingAmount: opening,
    cashSales: salesSummary.cash,
    cardSales: salesSummary.card,
    jawwalSales: salesSummary.jawwal_pay,
    palpaySales: salesSummary.palpay,
    bankSales: salesSummary.bank,
    creditSales: salesSummary.credit,
    digitalSales: salesSummary.digital,
    totalSales: salesSummary.totalSales,
    cashDebtPayments: cashDebt,
    cashExpenses: expenseSummary.cashExpenses,
    nonCashExpenses: expenseSummary.nonCashExpenses,
    totalExpenses: expenseSummary.totalExpenses,
    expectedDrawerCash,
    salesCount: salesSummary.salesCount,
  };
}

/**
 * Evaluate discrepancy between actual counted cash and expected book cash.
 */
export function evaluateDiscrepancy(actualCash: number, expectedCash: number): {
  difference: number;
  status: "balanced" | "surplus" | "shortage";
  statusTextAr: string;
  statusTextEn: string;
  badgeColor: string;
} {
  const actual = round2(actualCash || 0);
  const expected = round2(expectedCash || 0);
  const diff = round2(actual - expected);

  if (Math.abs(diff) <= 0.05) {
    return {
      difference: 0,
      status: "balanced",
      statusTextAr: "مطابق تماماً ✓",
      statusTextEn: "Exact Match ✓",
      badgeColor: "#10B981", // Emerald
    };
  }

  if (diff > 0.05) {
    return {
      difference: diff,
      status: "surplus",
      statusTextAr: `فائض +${diff.toFixed(2)} ₪`,
      statusTextEn: `Surplus +${diff.toFixed(2)} ₪`,
      badgeColor: "#3B82F6", // Blue
    };
  }

  return {
    difference: diff,
    status: "shortage",
    statusTextAr: `عجز -${Math.abs(diff).toFixed(2)} ₪`,
    statusTextEn: `Shortage -${Math.abs(diff).toFixed(2)} ₪`,
    badgeColor: "#EF4444", // Red
  };
}

/**
 * Generate formatted 80mm / 58mm thermal receipt text
 */
export function buildShiftThermalReceipt(shift: any, pharmacyName: string = "صيدلية روشيتة"): string {
  const opening = round2(shift.opening_amount || 0);
  const closing = round2(shift.closing_amount || 0);
  const expected = round2(shift.expected_amount || 0);
  const diff = round2(closing - expected);
  const disc = evaluateDiscrepancy(closing, expected);

  const divider = "------------------------------------------";
  const doubleDivider = "==========================================";

  return [
    `          ${pharmacyName}          `,
    `       تقرير إغلاق الوردية وتسوية الصندوق       `,
    doubleDivider,
    `رقم الوردية: #${String(shift.id || "").substring(0, 8)}`,
    `الكاشير: ${shift.cashier_name || "كاشير"}`,
    `الفرع: ${shift.branch_name || "الفرع الرئيسي"}`,
    `وقت الفتح: ${shift.open_time ? new Date(shift.open_time).toLocaleString("ar-EG") : "-"}`,
    `وقت الإغلاق: ${shift.close_time ? new Date(shift.close_time).toLocaleString("ar-EG") : "-"}`,
    divider,
    `البيان المالي                    المبلغ (₪)`,
    divider,
    `عهدة البداية (الافتتاحي):        ${opening.toFixed(2)} ₪`,
    `مبيعات الكاش المحصلة (+):        ${round2(shift.cash_sales || 0).toFixed(2)} ₪`,
    `مصروفات الدرج النقدية (-):       ${round2(shift.cash_expenses || shift.expenses_total || 0).toFixed(2)} ₪`,
    divider,
    `المتوقع وجوده بالصندوق:          ${expected.toFixed(2)} ₪`,
    `المبلغ الفعلي المعدود:           ${closing.toFixed(2)} ₪`,
    divider,
    `حالة المطابقة:                   ${disc.statusTextAr}`,
    divider,
    `المبيعات الإلكترونية والذمم (خارج الدرج):`,
    `- بطاقة بنكية (Visa/POS):        ${round2(shift.card_sales || 0).toFixed(2)} ₪`,
    `- جوال باي (Jawwal Pay):         ${round2(shift.jawwal_sales || 0).toFixed(2)} ₪`,
    `- بال باي (PalPay):              ${round2(shift.palpay_sales || 0).toFixed(2)} ₪`,
    `- تحويل بنكي:                    ${round2(shift.bank_sales || 0).toFixed(2)} ₪`,
    `- مبيعات بالذمة (آجل):           ${round2(shift.credit_sales || 0).toFixed(2)} ₪`,
    doubleDivider,
    `إجمالي المبيعات الشاملة:         ${round2(shift.total_sales || (shift.cash_sales + shift.digital_sales + shift.credit_sales) || 0).toFixed(2)} ₪`,
    doubleDivider,
    shift.notes ? `ملاحظات: ${shift.notes}` : "",
    "",
    "توقيع الكاشير: ____________________________",
    "",
    "توقيع المشرف / المدير: ___________________",
    "",
    `تمت الطباعة: ${new Date().toLocaleString("ar-EG")}`,
    "نظام روشتة لإدارة الصيدليات - السجل المالي المعتمد",
  ].filter(Boolean).join("\n");
}
