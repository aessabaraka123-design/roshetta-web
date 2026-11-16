/**
 * web/src/lib/returns/domain.ts
 * Pure Isomorphic Returns, Refunds & Credit Notes Engine for Roshetta.
 * Fully isomorphic mirror across Web, Server, and Mobile.
 * Zero external dependencies. Offline-first compatible.
 * Compliant with GAAP / IFRS 15 Refund Liabilities, GS1 & FDA DSCSA Pharmacy Standards.
 */

export type ReturnReason =
  | "wrong_item"        // خطأ في الصرف / صنف غير مطلوب
  | "customer_request"  // رغبة العميل / عدم الحاجة
  | "patient_reaction"  // حساسية المريض / توجيه الطبيب
  | "defect_damaged"    // عيب مصنعي / تلف في العبوة
  | "expired_on_shelf"  // قريب أو منتهي الصلاحية
  | "other";            // أخرى

export type ReturnCondition =
  | "restock"  // صالح لإعادة البيع (سليم ومغلق) -> يُعاد للمخزون
  | "damaged"; // تالف أو مفتوح -> يُسجل كعجز وتالف ولا يُعاد للرف

export type RefundSettlementMode =
  | "cash_out"        // صرف نقدي من الخزينة للكاشير
  | "credit_balance"  // إيداع كشحنة دائنة في حساب العميل
  | "card_reversal";  // عكس العملية على البطاقة أو المحفظة

export interface ReturnItemRequest {
  id: string | number;
  qty: number;
  returnQty?: number;
  condition?: ReturnCondition;
  reason?: ReturnReason;
  unitCount?: number;
  unitPrice?: number;
  cost?: number;
  batch_number?: string;
  expiry?: string;
}

export interface ReturnOptions {
  returnPaidMode?: RefundSettlementMode;
  debtToCancel?: number;
  paidAmountToRefund?: number;
  paymentMethod?: string;
  customerId?: string | number;
  customerName?: string;
  reason?: ReturnReason;
  condition?: ReturnCondition;
  notes?: string;
}

export interface ReturnItemCalculation {
  id: string;
  name: string;
  barcode?: string;
  returnQty: number;
  unitPrice: number;
  cost: number;
  unitCount: number;
  grossAmount: number;
  discountPortion: number;
  netRefundAmount: number;
  condition: ReturnCondition;
  reason: ReturnReason;
  batch_number: string;
  expiry: string;
  isRestockable: boolean;
}

export interface ReturnSettlementResult {
  isFullReturn: boolean;
  totalItemsRequested: number;
  grossRefundAmount: number;
  discountReversed: number;
  netRefundAmount: number;
  debtToCancel: number;
  paidAmountToRefund: number;
  returnPaidMode: RefundSettlementMode;
  paidMethodName: string;
  items: ReturnItemCalculation[];
  remainingSaleTotal: number;
  creditPart: number;
  customerBeforeDebt: number;
  customerAfterDebt: number;
}

export interface ReturnsKPIs {
  totalReturnsCount: number;
  totalRefundAmount: number;
  totalRestockedItemsCount: number;
  totalDamagedItemsCount: number;
  cashRefundsAmount: number;
  creditBalanceRefundsAmount: number;
  debtCancelledAmount: number;
}

// --- Mathematical Helpers ---

export function round2(num: number): number {
  return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
}

export function round4(num: number): number {
  return Math.round((Number(num || 0) + Number.EPSILON) * 10000) / 10000;
}

export function safeDiv(num: number, den: number): number {
  if (!den || isNaN(den) || den === 0) return 0;
  return num / den;
}

export function formatCurrency(amount: number): string {
  return "₪" + (Number(amount) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// --- Reason and Condition Dictionaries ---

export const RETURN_REASONS: Record<ReturnReason, { ar: string; en: string }> = {
  wrong_item: { ar: "خطأ في الصرف / صنف غير مطلوب", en: "Wrong item dispensed" },
  customer_request: { ar: "رغبة العميل / عدم الحاجة", en: "Customer request / not needed" },
  patient_reaction: { ar: "حساسية المريض / أمر الطبيب", en: "Adverse reaction / Doctor cancelled" },
  defect_damaged: { ar: "عيب مصنعي / تلف في العبوة", en: "Defective packaging / damaged" },
  expired_on_shelf: { ar: "صلاحية غير مناسبة", en: "Unsuitable shelf-life / expiry" },
  other: { ar: "أسباب أخرى", en: "Other reason" },
};

export const RETURN_CONDITIONS: Record<ReturnCondition, { ar: string; en: string }> = {
  restock: { ar: "صالح للبيع (إعادة للمخزن)", en: "Sellable (Restock to inventory)" },
  damaged: { ar: "تالف / مفتوح (تسجيل كعجز)", en: "Damaged / Opened (Write off as loss)" },
};

// --- Normalizers ---

export function normalizePaymentMethod(pm: any): string {
  if (!pm) return "cash";
  const s = String(pm).trim().toLowerCase();
  if (["credit", "آجل", "اجل", "ذمم", "دين"].includes(s)) return "credit";
  if (["card", "visa", "mastercard", "بطاقة", "فيزا", "شبكة"].includes(s)) return "card";
  if (["bank", "bank_transfer", "تحويل", "شيك", "شيكات"].includes(s)) return "bank";
  if (["jawwal", "jawwal_pay", "جوال_باي", "جوال باي"].includes(s)) return "jawwal_pay";
  if (["palpay", "بال_باي", "بال باي"].includes(s)) return "palpay";
  if (["maalchat", "مالتشات"].includes(s)) return "maalchat";
  if (["split", "مجزأ", "متعدد"].includes(s)) return "split";
  return "cash";
}

export function getPaymentMethodName(pm: string, language: string = "ar"): string {
  const norm = normalizePaymentMethod(pm);
  const isEn = language === "en";
  switch (norm) {
    case "credit":
      return isEn ? "Customer Account (Debt)" : "آجل (ذمم عملاء)";
    case "card":
      return isEn ? "Credit / Debit Card" : "بطاقة بنكية / فيزا";
    case "bank":
      return isEn ? "Bank Transfer" : "تحويل بنكي / شيكات";
    case "jawwal_pay":
      return isEn ? "Jawwal Pay" : "جوال باي (Jawwal Pay)";
    case "palpay":
      return isEn ? "PalPay" : "بال باي (PalPay)";
    case "maalchat":
      return isEn ? "MaalChat" : "مالتشات (MaalChat)";
    case "split":
      return isEn ? "Split Payment" : "دفع متعدد (مجزأ)";
    default:
      return isEn ? "Cash (Drawer)" : "نقداً (كاش في الدرج)";
  }
}

// --- Core Calculations ---

/**
 * Computes exact item-by-item refund settlement respecting line-item discounts,
 * packaging conversion (box vs strip vs pill), and debt vs cash drawer separation.
 */
export function computeRefundSettlement(params: {
  mode: "full" | "partial";
  sale: any;
  itemsToRefund?: ReturnItemRequest[];
  customerDebt?: number;
  options?: ReturnOptions;
}): ReturnSettlementResult {
  const { mode, sale, customerDebt = 0, options = {} } = params;
  const saleTotal = Number(sale?.total || 0);

  // Parse items safely
  let saleItems: any[] = [];
  try {
    saleItems = typeof sale?.items === "string" ? JSON.parse(sale.items) : (sale?.items || []);
  } catch {
    saleItems = [];
  }

  // Calculate original gross revenue of sale items
  const gross = saleItems.reduce((sum: number, it: any) => {
    const qty = Number(it.cartQty ?? it.qty ?? 0);
    const price = Number(it.unitPrice ?? it.price ?? 0);
    return sum + qty * price;
  }, 0);

  // If invoice had general discount, apply proportional ratio to unit prices
  const discountRatio = gross > 0 && saleTotal > 0 ? saleTotal / gross : 1;

  // Determine which items to refund
  const requests: ReturnItemRequest[] = [];
  if (mode === "full") {
    for (const it of saleItems) {
      const remainingQty = Number(it.cartQty ?? it.qty ?? 0);
      if (remainingQty > 0) {
        requests.push({
          id: it.id,
          qty: remainingQty,
          condition: options.condition || "restock",
          reason: options.reason || "customer_request",
        });
      }
    }
  } else {
    for (const req of params.itemsToRefund || []) {
      const q = Number(req.returnQty ?? req.qty ?? 0);
      if (q > 0) {
        requests.push({
          id: req.id,
          qty: q,
          condition: req.condition || options.condition || "restock",
          reason: req.reason || options.reason || "customer_request",
        });
      }
    }
  }

  // Calculate detailed items
  let grossRefund = 0;
  let netRefund = 0;
  const itemsCalculated: ReturnItemCalculation[] = [];

  for (const req of requests) {
    const saleItem = saleItems.find((candidate) => String(candidate.id) === String(req.id));
    if (!saleItem) continue;

    const available = Number(saleItem.cartQty ?? saleItem.qty ?? 0);
    const returnQty = Math.min(available, Math.max(0, req.qty));
    if (returnQty <= 0) continue;

    const unitPrice = Number(saleItem.unitPrice ?? saleItem.price ?? 0);
    const unitCost = Number(saleItem.cost ?? 0);
    const unitCount = Number(saleItem.unitCount ?? 1) || 1;

    const lineGross = round2(returnQty * unitPrice);
    const lineNet = round2(lineGross * discountRatio);
    const lineDiscount = round2(lineGross - lineNet);

    grossRefund += lineGross;
    netRefund += lineNet;

    itemsCalculated.push({
      id: String(saleItem.id),
      name: String(saleItem.name || saleItem.drug_name || "صنف مسترجع"),
      barcode: saleItem.barcode || "",
      returnQty,
      unitPrice,
      cost: unitCost,
      unitCount,
      grossAmount: lineGross,
      discountPortion: lineDiscount,
      netRefundAmount: lineNet,
      condition: req.condition || "restock",
      reason: req.reason || "customer_request",
      batch_number: saleItem.batch_number || saleItem.batch || "",
      expiry: saleItem.expiry || saleItem.expiry_date || "",
      isRestockable: (req.condition || "restock") === "restock",
    });
  }

  const finalNetRefund = round2(netRefund);
  const discountReversed = round2(grossRefund - finalNetRefund);

  // Check if this refund fully exhausts the sale
  const isFullReturn = mode === "full" || saleItems.every((si) => {
    const req = requests.find((r) => String(r.id) === String(si.id));
    const retQ = req ? req.qty : 0;
    const curQ = Number(si.cartQty ?? si.qty ?? 0);
    return curQ - retQ <= 0;
  });

  const remainingSaleTotal = round2(Math.max(0, saleTotal - finalNetRefund));

  // Payment Breakdown & Customer Debt Settlement
  const origPm = normalizePaymentMethod(sale?.paymentMethod);
  let salePayments: Record<string, number> = {};
  try {
    salePayments = typeof sale?.payments === "string" ? JSON.parse(sale.payments) : (sale?.payments || {});
  } catch {
    salePayments = {};
  }

  const isCreditSale = origPm === "credit" || Number(salePayments.credit || 0) > 0;
  const creditPart = origPm === "credit"
    ? saleTotal
    : Math.max(0, Number(salePayments.credit || 0));

  // Determine maximum debt that can be cancelled
  const maxDebtAllowed = round2(Math.min(finalNetRefund, creditPart, Math.max(0, customerDebt)));

  // If debt cancellation amount is specified in options, respect it; otherwise cancel as much debt as allowed
  let debtToCancel = options.debtToCancel != null
    ? round2(Math.min(options.debtToCancel, maxDebtAllowed))
    : maxDebtAllowed;

  // Paid cash amount to refund to customer
  let paidAmountToRefund = round2(Math.max(0, finalNetRefund - debtToCancel));

  // Settlement Mode
  const returnPaidMode: RefundSettlementMode = options.returnPaidMode || (
    isCreditSale && paidAmountToRefund === 0 ? "cash_out" : "cash_out"
  );

  const customerBeforeDebt = round2(customerDebt);
  const debtReduction = round2(debtToCancel + (returnPaidMode === "credit_balance" ? paidAmountToRefund : 0));
  const customerAfterDebt = round2(customerBeforeDebt - debtReduction);

  const paidMethodName = getPaymentMethodName(origPm);

  return {
    isFullReturn,
    totalItemsRequested: itemsCalculated.length,
    grossRefundAmount: round2(grossRefund),
    discountReversed,
    netRefundAmount: finalNetRefund,
    debtToCancel,
    paidAmountToRefund,
    returnPaidMode,
    paidMethodName,
    items: itemsCalculated,
    remainingSaleTotal,
    creditPart,
    customerBeforeDebt,
    customerAfterDebt,
  };
}

// --- Robust Refund Amount Resolver for Historic & Modern Sales ---

export function resolveRefundAmount(sale: any, parsedItems?: any[], parsedNotes?: any): number {
  if (!sale) return 0;

  // 1. Explicit refundedAmount
  if (sale.refundedAmount != null && Number(sale.refundedAmount) > 0) {
    return round2(Number(sale.refundedAmount));
  }

  // 2. Notes object
  const notes = parsedNotes || (typeof sale.notes === "object" ? sale.notes : (() => {
    try { return JSON.parse(sale.notes || "{}"); } catch { return {}; }
  })());

  const noteAmt = notes?.refundAmount ?? notes?.reflectedPaid ?? notes?.totalRefund ?? notes?.amount;
  if (noteAmt != null && Number(noteAmt) > 0) {
    return round2(Number(noteAmt));
  }

  // 3. Negative total (e.g. refund_proxy rows where total = -30)
  const totalNum = Number(sale.total);
  if (Number.isFinite(totalNum) && totalNum < 0) {
    return round2(Math.abs(totalNum));
  }

  // 4. Positive total (if preserved on refunded sale)
  if (Number.isFinite(totalNum) && totalNum > 0) {
    return round2(totalNum);
  }

  // 5. Subtotal minus discount (legacy refunded sales where total was updated to 0)
  const subtotalNum = Number(sale.subtotal || 0);
  const discountNum = Number(sale.discount || 0);
  if (subtotalNum > 0) {
    return round2(Math.max(0, subtotalNum - discountNum));
  }

  // 6. Items valuation
  const items = parsedItems || (Array.isArray(sale.items) ? sale.items : (() => {
    try { return JSON.parse(sale.items || "[]"); } catch { return []; }
  })());

  if (Array.isArray(items) && items.length > 0) {
    const itemsGross = items.reduce((sum: number, item: any) => {
      const p = Number(item.unitPrice ?? item.price ?? 0);
      const q = Number(item.returnedQty ?? item.returnQty ?? item.qty ?? item.cartQty ?? item.deductQty ?? 1);
      return sum + p * q;
    }, 0);
    if (itemsGross > 0) {
      return round2(Math.max(0, itemsGross - discountNum));
    }
  }

  return 0;
}

// --- KPI Aggregator ---

export function calculateReturnsKPIs(returnsList: any[]): ReturnsKPIs {
  let totalReturnsCount = 0;
  let totalRefundAmount = 0;
  let totalRestockedItemsCount = 0;
  let totalDamagedItemsCount = 0;
  let cashRefundsAmount = 0;
  let creditBalanceRefundsAmount = 0;
  let debtCancelledAmount = 0;

  for (const ret of returnsList || []) {
    if (!ret) continue;
    totalReturnsCount++;

    let items: any[] = [];
    try {
      items = typeof ret.items === "string" ? JSON.parse(ret.items) : (ret.items || []);
    } catch {
      items = [];
    }

    const amt = resolveRefundAmount(ret, items);
    totalRefundAmount += amt;

    for (const item of items) {
      const q = Number(item.returnedQty ?? item.returnQty ?? item.qty ?? 0);
      if (item.condition === "damaged") {
        totalDamagedItemsCount += q;
      } else {
        totalRestockedItemsCount += q;
      }
    }

    const notesStr = typeof ret.notes === "string" ? ret.notes : JSON.stringify(ret.notes || {});
    const mode = ret.returnPaidMode || (notesStr.includes("credit_balance") ? "credit_balance" : "cash_out");
    if (mode === "credit_balance") {
      creditBalanceRefundsAmount += amt;
    } else {
      cashRefundsAmount += amt;
    }

    if (ret.debtToCancel) {
      debtCancelledAmount += Number(ret.debtToCancel || 0);
    }
  }

  return {
    totalReturnsCount,
    totalRefundAmount: round2(totalRefundAmount),
    totalRestockedItemsCount,
    totalDamagedItemsCount,
    cashRefundsAmount: round2(cashRefundsAmount),
    creditBalanceRefundsAmount: round2(creditBalanceRefundsAmount),
    debtCancelledAmount: round2(debtCancelledAmount),
  };
}

// --- Official Credit Note / Return Voucher HTML Generator ---

export function buildCreditNoteHtml(params: {
  creditNoteNumber: string;
  originalSaleId: string;
  originalDate?: string;
  returnDate: string;
  pharmacyName: string;
  branchName: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  settlement: ReturnSettlementResult;
  language?: string;
}): string {
  const {
    creditNoteNumber,
    originalSaleId,
    originalDate = "",
    returnDate,
    pharmacyName,
    branchName,
    cashierName,
    customerName = "عميل نقدي",
    customerPhone = "",
    settlement,
    language = "ar",
  } = params;

  const isRtl = language !== "en";
  const fmt = (num: number) =>
    Number(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return `
    <div style="width: 100%; max-width: 780px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.8; box-sizing: border-box; padding: 24px 28px;">
      
      <!-- Top Header & Brand -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2.5px solid #0f3d2e; padding-bottom: 14px;">
        <tr>
          <td style="vertical-align: middle; width: 55%; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold; color: #0f3d2e; line-height: 1.4;">
              ${isRtl ? "إشعار دائن وسند إرجاع مبيعات" : "Official Credit Note / Sales Return"}
            </h1>
            <div style="font-size: 13px; font-weight: bold; color: #64748b; margin-top: 4px;">
              ${pharmacyName} • ${branchName}
            </div>
          </td>
          <td style="vertical-align: middle; width: 45%;">
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.8;">
                <tr>
                  <td style="width: 110px; font-weight: bold; color: #0f3d2e;">${isRtl ? "رقم إشعار الدائن:" : "Credit Note #:"}</td>
                  <td style="color: #0f172a; font-weight: bold; font-family: monospace;">${creditNoteNumber}</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; color: #0f3d2e;">${isRtl ? "الفاتورة الأصلية:" : "Original Inv #:"}</td>
                  <td style="color: #334155; font-family: monospace;">#${originalSaleId}</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; color: #0f3d2e;">${isRtl ? "تاريخ الإرجاع:" : "Return Date:"}</td>
                  <td style="color: #334155;">${returnDate}</td>
                </tr>
                <tr>
                  <td style="width: 110px; font-weight: bold; color: #0f3d2e;">${isRtl ? "الكاشير / الصيدلي:" : "Cashier:"}</td>
                  <td style="color: #334155;">${cashierName}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Customer Info Block -->
      <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div><strong>${isRtl ? "العميل:" : "Customer:"}</strong> ${customerName} ${customerPhone ? `(${customerPhone})` : ""}</div>
        <div><strong>${isRtl ? "طريقة التسوية:" : "Settlement Mode:"}</strong> ${settlement.returnPaidMode === "credit_balance" ? (isRtl ? "إيداع برصيد العميل" : "Store Credit") : (isRtl ? "صرف نقدي من الدرج" : "Cash Drawer Outflow")}</div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f3d2e; color: #ffffff;">
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 30px; text-align: center;">#</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "الصنف / الدواء" : "Item / Medicine"}</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 85px; text-align: center;">${isRtl ? "رقم التشغيلة" : "Batch #"}</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 70px; text-align: center;">${isRtl ? "الكمية" : "Qty"}</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 85px; text-align: center;">${isRtl ? "السعر الإفرادي" : "Unit Price"}</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 85px; text-align: center;">${isRtl ? "الحالة" : "Condition"}</th>
            <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 95px; text-align: center;">${isRtl ? "صافي المرتجع" : "Refund (₪)"}</th>
          </tr>
        </thead>
        <tbody>
          ${settlement.items.map((it, idx) => `
            <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 9px 10px; border: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${it.name}</td>
              <td style="padding: 9px 10px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${it.batch_number || "-"}</td>
              <td style="padding: 9px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${it.returnQty}</td>
              <td style="padding: 9px 10px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(it.unitPrice)}</td>
              <td style="padding: 9px 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 10.5px; color: ${it.condition === "damaged" ? "#be123c" : "#166534"}; font-weight: bold;">
                ${it.condition === "damaged" ? (isRtl ? "تالف (إتلاف)" : "Damaged") : (isRtl ? "صالح (للمخزن)" : "Restocked")}
              </td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857;">₪${fmt(it.netRefundAmount)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Financial Summary Cards -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-left: 12px;">
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; font-size: 11.5px;">
              <div style="font-weight: bold; color: #0f3d2e; margin-bottom: 6px;">${isRtl ? "الأثر المحاسبي للتسوية:" : "Accounting Impact:"}</div>
              ${settlement.debtToCancel > 0 ? `
                <div style="margin-bottom: 4px; color: #92400e;">• ${isRtl ? "شطب وتخفيض ذمة العميل:" : "Debt Cancelled:"} <strong>₪${fmt(settlement.debtToCancel)}</strong></div>
              ` : ""}
              ${settlement.paidAmountToRefund > 0 ? `
                <div style="margin-bottom: 4px; color: #166534;">• ${settlement.returnPaidMode === "credit_balance" ? (isRtl ? "إيداع رصيد دائن للعميل:" : "Store Credit Deposited:") : (isRtl ? "مبلغ مسترد نقداً من الدرج:" : "Cash Drawer Refund:")} <strong>₪${fmt(settlement.paidAmountToRefund)}</strong></div>
              ` : ""}
              <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">
                ${isRtl ? "حالة الفاتورة بعد الإرجاع:" : "Invoice status after return:"} <strong>${settlement.isFullReturn ? (isRtl ? "مسترجعة بالكامل (Refunded)" : "Fully Refunded") : (isRtl ? `مسترجعة جزئياً - المتبقي: ₪${fmt(settlement.remainingSaleTotal)}` : `Partially Refunded - Remainder: ₪${fmt(settlement.remainingSaleTotal)}`)}</strong>
              </div>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-right: 12px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; color: #64748b;">${isRtl ? "إجمالي قيمة المرتجع قبل الخصم:" : "Gross Return Amount:"}</td>
                <td style="padding: 6px 8px; text-align: end; font-weight: bold;">₪${fmt(settlement.grossRefundAmount)}</td>
              </tr>
              ${settlement.discountReversed > 0 ? `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 8px; color: #b45309;">${isRtl ? "عكس الخصم الممنوح:" : "Discount Reversal:"}</td>
                <td style="padding: 6px 8px; text-align: end; font-weight: bold; color: #b45309;">-₪${fmt(settlement.discountReversed)}</td>
              </tr>
              ` : ""}
              <tr style="border-top: 2px solid #0f3d2e; background: #ecfdf5;">
                <td style="padding: 10px 8px; font-size: 14px; font-weight: bold; color: #047857;">${isRtl ? "صافي المبلغ المسترد:" : "Net Refund Total:"}</td>
                <td style="padding: 10px 8px; text-align: end; font-size: 16px; font-weight: bold; color: #047857;">₪${fmt(settlement.netRefundAmount)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Signatures Block -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px; page-break-inside: avoid;">
        <tr>
          <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 30px;">${isRtl ? "توقيع مستلم المرتجع (العميل)" : "Customer Signature"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 70%; margin: 0 auto; padding-top: 4px; font-size: 9px; color: #94a3b8;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 50%; text-align: center; vertical-align: top; padding: 10px;">
            <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 30px;">${isRtl ? "اعتماد الصيدلي المسئول" : "Pharmacist Approval"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 70%; margin: 0 auto; padding-top: 4px; font-size: 9px; color: #94a3b8;">${isRtl ? "الختم والتوقيع" : "Stamp & Signature"}</div>
          </td>
        </tr>
      </table>

      <div style="border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 8px; text-align: center; font-size: 10px; color: #94a3b8;">
        ${isRtl ? "نظام روشتة لإدارة الصيدليات • إشعار دائن رسمي صادر وموثق آلياً" : "Roshetta Pharmacy System • Official Automated Credit Note"}
      </div>
    </div>
  `;
}
