/**
 * web/src/lib/reports/domain.ts
 * Pure Financial & Statistical Reporting Engine for Roshetta Web.
 * Fully isomorphic mirror of roshetta_server/reports-domain.js.
 * Zero external dependencies. Offline-first compatible.
 */

// --- TypeScript Interfaces ---

export interface UnitTier {
  name: string;
  count: number;
  price?: number;
}

export interface InventoryItemLike {
  id?: string | number;
  medicine_id?: string | number;
  name?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  qty?: number;
  units?: string | UnitTier[];
  category?: string;
  branch_id?: string | number;
  branchId?: string | number;
  branchName?: string;
  min_qty?: number;
  minQty?: number;
  expiry_date?: string;
  expiry?: string;
}

export interface SaleLineItemLike {
  id?: string | number;
  medicine_id?: string | number;
  name?: string;
  barcode?: string;
  qty?: number;
  cartQty?: number;
  price?: number;
  unitPrice?: number;
  cost?: number;
  unitCost?: number;
  unit?: string;
  selectedUnit?: string;
  unitCount?: number;
  deductQty?: number;
  baseUnitsSold?: number;
  discount?: number;
  total?: number;
}

export interface SaleRecordLike {
  id?: string | number;
  total?: number;
  subtotal?: number;
  discount?: number;
  vatAmount?: number;
  status?: string;
  paymentMethod?: string;
  payments?: string | Record<string, number>;
  paymentStatus?: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
  branch_id?: string | number;
  branchId?: string | number;
  branchName?: string;
  items?: string | SaleLineItemLike[];
}

export interface ExpenseRecordLike {
  id?: string | number;
  amount?: number;
  category?: string;
  paymentMethod?: string;
  date?: string;
  created_at?: string;
  createdAt?: string;
  branch_id?: string | number;
  branchId?: string | number;
}

export interface StockTakeLike {
  id?: string | number;
  medicine_id?: string | number;
  difference?: number;
  diff?: number;
  cost?: number;
  date?: string;
  created_at?: string;
  createdAt?: string;
}

export interface FinancialReportData {
  grossRevenue: number;
  totalLineDiscounts: number;
  totalInvoiceDiscounts: number;
  totalDiscounts: number;
  totalRefunds: number;
  netRevenue: number;
  totalVat: number;
  totalCollected: number;
  totalCreditSales: number;
  totalDebtPaymentsCollected: number;
  totalCost: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  totalExpenses: number;
  operatingExpenses: number;
  supplierPayments: number;
  inventoryShrinkageCost: number;
  inventoryShrinkageCount: number;
  expensesByCategory: Record<string, number>;
  operatingProfit: number;
  netProfit: number;
  profitMargin: number;
  netMargin: number;
  totalOrders: number;
  totalItemsSold: number;
  averageBasketSize: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    bank: number;
    jawwal: number;
    palpay: number;
    maalchat: number;
    credit: number;
    other: number;
  };
  dailyTrend: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  branchPerformance: Array<{
    name: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
    margin: number;
  }>;
  topItems: Array<{
    id: string;
    name: string;
    qty: number;
    revenue: number;
    cost: number;
    grossProfit: number;
    margin: number;
    category?: string;
  }>;
  topSellingByQty: any[];
  topSellingByRevenue: any[];
  topProfitableItems: any[];
  missingCostItemsCount: number;
  missingCostItems: any[];
  isAccrualBased: boolean;
  timestamp: string;
}

// --- Deterministic Mathematical Helpers ---

export function round2(num: any): number {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

export function round4(num: any): number {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Math.round((Number(num) + Number.EPSILON) * 10000) / 10000;
}

export function safeDiv(numerator: any, denominator: any, fallback = 0): number {
  const num = Number(numerator) || 0;
  const den = Number(denominator) || 0;
  if (!den || isNaN(den) || !isFinite(num / den)) return fallback;
  return round2(num / den);
}

export function safeJson<T = any>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// --- Payment Method Normalizer ---

export const CANONICAL_PAYMENT_METHODS: Record<string, string[]> = {
  cash: ["cash", "نقدي", "نقد", "كاش"],
  card: ["card", "بطاقة", "فيزا", "visa", "mastercard", "مدى", "mada", "شبكة"],
  bank: ["bank", "بنك", "تحويل بنكي", "bank_transfer", "شيك", "cheque"],
  jawwal_pay: ["jawwal_pay", "jawwalpay", "jawwal", "جوال باي", "جوال"],
  palpay: ["palpay", "بال باي", "بالباي"],
  maalchat: ["maalchat", "مال شات", "مالشات"],
  credit: ["credit", "ذمم", "آجل", "اجل", "شريحة", "دين", "debt"],
  split: ["split", "مجزأ", "متعدد", "دفعات"],
  debt_payment: ["debt_payment", "سداد ذمم", "تسديد دين", "سداد دين", "pay_off_a_debt", "دفعة ذمم"],
  non_cash: ["non_cash", "غير نقدي", "تسوية قيد", "تالف", "هدر", "adjustment"],
};

export function normalizePaymentMethod(methodRaw: any): string {
  if (!methodRaw) return "cash";
  const str = String(methodRaw).trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(CANONICAL_PAYMENT_METHODS)) {
    if (aliases.some((alias) => str === alias || str.includes(alias))) {
      return canonical;
    }
  }
  return "other";
}

// --- Multi-Tier Packaging & Unit Decomposer ---

export function parseUnitsArray(unitsRaw: any): UnitTier[] {
  if (!unitsRaw) return [];
  if (Array.isArray(unitsRaw)) return unitsRaw;
  try {
    const parsed = JSON.parse(unitsRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function extractBoxMultiplier(unitsRaw: any): number {
  const units = parseUnitsArray(unitsRaw);
  if (units.length > 0 && Number(units[0].count) > 1) {
    return Number(units[0].count);
  }
  return 1;
}

export function decomposeBaseQty(baseQty: number, unitsRaw: any) {
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

// --- Strict Proportional Cost Resolver ---

export function resolveItemCost(
  saleItem: SaleLineItemLike,
  inventoryItem?: InventoryItemLike | null
) {
  const qty = Number(saleItem.cartQty !== undefined ? saleItem.cartQty : (saleItem.qty || 1)) || 0;
  if (qty <= 0) {
    return { unitCost: 0, totalCost: 0, costSource: "zero_qty", isMissingCost: false };
  }

  // 1. If explicit cost exists on the sale line item
  if (saleItem.cost != null && Number(saleItem.cost) > 0) {
    const unitCost = Number(saleItem.cost);
    return {
      unitCost: round4(unitCost),
      totalCost: round2(unitCost * qty),
      costSource: "line_item",
      isMissingCost: false,
    };
  }

  // 2. Derive cost from inventory master
  if (inventoryItem && inventoryItem.cost != null && Number(inventoryItem.cost) > 0) {
    const boxCost = Number(inventoryItem.cost);
    const units = parseUnitsArray(inventoryItem.units);
    const boxMultiplier = extractBoxMultiplier(units);
    const costPerBaseUnit = boxMultiplier > 0 ? boxCost / boxMultiplier : boxCost;

    // A) deductQty (base units)
    const deductQty = Number(saleItem.deductQty || saleItem.baseUnitsSold);
    if (deductQty > 0) {
      const totalCost = costPerBaseUnit * deductQty;
      const unitCost = totalCost / qty;
      return {
        unitCost: round4(unitCost),
        totalCost: round2(totalCost),
        costSource: "inventory_base_deduct",
        isMissingCost: false,
      };
    }

    // B) unit matching
    const unitName = String(saleItem.unit || saleItem.selectedUnit || "").trim().toLowerCase();
    if (unitName && units.length > 0) {
      const tierIndex = units.findIndex((u) => {
        const uName = String(u.name || "").trim().toLowerCase();
        return uName === unitName || (unitName === "شريط" && uName.includes("شريط")) || (unitName === "حبة" && uName.includes("حبة"));
      });

      if (tierIndex !== -1) {
        const tierCount = Number(units[tierIndex].count) || 1;
        const tierUnitCost = costPerBaseUnit * tierCount;
        return {
          unitCost: round4(tierUnitCost),
          totalCost: round2(tierUnitCost * qty),
          costSource: "inventory_unit_tier",
          isMissingCost: false,
        };
      }
    }

    // C) legacy unitCount
    const unitCount = Number(saleItem.unitCount);
    if (unitCount > 1) {
      const derivedUnitCost = boxCost / unitCount;
      return {
        unitCost: round4(derivedUnitCost),
        totalCost: round2(derivedUnitCost * qty),
        costSource: "inventory_unit_count",
        isMissingCost: false,
      };
    }

    // D) default box cost
    return {
      unitCost: round4(boxCost),
      totalCost: round2(boxCost * qty),
      costSource: "inventory_box_default",
      isMissingCost: false,
    };
  }

  // 3. line unitCost
  if (saleItem.unitCost != null && Number(saleItem.unitCost) > 0) {
    const unitCost = Number(saleItem.unitCost);
    return {
      unitCost: round4(unitCost),
      totalCost: round2(unitCost * qty),
      costSource: "line_unit_cost",
      isMissingCost: false,
    };
  }

  // 4. Missing cost
  return {
    unitCost: 0,
    totalCost: 0,
    costSource: "missing",
    isMissingCost: true,
  };
}

export function isDateInRange(dateStr: string, from?: string, to?: string): boolean {
  if (!dateStr) return false;
  const d = String(dateStr).split("T")[0];
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function buildInventoryLookup(inventoryItems: InventoryItemLike[]): Map<string, InventoryItemLike> {
  const map = new Map<string, InventoryItemLike>();
  if (!Array.isArray(inventoryItems)) return map;

  for (const item of inventoryItems) {
    if (!item) continue;
    if (item.id != null) map.set(String(item.id), item);
    if (item.medicine_id != null) map.set(String(item.medicine_id), item);
    if (item.barcode) map.set(String(item.barcode).trim(), item);
    if (item.name) {
      const normName = String(item.name).trim().toLowerCase();
      if (!map.has(normName)) map.set(normName, item);
    }
  }
  return map;
}

// ============================================================================
// Core Module 1: Comprehensive Financial & Performance Report (GAAP / IFRS)
// ============================================================================

export function computeFinancialReport({
  sales = [],
  expenses = [],
  inventory = [],
  stockTakes = [],
  branches = [],
  from = "",
  to = "",
  branch = "all",
}: {
  sales?: SaleRecordLike[];
  expenses?: ExpenseRecordLike[];
  inventory?: InventoryItemLike[] | Map<string, InventoryItemLike>;
  stockTakes?: StockTakeLike[];
  branches?: any[];
  from?: string;
  to?: string;
  branch?: string;
}): { success: boolean; data: FinancialReportData } {
  const invMap = inventory instanceof Map ? inventory : buildInventoryLookup(inventory);

  let grossRevenue = 0;
  let totalLineDiscounts = 0;
  let totalInvoiceDiscounts = 0;
  let totalVat = 0;
  let totalRefunds = 0;
  let totalCogs = 0;
  let totalItemsSoldQty = 0;
  let totalSalesOrdersCount = 0;
  let missingCostItemsCount = 0;
  const missingCostItems: any[] = [];

  const dailySales: Record<string, number> = {};
  const dailyCosts: Record<string, number> = {};
  const branchSales: Record<string, { revenue: number; cost: number; orders: number }> = {};
  const itemAnalytics: Record<string, any> = {};
  const paymentBreakdown = {
    cash: 0,
    card: 0,
    bank: 0,
    jawwal: 0,
    palpay: 0,
    maalchat: 0,
    credit: 0,
    other: 0,
  };

  let totalCreditSales = 0;
  let totalDebtPaymentsCollected = 0;

  for (const sale of sales) {
    if (!sale) continue;
    const saleDate = sale.date || sale.created_at || sale.createdAt || "";
    if (!isDateInRange(saleDate, from, to)) continue;

    if (branch && branch !== "all") {
      const bId = String(sale.branch_id || sale.branchId || "");
      const bName = String(sale.branchName || "");
      const isMatch = bId === branch || bName === branch;
      if (!isMatch) continue;
    }

    const saleStatus = String(sale.status || "").toLowerCase();
    const isRefund = saleStatus === "refunded" || saleStatus === "refund_proxy";
    const paymentMethodNorm = normalizePaymentMethod(sale.paymentMethod);
    const saleTotal = Number(sale.total) || 0;

    const isDebtPayment =
      saleStatus === "debt_payment" ||
      paymentMethodNorm === "debt_payment" ||
      (sale.items === "[]" && saleTotal > 0 && !isRefund);

    if (isDebtPayment) {
      totalDebtPaymentsCollected += saleTotal;
      continue;
    }

    if (isRefund) {
      totalRefunds += Math.abs(saleTotal);
      continue;
    }

    if (sale.paymentStatus === "failed") continue;

    totalSalesOrdersCount++;
    const day = saleDate ? saleDate.split("T")[0] : "unknown";
    const bName = sale.branchName || "الفرع الرئيسي";

    const invoiceDiscount = Number(sale.discount) || 0;
    const invoiceVat = Number(sale.vatAmount) || 0;
    totalInvoiceDiscounts += invoiceDiscount;
    totalVat += invoiceVat;

    if (!dailySales[day]) dailySales[day] = 0;
    dailySales[day] += saleTotal;

    if (!dailyCosts[day]) dailyCosts[day] = 0;

    if (!branchSales[bName]) {
      branchSales[bName] = { revenue: 0, cost: 0, orders: 0 };
    }
    branchSales[bName].revenue += saleTotal;
    branchSales[bName].orders += 1;

    // Payment breakdown
    if (paymentMethodNorm === "split" && sale.payments) {
      const pObj = safeJson<any>(sale.payments, {});
      const cAmt = Number(pObj.cash) || 0;
      const cardAmt = Number(pObj.card) || 0;
      const bankAmt = Number(pObj.bank) || 0;
      const creditAmt = Number(pObj.credit) || 0;
      const jawwalAmt = Number(pObj.jawwal_pay || pObj.jawwalpay) || 0;
      const palpayAmt = Number(pObj.palpay) || 0;
      const maalchatAmt = Number(pObj.maalchat) || 0;

      paymentBreakdown.cash += cAmt;
      paymentBreakdown.card += cardAmt;
      paymentBreakdown.bank += bankAmt;
      paymentBreakdown.credit += creditAmt;
      paymentBreakdown.jawwal += jawwalAmt;
      paymentBreakdown.palpay += palpayAmt;
      paymentBreakdown.maalchat += maalchatAmt;
      totalCreditSales += creditAmt;
    } else if (paymentMethodNorm === "cash") {
      paymentBreakdown.cash += saleTotal;
    } else if (paymentMethodNorm === "card") {
      paymentBreakdown.card += saleTotal;
    } else if (paymentMethodNorm === "bank") {
      paymentBreakdown.bank += saleTotal;
    } else if (paymentMethodNorm === "jawwal_pay") {
      paymentBreakdown.jawwal += saleTotal;
    } else if (paymentMethodNorm === "palpay") {
      paymentBreakdown.palpay += saleTotal;
    } else if (paymentMethodNorm === "maalchat") {
      paymentBreakdown.maalchat += saleTotal;
    } else if (paymentMethodNorm === "credit") {
      paymentBreakdown.credit += saleTotal;
      totalCreditSales += saleTotal;
    } else {
      paymentBreakdown.other += saleTotal;
    }

    // Line items
    const items = safeJson<SaleLineItemLike[]>(sale.items, []);
    let saleLineRevenueSum = 0;

    for (const item of items) {
      if (!item) continue;
      const qty = Number(item.cartQty !== undefined ? item.cartQty : (item.qty || 0)) || 0;
      if (qty <= 0) continue;

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : (item.price || 0)) || 0;
      const itemLineGross = unitPrice * qty;
      const itemLineDiscount = Number(item.discount) || 0;
      const itemLineNet = Math.max(0, itemLineGross - itemLineDiscount);

      saleLineRevenueSum += itemLineGross;
      totalLineDiscounts += itemLineDiscount;
      totalItemsSoldQty += qty;

      const invItem =
        (item.id != null ? invMap.get(String(item.id)) : null) ||
        (item.medicine_id != null ? invMap.get(String(item.medicine_id)) : null) ||
        (item.barcode ? invMap.get(String(item.barcode).trim()) : null) ||
        (item.name ? invMap.get(String(item.name).trim().toLowerCase()) : null);

      const costRes = resolveItemCost(item, invItem);
      const itemLineCost = costRes.totalCost;

      totalCogs += itemLineCost;
      dailyCosts[day] += itemLineCost;
      branchSales[bName].cost += itemLineCost;

      if (costRes.isMissingCost) {
        missingCostItemsCount++;
        if (missingCostItems.length < 50) {
          missingCostItems.push({
            id: item.id || item.medicine_id,
            name: item.name || "عنصر غير معروف",
            saleId: sale.id,
            qty,
            unitPrice,
          });
        }
      }

      // Normalized Base Quantity for Multi-Unit Items (Boxes -> Strips -> Pills)
      const mult = extractBoxMultiplier(invItem?.units || item?.units);
      const unitType = String(item.selectedUnit || item.unit || "").toLowerCase();
      let normalizedQty = qty;
      if (item.deductQty != null && Number(item.deductQty) > 0) {
        normalizedQty = Number(item.deductQty);
      } else if (mult > 1 && (unitType === "box" || unitType === "علبة" || !unitType)) {
        normalizedQty = qty * mult;
      }

      const itemId = String(item.id || item.medicine_id || item.name || "unknown");
      const itemName = item.name || "عنصر غير محدد";

      if (!itemAnalytics[itemId]) {
        itemAnalytics[itemId] = {
          id: itemId,
          name: itemName,
          qty: 0,
          revenue: 0,
          cost: 0,
          grossProfit: 0,
          category: invItem?.category || "أدوية عامة",
        };
      }
      itemAnalytics[itemId].qty += normalizedQty;
      itemAnalytics[itemId].revenue += itemLineNet;
      itemAnalytics[itemId].cost += itemLineCost;
      itemAnalytics[itemId].grossProfit += (itemLineNet - itemLineCost);
    }

    if (saleLineRevenueSum > 0) {
      grossRevenue += saleLineRevenueSum;
    } else {
      grossRevenue += (saleTotal + invoiceDiscount);
    }
  }

  // Operating Expenses (strictly excluding supplier settlements and isolating shrinkage)
  let operatingExpenses = 0;
  let supplierPayments = 0;
  let inventoryShrinkageCost = 0;
  let inventoryShrinkageCount = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const exp of expenses) {
    if (!exp) continue;
    const expDate = exp.date || exp.created_at || exp.createdAt || "";
    if (!isDateInRange(expDate, from, to)) continue;

    if (branch && branch !== "all") {
      const bId = String(exp.branch_id || exp.branchId || "");
      const bName = String(exp.branchName || "");
      const isMatch = bId === branch || bName === branch;
      if (!isMatch) continue;
    }

    const amt = Number(exp.amount) || 0;
    const category = String(exp.category || "مصاريف تشغيلية عامة").trim();

    if (category === "سداد موردين" || category === "دفعات موردين" || category === "supplier_payment") {
      supplierPayments += amt;
    } else if (
      category === "هدر وتلفيات" ||
      category === "فاقد وتالف" ||
      category === "عجز مخزون" ||
      category === "تالف مخزون" ||
      category === "تالف" ||
      category === "هدر" ||
      category === "shrinkage" ||
      category === "waste"
    ) {
      inventoryShrinkageCost += amt;
      inventoryShrinkageCount += 1;
      expensesByCategory["هدر وتلفيات"] = (expensesByCategory["هدر وتلفيات"] || 0) + amt;
    } else {
      operatingExpenses += amt;
      expensesByCategory[category] = (expensesByCategory[category] || 0) + amt;
    }
  }

  // Inventory Shrinkage from Stock Takes
  for (const st of stockTakes) {
    if (!st) continue;
    const stDate = st.date || st.created_at || st.createdAt || "";
    if (!isDateInRange(stDate, from, to)) continue;

    const diff = Number(st.difference || st.diff || 0);
    if (diff < 0) {
      const invItem = st.medicine_id ? invMap.get(String(st.medicine_id)) : null;
      let unitCost = 0;
      if (st.cost != null && Number(st.cost) > 0) {
        unitCost = Number(st.cost);
      } else if (invItem && invItem.cost != null) {
        const units = parseUnitsArray(invItem.units);
        const boxMult = extractBoxMultiplier(units);
        unitCost = Number(invItem.cost) / (boxMult > 0 ? boxMult : 1);
      }
      const lossVal = Math.abs(diff) * unitCost;
      inventoryShrinkageCost += lossVal;
      inventoryShrinkageCount += Math.abs(diff);
    }
  }

  const totalDiscounts = round2(totalLineDiscounts + totalInvoiceDiscounts);
  const netRevenue = round2(Math.max(0, grossRevenue - totalDiscounts - totalRefunds));
  const roundedCogs = round2(totalCogs);
  const grossProfit = round2(netRevenue - roundedCogs);
  const grossMargin = safeDiv(grossProfit, netRevenue) * 100;

  const roundedOperatingExpenses = round2(operatingExpenses);
  const roundedShrinkage = round2(inventoryShrinkageCost);
  const operatingProfit = round2(grossProfit - roundedOperatingExpenses - roundedShrinkage);
  const netProfit = operatingProfit;
  const netMargin = safeDiv(netProfit, netRevenue) * 100;

  const totalCollected = round2(Math.max(0, netRevenue - totalCreditSales) + totalDebtPaymentsCollected);

  const dailyTrend = Object.keys(dailySales)
    .sort()
    .map((d) => {
      const rev = round2(dailySales[d]);
      const cst = round2(dailyCosts[d] || 0);
      const prf = round2(rev - cst);
      return {
        date: d,
        revenue: rev,
        cost: cst,
        profit: prf,
        margin: safeDiv(prf, rev) * 100,
      };
    });

  const branchPerformance = Object.keys(branchSales).map((name) => {
    const b = branchSales[name];
    const rev = round2(b.revenue);
    const cst = round2(b.cost);
    const prf = round2(rev - cst);
    return {
      name,
      revenue: rev,
      cost: cst,
      profit: prf,
      orders: b.orders,
      margin: safeDiv(prf, rev) * 100,
    };
  });

  const allItemsList = Object.values(itemAnalytics).map((item) => ({
    ...item,
    revenue: round2(item.revenue),
    cost: round2(item.cost),
    grossProfit: round2(item.grossProfit),
    margin: safeDiv(item.grossProfit, item.revenue) * 100,
  }));

  const topSellingByQty = [...allItemsList].sort((a, b) => b.qty - a.qty).slice(0, 10);
  const topSellingByRevenue = [...allItemsList].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topProfitableItems = [...allItemsList].sort((a, b) => b.grossProfit - a.grossProfit).slice(0, 10);

  const averageBasketSize = safeDiv(netRevenue, totalSalesOrdersCount);

  return {
    success: true,
    data: {
      grossRevenue: round2(grossRevenue),
      totalLineDiscounts: round2(totalLineDiscounts),
      totalInvoiceDiscounts: round2(totalInvoiceDiscounts),
      totalDiscounts,
      totalDiscount: totalDiscounts,
      totalRefunds: round2(totalRefunds),
      netRevenue,
      totalRevenue: netRevenue,
      totalVat: round2(totalVat),
      totalCollected,
      totalCreditSales: round2(totalCreditSales),
      totalDebtPaymentsCollected: round2(totalDebtPaymentsCollected),

      totalCost: roundedCogs,
      cogs: roundedCogs,
      grossProfit,
      totalProfit: grossProfit,
      grossMargin: round2(grossMargin),

      totalExpenses: roundedOperatingExpenses,
      operatingExpenses: roundedOperatingExpenses,
      supplierPayments: round2(supplierPayments),
      inventoryShrinkageCost: roundedShrinkage,
      inventoryShrinkageCount,
      expensesByCategory,

      operatingProfit,
      netProfit,
      profitMargin: round2(netMargin),
      netMargin: round2(netMargin),

      totalOrders: totalSalesOrdersCount,
      totalItemsSold: totalItemsSoldQty,
      averageBasketSize,

      paymentBreakdown: {
        cash: round2(paymentBreakdown.cash),
        card: round2(paymentBreakdown.card),
        bank: round2(paymentBreakdown.bank),
        jawwal: round2(paymentBreakdown.jawwal),
        palpay: round2(paymentBreakdown.palpay),
        maalchat: round2(paymentBreakdown.maalchat),
        credit: round2(paymentBreakdown.credit),
        other: round2(paymentBreakdown.other),
      },
      dailyTrend,
      branchPerformance,

      topItems: topSellingByQty,
      topSellingByQty,
      topSellingByRevenue,
      topProfitableItems,

      missingCostItemsCount,
      missingCostItems,
      isAccrualBased: true,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Core Module 2: Cash Flow Statement (قائمة التدفقات النقدية)
// ============================================================================

export function computeCashFlowReport({
  sales = [],
  expenses = [],
  from = "",
  to = "",
  branch = "all",
}: {
  sales?: SaleRecordLike[];
  expenses?: ExpenseRecordLike[];
  from?: string;
  to?: string;
  branch?: string;
}) {
  let cashSalesInflow = 0;
  let cardBankWalletInflow = 0;
  let customerDebtPaymentInflow = 0;
  let refundsOutflow = 0;

  let operatingExpensesOutflow = 0;
  let supplierPaymentsOutflow = 0;

  const channels = {
    cashDrawer: 0,
    bankAccounts: 0,
    electronicWallets: 0,
  };

  for (const sale of sales) {
    if (!sale) continue;
    const saleDate = sale.date || sale.created_at || sale.createdAt || "";
    if (!isDateInRange(saleDate, from, to)) continue;

    if (branch && branch !== "all") {
      const bId = String(sale.branch_id || sale.branchId || "");
      const bName = String(sale.branchName || "");
      if (bId !== branch && bName !== branch) continue;
    }

    const saleStatus = String(sale.status || "").toLowerCase();
    const saleTotal = Number(sale.total) || 0;
    const pm = normalizePaymentMethod(sale.paymentMethod);

    if (saleStatus === "refunded" || saleStatus === "refund_proxy") {
      const refundAmt = Math.abs(saleTotal);
      refundsOutflow += refundAmt;
      channels.cashDrawer -= refundAmt;
      continue;
    }

    const isDebtPayment =
      saleStatus === "debt_payment" ||
      pm === "debt_payment" ||
      (sale.items === "[]" && saleTotal > 0);

    if (isDebtPayment) {
      customerDebtPaymentInflow += saleTotal;
      if (pm === "bank") {
        channels.bankAccounts += saleTotal;
      } else if (pm === "jawwal_pay" || pm === "palpay" || pm === "maalchat") {
        channels.electronicWallets += saleTotal;
      } else {
        channels.cashDrawer += saleTotal;
      }
      continue;
    }

    if (pm === "split" && sale.payments) {
      const pObj = safeJson<any>(sale.payments, {});
      const c = Number(pObj.cash) || 0;
      const crd = Number(pObj.card) || 0;
      const bnk = Number(pObj.bank) || 0;
      const wal = Number(pObj.jawwal_pay || pObj.jawwalpay || 0) + Number(pObj.palpay || 0) + Number(pObj.maalchat || 0);

      cashSalesInflow += c;
      cardBankWalletInflow += (crd + bnk + wal);
      channels.cashDrawer += c;
      channels.bankAccounts += (crd + bnk);
      channels.electronicWallets += wal;
    } else if (pm === "cash") {
      cashSalesInflow += saleTotal;
      channels.cashDrawer += saleTotal;
    } else if (pm === "card" || pm === "bank") {
      cardBankWalletInflow += saleTotal;
      channels.bankAccounts += saleTotal;
    } else if (pm === "jawwal_pay" || pm === "palpay" || pm === "maalchat") {
      cardBankWalletInflow += saleTotal;
      channels.electronicWallets += saleTotal;
    }
  }

  for (const exp of expenses) {
    if (!exp) continue;
    const expDate = exp.date || exp.created_at || exp.createdAt || "";
    if (!isDateInRange(expDate, from, to)) continue;

    if (branch && branch !== "all") {
      const bId = String(exp.branch_id || exp.branchId || "");
      const bName = String(exp.branchName || "");
      if (bId !== branch && bName !== branch) continue;
    }

    const amt = Number(exp.amount) || 0;
    const category = String(exp.category || "").trim();
    const rawPm = String(exp.paymentMethod || "").trim().toLowerCase();
    const expPm = normalizePaymentMethod(exp.paymentMethod || "cash");

    const isNonCashCategory = [
      "هدر وتلفيات",
      "فاقد وتالف",
      "عجز مخزون",
      "تالف مخزون",
      "تالف",
      "هدر",
      "waste",
      "shrinkage",
    ].includes(category);
    const isNonCash = expPm === "non_cash" || rawPm === "non_cash" || rawPm === "none" || isNonCashCategory;

    if (isNonCash) {
      continue;
    }

    if (category === "سداد موردين" || category === "دفعات موردين" || category === "supplier_payment") {
      supplierPaymentsOutflow += amt;
    } else {
      operatingExpensesOutflow += amt;
    }

    if (expPm === "bank" || expPm === "card") {
      channels.bankAccounts -= amt;
    } else if (expPm === "jawwal_pay" || expPm === "palpay" || expPm === "maalchat") {
      channels.electronicWallets -= amt;
    } else {
      channels.cashDrawer -= amt;
    }
  }

  const totalOperatingInflow = round2(cashSalesInflow + cardBankWalletInflow + customerDebtPaymentInflow);
  const totalOperatingOutflow = round2(operatingExpensesOutflow + supplierPaymentsOutflow + refundsOutflow);
  const netCashFlow = round2(totalOperatingInflow - totalOperatingOutflow);

  return {
    success: true,
    data: {
      inflows: {
        cashSales: round2(cashSalesInflow),
        cardBankWallets: round2(cardBankWalletInflow),
        debtCollections: round2(customerDebtPaymentInflow),
        totalInflows: totalOperatingInflow,
      },
      outflows: {
        operatingExpenses: round2(operatingExpensesOutflow),
        supplierSettlements: round2(supplierPaymentsOutflow),
        customerRefunds: round2(refundsOutflow),
        totalOutflows: totalOperatingOutflow,
      },
      netCashFlow,
      liquidityByChannel: {
        cashDrawer: round2(channels.cashDrawer),
        bankAccounts: round2(channels.bankAccounts),
        electronicWallets: round2(channels.electronicWallets),
      },
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Core Module 3: Capital & Inventory Valuation (تقييم المخزون الرأسمالي)
// ============================================================================

export function computeInventoryValuation(
  inventoryItems: InventoryItemLike[] = [],
  branch = "all"
) {
  let totalMedicinesCount = 0;
  let totalBaseUnitsCount = 0;
  let aggregateBoxes = 0;
  let aggregateStrips = 0;
  let aggregatePills = 0;

  let totalCostValuation = 0;
  let totalRetailValuation = 0;

  let lowStockCount = 0;
  let lowStockCostValue = 0;

  let expiredCount = 0;
  let expiredCostValue = 0;

  let nearExpiryCount = 0;
  let nearExpiryCostValue = 0;

  const categoryBreakdown: Record<string, { costValue: number; retailValue: number; itemsCount: number }> = {};
  const today = new Date();
  const warningDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  for (const item of inventoryItems) {
    if (!item) continue;

    if (branch && branch !== "all") {
      const bId = String(item.branch_id || item.branchId || "");
      const bName = String(item.branchName || "");
      if (bId !== branch && bName !== branch) continue;
    }

    totalMedicinesCount++;
    const baseQty = Math.max(0, Number(item.qty) || 0);
    totalBaseUnitsCount += baseQty;

    const units = parseUnitsArray(item.units);
    const boxMultiplier = extractBoxMultiplier(units);
    const decomposed = decomposeBaseQty(baseQty, units);

    aggregateBoxes += decomposed.boxes;
    aggregateStrips += decomposed.strips;
    aggregatePills += decomposed.pills;

    const boxCost = Number(item.cost) || 0;
    const boxPrice = Number(item.price) || 0;

    const costPerBaseUnit = boxMultiplier > 0 ? boxCost / boxMultiplier : boxCost;
    const pricePerBaseUnit = boxMultiplier > 0 ? boxPrice / boxMultiplier : boxPrice;

    const itemCostValue = baseQty * costPerBaseUnit;
    const itemRetailValue = baseQty * pricePerBaseUnit;

    totalCostValuation += itemCostValue;
    totalRetailValuation += itemRetailValue;

    const cat = item.category || "أدوية عامة";
    if (!categoryBreakdown[cat]) {
      categoryBreakdown[cat] = { costValue: 0, retailValue: 0, itemsCount: 0 };
    }
    categoryBreakdown[cat].costValue += itemCostValue;
    categoryBreakdown[cat].retailValue += itemRetailValue;
    categoryBreakdown[cat].itemsCount += 1;

    const minQtyBoxes = Number(item.min_qty || item.minQty || 5);
    const minQtyBase = minQtyBoxes * boxMultiplier;
    if (baseQty <= minQtyBase) {
      lowStockCount++;
      lowStockCostValue += itemCostValue;
    }

    if (item.expiry_date || item.expiry) {
      const expDate = new Date(item.expiry_date || item.expiry!);
      if (!isNaN(expDate.getTime())) {
        if (expDate < today) {
          expiredCount++;
          expiredCostValue += itemCostValue;
        } else if (expDate <= warningDate) {
          nearExpiryCount++;
          nearExpiryCostValue += itemCostValue;
        }
      }
    }
  }

  const roundedCost = round2(totalCostValuation);
  const roundedRetail = round2(totalRetailValuation);
  const unrealizedProfit = round2(roundedRetail - roundedCost);
  const unrealizedMargin = safeDiv(unrealizedProfit, roundedRetail) * 100;

  const categoryAnalytics = Object.keys(categoryBreakdown).map((cat) => {
    const c = categoryBreakdown[cat];
    const cVal = round2(c.costValue);
    const rVal = round2(c.retailValue);
    const pVal = round2(rVal - cVal);
    return {
      category: cat,
      itemsCount: c.itemsCount,
      costValuation: cVal,
      retailValuation: rVal,
      unrealizedProfit: pVal,
      margin: safeDiv(pVal, rVal) * 100,
      shareOfCapitalPercent: safeDiv(cVal, roundedCost) * 100,
    };
  });

  return {
    success: true,
    data: {
      totalMedicinesCount,
      totalBaseUnitsCount,
      packagingDecomposition: {
        boxes: aggregateBoxes,
        strips: aggregateStrips,
        pills: aggregatePills,
      },
      capitalAtCost: roundedCost,
      potentialRetailRevenue: roundedRetail,
      unrealizedProfit,
      unrealizedMargin: round2(unrealizedMargin),
      lowStock: {
        count: lowStockCount,
        costValue: round2(lowStockCostValue),
      },
      expiredStock: {
        count: expiredCount,
        costValue: round2(expiredCostValue),
      },
      nearExpiryStock: {
        count: nearExpiryCount,
        costValue: round2(nearExpiryCostValue),
      },
      categoryAnalytics,
      timestamp: new Date().toISOString(),
    },
  };
}
