/**
 * web/src/utils/reportTemplate.ts
 * Master Unified Template Generator for Reports (PDF and Word Export).
 * Guarantees 100% visual and structural parity across formats.
 */

export interface UnifiedReportData {
  report: any;
  pharmacyName: string;
  dateRange: string;
  branchName?: string;
  language?: string;
}

export function buildUnifiedReportHtml({
  report,
  pharmacyName,
  dateRange,
  branchName = "الفرع الرئيسي",
  language = "ar",
}: UnifiedReportData): string {
  const isRtl = language !== "en";
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const netRev = Number(report.netRevenue ?? report.totalRevenue ?? 0);
  const grossRev = Number(report.grossRevenue ?? (netRev + (Number(report.totalDiscounts || report.totalDiscount || 0))));
  const cogs = Number(report.cogs ?? report.totalCost ?? 0);
  const grossProfit = Number(report.grossProfit ?? report.totalProfit ?? (netRev - cogs));
  const grossMargin = report.grossMargin != null ? Number(report.grossMargin) : (netRev > 0 ? (grossProfit / netRev) * 100 : 0);
  const opex = Number(report.operatingExpenses ?? report.totalExpenses ?? 0);
  const supplierPayments = Number(report.supplierPayments ?? 0);
  const shrinkage = Number(report.inventoryShrinkageCost ?? 0);
  const netProfit = Number(report.netProfit ?? (grossProfit - opex - shrinkage));
  const netMargin = report.netMargin != null ? Number(report.netMargin) : (report.profitMargin != null ? Number(report.profitMargin) : (netRev > 0 ? (netProfit / netRev) * 100 : 0));
  const totalDiscounts = Number(report.totalDiscounts ?? report.totalDiscount ?? 0);
  const totalVat = Number(report.totalVat ?? 0);
  const pb = report.paymentBreakdown || {};
  const creditSales = Number(pb.credit || 0);
  const totalCollected = Number(report.totalCollected ?? Math.max(0, netRev - creditSales));

  const fmt = (num: number) =>
    Number(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const numSpan = (num: number) => {
    const val = Number(num || 0);
    const prefix = val < 0 ? "-" : "";
    const absVal = Math.abs(val);
    return `<span dir="ltr" style="direction: ltr; unicode-bidi: isolate; display: inline-block; white-space: nowrap; line-height: 1.5; font-weight: inherit;">${prefix}${fmt(absVal)} ₪</span>`;
  };

  return `
    <div style="width: 100%; max-width: 820px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.9; letter-spacing: normal !important; word-spacing: normal !important; text-rendering: geometricPrecision; box-sizing: border-box; padding: 20px 24px;">
      
      <!-- Top Brand Header Block -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2.5px solid #0f3d2e; padding-bottom: 14px;">
        <tr>
          <td style="vertical-align: middle; width: 55%; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; padding: 8px 6px;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #0f3d2e; font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.5; letter-spacing: normal !important;">
              ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
            </h1>
          </td>
          <td style="vertical-align: middle; width: 45%; padding: 8px 6px;">
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.9;">
                <tr>
                  <td style="width: 85px; font-weight: bold; color: #0f3d2e; padding: 3.5px 0;">${isRtl ? "الصيدلية:" : "Pharmacy:"}</td>
                  <td style="color: #1e293b; font-weight: bold; padding: 3.5px 0;">${pharmacyName || (isRtl ? "صيدلية روشيتة" : "Roshetta Pharmacy")}</td>
                </tr>
                <tr>
                  <td style="width: 85px; font-weight: bold; color: #0f3d2e; padding: 3.5px 0;">${isRtl ? "الفرع:" : "Branch:"}</td>
                  <td style="color: #334155; padding: 3.5px 0;">${branchName}</td>
                </tr>
                <tr>
                  <td style="width: 85px; font-weight: bold; color: #0f3d2e; padding: 3.5px 0;">${isRtl ? "الفترة:" : "Period:"}</td>
                  <td style="color: #334155; padding: 3.5px 0;">${dateRange}</td>
                </tr>
                <tr>
                  <td style="width: 85px; font-weight: bold; color: #0f3d2e; padding: 3.5px 0;">${isRtl ? "تاريخ الإصدار:" : "Issued:"}</td>
                  <td style="color: #334155; padding: 3.5px 0;">${dateStr} ${timeStr}</td>
                </tr>
                <tr>
                  <td style="width: 85px; font-weight: bold; color: #0f3d2e; padding: 3.5px 0;">${isRtl ? "العملة:" : "Currency:"}</td>
                  <td style="color: #334155; padding: 3.5px 0;">${isRtl ? "شيكل إسرائيلي (₪)" : "ILS (₪)"}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Section 1: Executive KPI Cards -->
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 -5px;">
          <tr>
            <!-- Card 1: Net Revenue -->
            <td style="width: 25%; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; vertical-align: middle;">
              <div style="font-size: 11.5px; font-weight: bold; color: #166534; line-height: 1.6; margin-bottom: 5px;">
                ${isRtl ? "صافي الإيرادات" : "Net Sales Revenue"}
              </div>
              <div style="font-size: 17px; font-weight: bold; color: #14532d; line-height: 1.4;">
                ${numSpan(netRev)}
              </div>
              <div style="font-size: 10px; color: #15803d; line-height: 1.6; margin-top: 5px;">
                ${isRtl ? "بعد الخصومات والمرتجعات" : "Net of discounts"}
              </div>
            </td>

            <!-- Card 2: COGS -->
            <td style="width: 25%; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; vertical-align: middle;">
              <div style="font-size: 11.5px; font-weight: bold; color: #334155; line-height: 1.6; margin-bottom: 5px;">
                ${isRtl ? "تكلفة المبيعات (COGS)" : "Cost of Goods Sold"}
              </div>
              <div style="font-size: 17px; font-weight: bold; color: #0f172a; line-height: 1.4;">
                ${numSpan(cogs)}
              </div>
              <div style="font-size: 10px; color: #64748b; line-height: 1.6; margin-top: 5px;">
                ${isRtl ? "التكلفة التناسبية للمباع" : "Exact unit cost"}
              </div>
            </td>

            <!-- Card 3: Gross Profit -->
            <td style="width: 25%; background: #ecfdf5; border: 1.5px solid #86efac; border-radius: 10px; padding: 12px 14px; vertical-align: middle;">
              <div style="font-size: 11.5px; font-weight: bold; color: #15803d; line-height: 1.6; margin-bottom: 5px;">
                ${isRtl ? "إجمالي الربح" : "Gross Profit"}
              </div>
              <div style="font-size: 17px; font-weight: bold; color: #047857; line-height: 1.4;">
                ${numSpan(grossProfit)}
              </div>
              <div style="font-size: 10px; color: #059669; line-height: 1.6; margin-top: 5px;">
                ${isRtl ? "الهامش:" : "Margin:"} <strong>${grossMargin.toFixed(1)}%</strong>
              </div>
            </td>

            <!-- Card 4: Operating Net Profit -->
            <td style="width: 25%; background: #f0fdfa; border: 1.5px solid #5eead4; border-radius: 10px; padding: 12px 14px; vertical-align: middle;">
              <div style="font-size: 11.5px; font-weight: bold; color: #0f766e; line-height: 1.6; margin-bottom: 5px;">
                ${isRtl ? "صافي الربح التشغيلي" : "Net Operating Profit"}
              </div>
              <div style="font-size: 17px; font-weight: bold; color: #115e59; line-height: 1.4;">
                ${numSpan(netProfit)}
              </div>
              <div style="font-size: 10px; color: #0d9488; line-height: 1.6; margin-top: 5px;">
                ${isRtl ? "صافي الهامش:" : "Net Margin:"} <strong>${netMargin.toFixed(1)}%</strong>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Section 2: Liquidity & Payment Channels Breakdown -->
      <div style="margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; line-height: 1.6;">
          ${isRtl ? "تفصيل قنوات التحصيل والدفع" : "Payment Channels Breakdown"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; table-layout: fixed; line-height: 1.9;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 11px 14px; border: 1px solid #0f3d2e; width: 34%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "القناة / طريقة الدفع" : "Payment Channel"}</th>
              <th style="padding: 11px 14px; border: 1px solid #0f3d2e; width: 22%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "المبلغ (₪)" : "Amount (₪)"}</th>
              <th style="padding: 11px 14px; border: 1px solid #0f3d2e; width: 18%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "النسبة من الإيراد" : "Share"}</th>
              <th style="padding: 11px 14px; border: 1px solid #0f3d2e; width: 26%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "طبيعة التدفق" : "Cashflow Status"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "نقدي (كاش في الدرج)" : "Cash (Drawer)"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.cash || 0))}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.cash || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #059669; vertical-align: middle;">${isRtl ? "سيولة نقدية محصلة" : "Liquid Cash"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "بطاقة بنكية / فيزا (POS)" : "Credit / Debit Cards"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.card || 0))}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.card || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #0284c7; vertical-align: middle;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "تحويل بنكي / شيكات" : "Bank Transfer / Checks"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.bank || 0))}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.bank || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #0284c7; vertical-align: middle;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "جوال باي (Jawwal Pay)" : "Jawwal Pay Wallet"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.jawwal || 0))}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.jawwal || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #0d9488; vertical-align: middle;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "بال باي (PalPay)" : "PalPay Wallet"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.palpay || 0))}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.palpay || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #0d9488; vertical-align: middle;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #fffbeb; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #92400e; vertical-align: middle;">${isRtl ? "مبيعات بالذمة / آجل (ديون عملاء)" : "Credit Sales"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #92400e; vertical-align: middle;">${numSpan(creditSales)}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; color: #92400e; vertical-align: middle;">${netRev > 0 ? ((creditSales / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #b45309; vertical-align: middle;">${isRtl ? "ذمم مدينة لم تُحصّل بعد" : "Uncollected Debt"}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td style="padding: 12px 14px; border: 1px solid #cbd5e1; vertical-align: middle;">${isRtl ? "إجمالي السيولة المحصلة فعلياً" : "Total Cash Collected"}</td>
              <td style="padding: 12px 14px; border: 1px solid #cbd5e1; text-align: center; color: #166534; font-size: 12px; vertical-align: middle;">${numSpan(totalCollected)}</td>
              <td style="padding: 12px 14px; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">${netRev > 0 ? ((totalCollected / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 12px 14px; border: 1px solid #cbd5e1; color: #166534; vertical-align: middle;">${isRtl ? "مقبوضات نقدية وبنكية" : "Liquid Cashflow"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Section 3: Operating Expenses -->
      <div style="margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; line-height: 1.6;">
          ${isRtl ? "المصاريف التشغيلية ومسحوبات الفترة" : "Operating Expenses & Outflows"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; table-layout: fixed; line-height: 1.9;">
          <thead>
            <tr style="background: #334155; color: #ffffff;">
              <th style="padding: 11px 14px; border: 1px solid #334155; width: 50%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "بند المصروف" : "Expense Category"}</th>
              <th style="padding: 11px 14px; border: 1px solid #334155; width: 22%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "القيمة (₪)" : "Amount (₪)"}</th>
              <th style="padding: 11px 14px; border: 1px solid #334155; width: 28%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "التصنيف المحاسبي" : "Accounting Class"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "إجمالي المصاريف التشغيلية (رواتب، إيجار، كهرباء، خدمات)" : "General Operating Expenses (Rent, Utilities)"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle;">${numSpan(opex)}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "مصاريف تشغيلية تخص الفترة" : "Operating Expense"}</td>
            </tr>
            ${shrinkage > 0 ? `
            <tr style="background: #fff1f2; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "عجز وتالف المخزون (من محاضر الجرد)" : "Inventory Shrinkage"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle;">${numSpan(shrinkage)}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "خسارة مخزون" : "Inventory Loss"}</td>
            </tr>
            ` : ""}
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "سداد دفعات الموردين (تسوية حسابات الموردين)" : "Supplier Debt Settlements"}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7; vertical-align: middle;">${numSpan(supplierPayments)}</td>
              <td style="padding: 11px 14px; border: 1px solid #e2e8f0; color: #0369a1; vertical-align: middle;">${isRtl ? "تسوية التزامات (تدفق نقدي خارج)" : "Accounts Payable Settlement"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 4: Daily Sales Performance Table (if exists) -->
      ${(report.dailyTrend && report.dailyTrend.length > 0) ? `
      <div style="margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; line-height: 1.6;">
          ${isRtl ? "جدول حركة المبيعات والأرباح اليومية" : "Daily Sales Performance"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; line-height: 1.9;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 20%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "التاريخ" : "Date"}</th>
              <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 22%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "المبيعات (₪)" : "Gross Sales (₪)"}</th>
              <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 20%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "التكلفة (₪)" : "COGS (₪)"}</th>
              <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 20%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
              <th style="padding: 10px 12px; border: 1px solid #0f3d2e; width: 18%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الهامش %" : "Margin %"}</th>
            </tr>
          </thead>
          <tbody>
            ${report.dailyTrend.slice(0, 5).map((d: any, idx: number) => {
              const r = Number(d.revenue || 0);
              const c = Number(d.cost || 0);
              const p = Number(d.profit != null ? d.profit : (r - c));
              const m = r > 0 ? ((p / r) * 100).toFixed(1) : "0.0";
              return `
                <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; vertical-align: middle;">${d.date}</td>
                  <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(r)}</td>
                  <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; color: #475569; vertical-align: middle;">${numSpan(c)}</td>
                  <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857; vertical-align: middle;">${numSpan(p)}</td>
                  <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #059669; vertical-align: middle;">${m}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      ` : ""}

      <!-- Section 5: Top Selling Medicines Table (Spacious & Fully Padded) -->
      <div style="margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 5px; line-height: 1.6;">
          ${isRtl ? "قائمة الأدوية الأكثر مبيعاً" : "Top Selling Medicines"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; table-layout: fixed; line-height: 1.9;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 12px 10px; border: 1px solid #1e293b; width: 34px; text-align: center; vertical-align: middle; font-weight: bold;">#</th>
              <th style="padding: 12px 14px; border: 1px solid #1e293b; width: 44%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "اسم الصنف / الدواء" : "Medicine Name"}</th>
              <th style="padding: 12px 10px; border: 1px solid #1e293b; width: 12%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الكمية" : "Qty"}</th>
              <th style="padding: 12px 12px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الإيراد (₪)" : "Revenue (₪)"}</th>
              <th style="padding: 12px 12px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "التكلفة (₪)" : "Cost (₪)"}</th>
              <th style="padding: 12px 12px; border: 1px solid #1e293b; width: 16%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
            </tr>
          </thead>
          <tbody>
            ${(report.topItems && report.topItems.length > 0)
              ? report.topItems.slice(0, 6).map((item: any, idx: number) => {
                  const rev = Number(item.revenue || item.value || 0);
                  const cost = Number(item.cost || 0);
                  const profit = Number(item.grossProfit != null ? item.grossProfit : (rev - cost));
                  return `
                    <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; vertical-align: middle; font-weight: bold;">${idx + 1}</td>
                      <td style="padding: 12px 14px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; vertical-align: middle; line-height: 1.8; word-break: break-word;">${item.name || (isRtl ? "صنف غير معروف" : "Unknown")}</td>
                      <td style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; font-weight: bold;">${item.qty || 0}</td>
                      <td style="padding: 12px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; vertical-align: middle;">${numSpan(rev)}</td>
                      <td style="padding: 12px 12px; border: 1px solid #e2e8f0; text-align: center; color: #475569; vertical-align: middle;">${numSpan(cost)}</td>
                      <td style="padding: 12px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857; vertical-align: middle;">${numSpan(profit)}</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" style="text-align: center; padding: 14px; color: #94a3b8; vertical-align: middle;">${isRtl ? "لا توجد بيانات للأصناف" : "No item data"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 6: Official Sign-off & Verification -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 8px;">
            <div style="font-size: 11.5px; font-weight: bold; color: #334155; margin-bottom: 26px; line-height: 1.6;">${isRtl ? "إعداد الكاشير / الصيدلي" : "Prepared by Pharmacist"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 5px; font-size: 9.5px; color: #94a3b8; line-height: 1.6;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 8px;">
            <div style="font-size: 11.5px; font-weight: bold; color: #334155; margin-bottom: 26px; line-height: 1.6;">${isRtl ? "المراجعة والتدقيق المالي" : "Audited & Verified by"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 5px; font-size: 9.5px; color: #94a3b8; line-height: 1.6;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 8px;">
            <div style="font-size: 11.5px; font-weight: bold; color: #334155; margin-bottom: 26px; line-height: 1.6;">${isRtl ? "اعتماد الإدارة العامة" : "Management Approval"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 5px; font-size: 9.5px; color: #94a3b8; line-height: 1.6;">${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}</div>
          </td>
        </tr>
      </table>

      <!-- Bottom System Footer -->
      <div style="border-top: 1.5px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 11px; font-weight: bold; color: #64748b; line-height: 1.6;">
        ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
      </div>
    </div>
  `;
}
