/**
 * web/src/lib/expenses/domain.ts
 * Pure Isomorphic Expenses Domain for Roshetta.
 * Shared business logic, category taxonomies, account segregation, KPI calculation,
 * and voucher formatting for Web, Mobile, and Backend.
 */

export interface ExpenseRecord {
  id: string;
  pharmacy_id?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_by?: string;
  branch_id?: string | null;
  branch?: string;
  branch_name?: string;
  paymentMethod?: string;
  payment_method?: string;
  supplier_id?: string;
  supplier_name?: string;
  reference_id?: string;
  account_type?: "opex" | "supplier_settlement" | "petty_cash" | "capex";
  notes?: string;
  voucher_no?: string;
}

export interface ExpenseCategoryDef {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
  isProtected?: boolean;
  accountType: "opex" | "supplier_settlement" | "capex";
}

export const CANONICAL_CATEGORIES: ExpenseCategoryDef[] = [
  {
    id: "salaries",
    key: "رواتب",
    labelAr: "رواتب وأجور",
    labelEn: "Salaries & Wages",
    color: "#2563EB",
    bgColor: "bg-blue-50 text-blue-700 border-blue-200",
    textColor: "text-blue-700",
    icon: "👥",
    accountType: "opex",
  },
  {
    id: "rent",
    key: "إيجار",
    labelAr: "إيجار العقار",
    labelEn: "Rent",
    color: "#DC2626",
    bgColor: "bg-red-50 text-red-700 border-red-200",
    textColor: "text-red-700",
    icon: "🏢",
    accountType: "opex",
  },
  {
    id: "electricity",
    key: "كهرباء",
    labelAr: "كهرباء وطاقة",
    labelEn: "Electricity & Power",
    color: "#D97706",
    bgColor: "bg-amber-50 text-amber-700 border-amber-200",
    textColor: "text-amber-700",
    icon: "⚡",
    accountType: "opex",
  },
  {
    id: "water",
    key: "ماء",
    labelAr: "مياه ومرافق",
    labelEn: "Water & Utilities",
    color: "#0284C7",
    bgColor: "bg-sky-50 text-sky-700 border-sky-200",
    textColor: "text-sky-700",
    icon: "💧",
    accountType: "opex",
  },
  {
    id: "maintenance",
    key: "صيانة",
    labelAr: "صيانة وتجهيزات",
    labelEn: "Maintenance & Repairs",
    color: "#EA580C",
    bgColor: "bg-orange-50 text-orange-700 border-orange-200",
    textColor: "text-orange-700",
    icon: "🔧",
    accountType: "opex",
  },
  {
    id: "hospitality",
    key: "ضيافة",
    labelAr: "ضيافة ونثريات",
    labelEn: "Hospitality & Petty Cash",
    color: "#9333EA",
    bgColor: "bg-purple-50 text-purple-700 border-purple-200",
    textColor: "text-purple-700",
    icon: "☕",
    accountType: "opex",
  },
  {
    id: "cleaning",
    key: "مواد تنظيف",
    labelAr: "مواد نظافة واستهلاك",
    labelEn: "Cleaning & Supplies",
    color: "#059669",
    bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    textColor: "text-emerald-700",
    icon: "🧹",
    accountType: "opex",
  },
  {
    id: "marketing",
    key: "تسويق",
    labelAr: "تسويق وإعلانات",
    labelEn: "Marketing & Ads",
    color: "#DB2777",
    bgColor: "bg-pink-50 text-pink-700 border-pink-200",
    textColor: "text-pink-700",
    icon: "📢",
    accountType: "opex",
  },
  {
    id: "governmental",
    key: "رسوم وتراخيص",
    labelAr: "رسوم وتراخيص حكومية",
    labelEn: "Gov Fees & Licensing",
    color: "#475569",
    bgColor: "bg-slate-100 text-slate-700 border-slate-300",
    textColor: "text-slate-700",
    icon: "📜",
    accountType: "opex",
  },
  {
    id: "transport",
    key: "مواصلات وشحن",
    labelAr: "مواصلات وشحن",
    labelEn: "Transport & Shipping",
    color: "#0D9488",
    bgColor: "bg-teal-50 text-teal-700 border-teal-200",
    textColor: "text-teal-700",
    icon: "🚚",
    accountType: "opex",
  },
  {
    id: "supplier_payment",
    key: "سداد موردين",
    labelAr: "سداد دفعات الموردين (AP)",
    labelEn: "Supplier Payment (AP)",
    color: "#0369A1",
    bgColor: "bg-blue-100 text-blue-800 border-blue-300",
    textColor: "text-blue-800",
    icon: "📦",
    isProtected: true,
    accountType: "supplier_settlement",
  },
  {
    id: "other",
    key: "أخرى",
    labelAr: "مصروفات عامة أخرى",
    labelEn: "Other General Expenses",
    color: "#64748B",
    bgColor: "bg-gray-100 text-gray-700 border-gray-200",
    textColor: "text-gray-700",
    icon: "📝",
    accountType: "opex",
  },
];

export interface PaymentMethodDef {
  id: string;
  labelAr: string;
  labelEn: string;
  isDrawerCash: boolean; // Affects cashier cash drawer during shifts
  color: string;
}

export const EXPENSE_PAYMENT_METHODS: PaymentMethodDef[] = [
  {
    id: "cash",
    labelAr: "نقدي (من درج الكاشير)",
    labelEn: "Drawer Cash",
    isDrawerCash: true,
    color: "#059669",
  },
  {
    id: "bank",
    labelAr: "تحويل بنكي / شيك",
    labelEn: "Bank Transfer",
    isDrawerCash: false,
    color: "#0284C7",
  },
  {
    id: "card",
    labelAr: "بطاقة بنكية / فيزا",
    labelEn: "Credit / Debit Card",
    isDrawerCash: false,
    color: "#7C3AED",
  },
  {
    id: "jawwal_pay",
    labelAr: "محفظة جوال باي (Jawwal Pay)",
    labelEn: "Jawwal Pay",
    isDrawerCash: false,
    color: "#D97706",
  },
  {
    id: "palpay",
    labelAr: "محفظة بال باي (PalPay)",
    labelEn: "PalPay",
    isDrawerCash: false,
    color: "#D97706",
  },
];

export function normalizeExpenseCategory(catString: string | undefined | null): ExpenseCategoryDef {
  if (!catString) return CANONICAL_CATEGORIES.find((c) => c.id === "other")!;
  const s = String(catString).trim().toLowerCase();

  const direct = CANONICAL_CATEGORIES.find(
    (c) => c.id.toLowerCase() === s || c.key.toLowerCase() === s || c.labelAr.toLowerCase() === s || c.labelEn.toLowerCase() === s
  );
  if (direct) return direct;

  if (s.includes("راتب") || s.includes("رواتب") || s.includes("أجور") || s.includes("salary") || s.includes("wage")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "salaries")!;
  }
  if (s.includes("إيجار") || s.includes("ايجار") || s.includes("rent")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "rent")!;
  }
  if (s.includes("كهرب") || s.includes("طاقة") || s.includes("electric") || s.includes("power")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "electricity")!;
  }
  if (s.includes("ماء") || s.includes("مياه") || s.includes("water") || s.includes("مرفق")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "water")!;
  }
  if (s.includes("صيان") || s.includes("تصليح") || s.includes("maint")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "maintenance")!;
  }
  if (s.includes("ضياف") || s.includes("نثر") || s.includes("بوفيه") || s.includes("شاي") || s.includes("قهوة") || s.includes("sundr")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "hospitality")!;
  }
  if (s.includes("نظاف") || s.includes("تنظيف") || s.includes("clean")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "cleaning")!;
  }
  if (s.includes("تسويق") || s.includes("إعلان") || s.includes("اعلان") || s.includes("market") || s.includes("ad")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "marketing")!;
  }
  if (s.includes("رسم") || s.includes("رسوم") || s.includes("ترخيص") || s.includes("بلدي") || s.includes("ضريب") || s.includes("gov") || s.includes("licens")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "governmental")!;
  }
  if (s.includes("شحن") || s.includes("نقل") || s.includes("توصيل") || s.includes("مواصل") || s.includes("ship") || s.includes("trans")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "transport")!;
  }
  if (s.includes("مورد") || s.includes("سداد") || s.includes("فاتورة شراء") || s.includes("مشتريات") || s.includes("supplier") || s.includes("purchas")) {
    return CANONICAL_CATEGORIES.find((c) => c.id === "supplier_payment")!;
  }

  return CANONICAL_CATEGORIES.find((c) => c.id === "other")!;
}

export function normalizeExpensePaymentMethod(pmString: string | undefined | null): PaymentMethodDef {
  if (!pmString) return EXPENSE_PAYMENT_METHODS[0]; // Cash by default
  const s = String(pmString).trim().toLowerCase();

  if (s === "cash" || s.includes("نقدي") || s.includes("كاش") || s.includes("درج")) {
    return EXPENSE_PAYMENT_METHODS[0];
  }
  if (s === "bank" || s.includes("بنك") || s.includes("تحويل") || s.includes("شيك") || s.includes("حوالة")) {
    return EXPENSE_PAYMENT_METHODS[1];
  }
  if (s === "card" || s.includes("بطاق") || s.includes("فيزا") || s.includes("ماستر") || s.includes("pos")) {
    return EXPENSE_PAYMENT_METHODS[2];
  }
  if (s.includes("jawwal") || s.includes("جوال")) {
    return EXPENSE_PAYMENT_METHODS[3];
  }
  if (s.includes("palpay") || s.includes("بال")) {
    return EXPENSE_PAYMENT_METHODS[4];
  }

  return EXPENSE_PAYMENT_METHODS[0];
}

export function round2(num: number): number {
  return Math.round((Number(num) || 0) * 100) / 100;
}

export function formatExpenseVoucherNo(expense: Partial<ExpenseRecord>): string {
  if (expense.voucher_no) return expense.voucher_no;
  const idStr = String(expense.id || "");
  const numPart = idStr.replace(/[^0-9]/g, "");
  const yearMonth = expense.date ? expense.date.slice(0, 7).replace("-", "") : new Date().toISOString().slice(0, 7).replace("-", "");
  const suffix = numPart.length >= 4 ? numPart.slice(-4) : (numPart || "0001").padStart(4, "0");
  return `PV-${yearMonth}-${suffix}`;
}

export interface ExpenseValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized?: Partial<ExpenseRecord>;
}

export function validateExpenseInput(input: any): ExpenseValidationResult {
  const errors: Record<string, string> = {};

  const amount = Number(input.amount);
  if (!input.amount || isNaN(amount) || amount <= 0) {
    errors.amount = "المبلغ يجب أن يكون أكبر من صفر (Amount must be > 0)";
  }

  const description = String(input.description || "").trim();
  if (!description || description.length < 2) {
    errors.description = "يجب إدخال بيان المصروف وتفاصيله (Description is required)";
  }

  const categoryDef = normalizeExpenseCategory(input.category);
  const paymentMethodDef = normalizeExpensePaymentMethod(input.paymentMethod || input.payment_method);

  const date = input.date && Number.isFinite(Date.parse(input.date)) ? input.date : new Date().toISOString();

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      amount: round2(amount),
      description,
      category: categoryDef.key,
      paymentMethod: paymentMethodDef.id,
      payment_method: paymentMethodDef.id,
      date,
      branch_id: input.branch_id || null,
      branch: input.branch || input.branch_name || "",
      created_by: input.created_by || "الموظف",
      supplier_id: input.supplier_id || "",
      supplier_name: input.supplier_name || "",
      reference_id: input.reference_id || "",
    },
  };
}

export interface ExpenseKPIs {
  totalPeriod: number;
  todayTotal: number;
  thisMonthTotal: number;
  drawerCashTotal: number;
  nonDrawerTotal: number;
  operatingExpensesTotal: number;
  supplierSettlementsTotal: number;
  totalTransactions: number;
  categoryBreakdown: Array<{
    categoryKey: string;
    labelAr: string;
    labelEn: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: string;
    amount: number;
    count: number;
    percentage: number;
    accountType: string;
  }>;
  paymentMethodBreakdown: Array<{
    methodId: string;
    labelAr: string;
    labelEn: string;
    isDrawerCash: boolean;
    color: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  branchBreakdown: Array<{
    branchId: string;
    branchName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
}

export function calculateExpenseKPIs(
  expenses: ExpenseRecord[],
  options?: {
    todayIso?: string;
    monthStartIso?: string;
  }
): ExpenseKPIs {
  const todayPrefix = options?.todayIso || new Date().toISOString().split("T")[0];
  const monthStartPrefix = options?.monthStartIso || todayPrefix.slice(0, 8) + "01";

  let totalPeriod = 0;
  let todayTotal = 0;
  let thisMonthTotal = 0;
  let drawerCashTotal = 0;
  let nonDrawerTotal = 0;
  let operatingExpensesTotal = 0;
  let supplierSettlementsTotal = 0;

  const categoryMap = new Map<string, { amount: number; count: number; def: ExpenseCategoryDef }>();
  CANONICAL_CATEGORIES.forEach((c) => {
    categoryMap.set(c.id, { amount: 0, count: 0, def: c });
  });

  const paymentMap = new Map<string, { amount: number; count: number; def: PaymentMethodDef }>();
  EXPENSE_PAYMENT_METHODS.forEach((pm) => {
    paymentMap.set(pm.id, { amount: 0, count: 0, def: pm });
  });

  const branchMap = new Map<string, { branchId: string; branchName: string; amount: number; count: number }>();

  expenses.forEach((e) => {
    const amt = round2(Number(e.amount) || 0);
    if (amt <= 0) return;

    totalPeriod += amt;

    const dateStr = String(e.date || "");
    if (dateStr.startsWith(todayPrefix)) {
      todayTotal += amt;
    }
    if (dateStr >= monthStartPrefix) {
      thisMonthTotal += amt;
    }

    const catDef = normalizeExpenseCategory(e.category);
    const pmDef = normalizeExpensePaymentMethod(e.paymentMethod || e.payment_method);

    if (pmDef.isDrawerCash) {
      drawerCashTotal += amt;
    } else {
      nonDrawerTotal += amt;
    }

    if (catDef.accountType === "supplier_settlement" || catDef.id === "supplier_payment") {
      supplierSettlementsTotal += amt;
    } else {
      operatingExpensesTotal += amt;
    }

    // Category aggregation
    const catEntry = categoryMap.get(catDef.id);
    if (catEntry) {
      catEntry.amount += amt;
      catEntry.count += 1;
    }

    // Payment method aggregation
    const pmEntry = paymentMap.get(pmDef.id);
    if (pmEntry) {
      pmEntry.amount += amt;
      pmEntry.count += 1;
    }

    // Branch aggregation
    const bId = String(e.branch_id || e.branch || "main");
    const bName = String(e.branch || e.branch_name || (bId === "main" ? "الفرع الرئيسي" : bId));
    const bEntry = branchMap.get(bId) || { branchId: bId, branchName: bName, amount: 0, count: 0 };
    bEntry.amount += amt;
    bEntry.count += 1;
    branchMap.set(bId, bEntry);
  });

  totalPeriod = round2(totalPeriod);
  todayTotal = round2(todayTotal);
  thisMonthTotal = round2(thisMonthTotal);
  drawerCashTotal = round2(drawerCashTotal);
  nonDrawerTotal = round2(nonDrawerTotal);
  operatingExpensesTotal = round2(operatingExpensesTotal);
  supplierSettlementsTotal = round2(supplierSettlementsTotal);

  const categoryBreakdown = Array.from(categoryMap.values())
    .filter((item) => item.amount > 0 || item.count > 0)
    .map((item) => ({
      categoryKey: item.def.key,
      labelAr: item.def.labelAr,
      labelEn: item.def.labelEn,
      color: item.def.color,
      bgColor: item.def.bgColor,
      textColor: item.def.textColor,
      icon: item.def.icon,
      amount: round2(item.amount),
      count: item.count,
      percentage: totalPeriod > 0 ? round2((item.amount / totalPeriod) * 100) : 0,
      accountType: item.def.accountType,
    }))
    .sort((a, b) => b.amount - a.amount);

  const paymentMethodBreakdown = Array.from(paymentMap.values())
    .filter((item) => item.amount > 0 || item.count > 0)
    .map((item) => ({
      methodId: item.def.id,
      labelAr: item.def.labelAr,
      labelEn: item.def.labelEn,
      isDrawerCash: item.def.isDrawerCash,
      color: item.def.color,
      amount: round2(item.amount),
      count: item.count,
      percentage: totalPeriod > 0 ? round2((item.amount / totalPeriod) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const branchBreakdown = Array.from(branchMap.values())
    .map((item) => ({
      branchId: item.branchId,
      branchName: item.branchName,
      amount: round2(item.amount),
      count: item.count,
      percentage: totalPeriod > 0 ? round2((item.amount / totalPeriod) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalPeriod,
    todayTotal,
    thisMonthTotal,
    drawerCashTotal,
    nonDrawerTotal,
    operatingExpensesTotal,
    supplierSettlementsTotal,
    totalTransactions: expenses.length,
    categoryBreakdown,
    paymentMethodBreakdown,
    branchBreakdown,
  };
}

export function filterExpensesList(
  expenses: ExpenseRecord[],
  filters: {
    search?: string;
    category?: string;
    paymentMethod?: string;
    branchId?: string;
    from?: string;
    to?: string;
    accountType?: "all" | "opex_only" | "supplier_only";
  }
): ExpenseRecord[] {
  return expenses.filter((e) => {
    // Search
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      const desc = String(e.description || "").toLowerCase();
      const by = String(e.created_by || "").toLowerCase();
      const sup = String(e.supplier_name || "").toLowerCase();
      const id = String(e.id || "").toLowerCase();
      const vNo = formatExpenseVoucherNo(e).toLowerCase();
      if (!desc.includes(q) && !by.includes(q) && !sup.includes(q) && !id.includes(q) && !vNo.includes(q)) {
        return false;
      }
    }

    // Category
    if (filters.category && filters.category !== "all") {
      const catDef = normalizeExpenseCategory(e.category);
      if (catDef.id !== filters.category && catDef.key !== filters.category) {
        return false;
      }
    }

    // Payment Method
    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      const pmDef = normalizeExpensePaymentMethod(e.paymentMethod || e.payment_method);
      if (pmDef.id !== filters.paymentMethod) {
        return false;
      }
    }

    // Branch
    if (filters.branchId && filters.branchId !== "all") {
      const bId = String(e.branch_id || "");
      const bName = String(e.branch || e.branch_name || "");
      if (bId !== filters.branchId && bName !== filters.branchId) {
        return false;
      }
    }

    // Date Range
    if (filters.from) {
      const d = String(e.date || "").split("T")[0];
      if (d < filters.from) return false;
    }
    if (filters.to) {
      const d = String(e.date || "").split("T")[0];
      if (d > filters.to) return false;
    }

    // Account Type
    if (filters.accountType === "opex_only") {
      const catDef = normalizeExpenseCategory(e.category);
      if (catDef.accountType === "supplier_settlement" || catDef.id === "supplier_payment") return false;
    } else if (filters.accountType === "supplier_only") {
      const catDef = normalizeExpenseCategory(e.category);
      if (catDef.accountType !== "supplier_settlement" && catDef.id !== "supplier_payment") return false;
    }

    return true;
  });
}

/**
 * Generates an official payment voucher HTML document (سند صرف مالي رسمي)
 * for high-fidelity printing and PDF export.
 */
export function buildExpenseVoucherHtml(params: {
  expense: ExpenseRecord;
  pharmacyName: string;
  branchName?: string;
  language?: string;
}): string {
  const { expense, pharmacyName, branchName = "الفرع الرئيسي", language = "ar" } = params;
  const isRtl = language !== "en";
  const catDef = normalizeExpenseCategory(expense.category);
  const pmDef = normalizeExpensePaymentMethod(expense.paymentMethod || expense.payment_method);
  const voucherNo = formatExpenseVoucherNo(expense);
  const amt = round2(Number(expense.amount) || 0);

  const formattedDate = expense.date ? new Date(expense.date).toLocaleString(isRtl ? "ar-EG" : "en-US") : new Date().toLocaleString();

  return `
    <div style="width: 100%; max-width: 650px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.8; box-sizing: border-box; padding: 24px; border: 2px solid #0f3d2e; border-radius: 12px;">
      
      <!-- Voucher Header -->
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #0f3d2e; padding-bottom: 12px; margin-bottom: 16px;">
        <tr>
          <td style="vertical-align: middle; width: 60%;">
            <div style="font-size: 20px; font-weight: bold; color: #0f3d2e; line-height: 1.4;">
              ${pharmacyName || (isRtl ? "صيدلية روشيتة" : "Roshetta Pharmacy")}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              ${branchName}
            </div>
          </td>
          <td style="vertical-align: middle; width: 40%; text-align: ${isRtl ? "left" : "right"};">
            <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; display: inline-block; padding: 6px 14px; border-radius: 8px;">
              <div style="font-size: 11px; color: #166534; font-weight: bold;">
                ${isRtl ? "سند صرف مالي" : "PAYMENT VOUCHER"}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: #0f3d2e; font-family: monospace;">
                ${voucherNo}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Voucher Metadata -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; line-height: 2;">
        <tr>
          <td style="width: 25%; font-weight: bold; color: #475569;">${isRtl ? "تاريخ السند:" : "Date & Time:"}</td>
          <td style="width: 75%; color: #0f172a; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #475569;">${isRtl ? "بند الصرف (التصنيف):" : "Category:"}</td>
          <td style="color: #0f172a; font-weight: bold;">
            <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 6px;">${isRtl ? catDef.labelAr : catDef.labelEn}</span>
            <span style="font-size: 11px; color: #64748b; margin-inline-start: 6px;">(${catDef.accountType === "supplier_settlement" ? (isRtl ? "تسوية التزامات موردين" : "Accounts Payable") : (isRtl ? "مصاريف تشغيلية عامة" : "Operating Expense")})</span>
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #475569;">${isRtl ? "طريقة الدفع والصرف:" : "Payment Method:"}</td>
          <td style="color: #0f172a; font-weight: bold;">
            ${isRtl ? pmDef.labelAr : pmDef.labelEn}
            ${pmDef.isDrawerCash ? `<span style="color: #059669; font-size: 11px; margin-inline-start: 6px;">[${isRtl ? "مخصوم من صندوق الكاشير" : "Cash Drawer Petty Cash"}]</span>` : ""}
          </td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #475569;">${isRtl ? "المنفذ / الكاشير:" : "Issued by:"}</td>
          <td style="color: #0f172a;">${expense.created_by || (isRtl ? "أمين الصندوق" : "Cashier")}</td>
        </tr>
        ${expense.supplier_name ? `
        <tr>
          <td style="font-weight: bold; color: #475569;">${isRtl ? "المورد المستفيد:" : "Beneficiary / Supplier:"}</td>
          <td style="color: #0369a1; font-weight: bold;">${expense.supplier_name}</td>
        </tr>
        ` : ""}
      </table>

      <!-- Description Block -->
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: bold; color: #64748b; margin-bottom: 4px;">
          ${isRtl ? "البيان / تفاصيل المصروف:" : "Description & Particulars:"}
        </div>
        <div style="font-size: 13.5px; font-weight: bold; color: #1e293b; line-height: 1.6;">
          ${expense.description}
        </div>
      </div>

      <!-- Amount Box -->
      <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 10px; padding: 14px 20px; text-align: center; margin-bottom: 26px;">
        <div style="font-size: 12px; font-weight: bold; color: #047857; margin-bottom: 4px;">
          ${isRtl ? "المبلغ المصروف الإجمالي" : "Total Disbursed Amount"}
        </div>
        <div style="font-size: 26px; font-weight: 900; color: #065f46; font-family: monospace;">
          ₪${amt.toFixed(2)}
        </div>
      </div>

      <!-- Signatures Table -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; text-align: center; padding: 10px;">
            <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 30px;">
              ${isRtl ? "توقيع المستلم / القابض" : "Receiver Signature"}
            </div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 5px; font-size: 10px; color: #94a3b8;">
              ${isRtl ? "الاسم والتوقيع" : "Name & Signature"}
            </div>
          </td>
          <td style="width: 50%; text-align: center; padding: 10px;">
            <div style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 30px;">
              ${isRtl ? "اعتماد الإدارة / الصيدلي المسؤول" : "Manager Authorization"}
            </div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 5px; font-size: 10px; color: #94a3b8;">
              ${isRtl ? "الختم والتوقيع" : "Stamp & Signature"}
            </div>
          </td>
        </tr>
      </table>

      <!-- Footer Note -->
      <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 10px; color: #94a3b8;">
        ${isRtl ? "نظام روشتة لإدارة الصيدليات • سند صرف مالي موثق محاسبياً" : "Roshetta Pharmacy System • Authorized Financial Voucher"}
      </div>
    </div>
  `;
}
