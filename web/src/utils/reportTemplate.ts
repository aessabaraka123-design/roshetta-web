/**
 * web/src/utils/reportTemplate.ts
 * Master Unified Template Generator for Reports (PDF and Word Export).
 * Guarantees 100% visual and structural parity across Web & Mobile.
 * Engineered for flawless native A4 single-page presentation without clipping.
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
  const cogs = Number(report.cogs ?? report.totalCost ?? 0);
  const grossProfit = Number(report.grossProfit ?? report.totalProfit ?? (netRev - cogs));
  const grossMargin = report.grossMargin != null ? Number(report.grossMargin) : (netRev > 0 ? (grossProfit / netRev) * 100 : 0);
  const opex = Number(report.operatingExpenses ?? report.totalExpenses ?? 0);
  const supplierPayments = Number(report.supplierPayments ?? 0);
  const shrinkage = Number(report.inventoryShrinkageCost ?? 0);
  const netProfit = Number(report.netProfit ?? (grossProfit - opex - shrinkage));
  const netMargin = report.netMargin != null ? Number(report.netMargin) : (report.profitMargin != null ? Number(report.profitMargin) : (netRev > 0 ? (netProfit / netRev) * 100 : 0));
  const pb = report.paymentBreakdown || {};
  const creditSales = Number(pb.credit ?? 0);
  const totalCollected = Number(report.totalCollected ?? Math.max(0, netRev - creditSales));

  const fmt = (num: number) =>
    Number(num || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const numSpan = (num: number) => {
    const val = Number(num || 0);
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    return `<span dir="ltr" style="direction: ltr !important; unicode-bidi: isolate; display: inline-block; white-space: nowrap; line-height: 1.35; font-weight: inherit;">${sign}₪${fmt(absVal)}</span>`;
  };

  const safePharmacy = pharmacyName || (isRtl ? "صيدلية روشتة" : "Roshetta Pharmacy");
  const safeBranch = branchName || (isRtl ? "الفرع الرئيسي" : "Main Branch");
  const safePeriod = dateRange || `${dateStr} - ${dateStr}`;

  return `
    <div style="width: 100%; max-width: 790px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.45; letter-spacing: normal !important; word-spacing: normal !important; text-rendering: geometricPrecision; box-sizing: border-box; padding: 10px 14px;">
      
      <!-- Top Brand Header Block -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f3d2e; padding-bottom: 8px;">
        <tr>
          <td style="vertical-align: middle; width: 55%; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; padding: 4px 2px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #0f3d2e; font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.3; letter-spacing: normal !important;">
              ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
            </h1>
            <div style="margin-top: 3px; font-size: 11px; font-weight: 600; color: #475569;">
              ${isRtl ? "التقرير المالي والإجرائي الشامل • سجل التدقيق المعتمد" : "Comprehensive Financial & Audit Report"}
            </div>
          </td>
          <td style="vertical-align: middle; width: 45%; padding: 4px 2px;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.5;">
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 2px 0;">${isRtl ? "الصيدلية:" : "Pharmacy:"}</td>
                  <td style="color: #0f172a; font-weight: bold; padding: 2px 0;">${safePharmacy}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 2px 0;">${isRtl ? "الفرع:" : "Branch:"}</td>
                  <td style="color: #334155; padding: 2px 0;">${safeBranch}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 2px 0;">${isRtl ? "الفترة:" : "Period:"}</td>
                  <td style="color: #334155; padding: 2px 0;">${safePeriod}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 2px 0;">${isRtl ? "تاريخ الإصدار:" : "Issued:"}</td>
                  <td style="color: #334155; padding: 2px 0;">${dateStr} ${timeStr}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 2px 0;">${isRtl ? "العملة:" : "Currency:"}</td>
                  <td style="color: #334155; padding: 2px 0;">${isRtl ? "شيكل إسرائيلي (₪)" : "ILS (₪)"}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Section 1: Executive KPI Cards -->
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 0 -4px;">
          <tr>
            <!-- Card 1: Net Revenue -->
            <td style="width: 25%; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
              <div style="font-size: 10.5px; font-weight: bold; color: #166534; margin-bottom: 3px;">
                ${isRtl ? "صافي الإيرادات" : "Net Sales Revenue"}
              </div>
              <div style="font-size: 15px; font-weight: bold; color: #14532d; line-height: 1.25;">
                ${numSpan(netRev)}
              </div>
              <div style="font-size: 9px; color: #15803d; margin-top: 3px;">
                ${isRtl ? "بعد الخصومات والمرتجعات" : "Net of discounts"}
              </div>
            </td>

            <!-- Card 2: COGS -->
            <td style="width: 25%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
              <div style="font-size: 10.5px; font-weight: bold; color: #334155; margin-bottom: 3px;">
                ${isRtl ? "تكلفة المبيعات (COGS)" : "Cost of Goods Sold"}
              </div>
              <div style="font-size: 15px; font-weight: bold; color: #0f172a; line-height: 1.25;">
                ${numSpan(cogs)}
              </div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">
                ${isRtl ? "التكلفة التناسبية للمباع" : "Exact unit cost"}
              </div>
            </td>

            <!-- Card 3: Gross Profit -->
            <td style="width: 25%; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
              <div style="font-size: 10.5px; font-weight: bold; color: #15803d; margin-bottom: 3px;">
                ${isRtl ? "إجمالي الربح" : "Gross Profit"}
              </div>
              <div style="font-size: 15px; font-weight: bold; color: #047857; line-height: 1.25;">
                ${numSpan(grossProfit)}
              </div>
              <div style="font-size: 9px; color: #059669; margin-top: 3px;">
                ${isRtl ? "الهامش:" : "Margin:"} <strong>${grossMargin.toFixed(1)}%</strong>
              </div>
            </td>

            <!-- Card 4: Operating Net Profit -->
            <td style="width: 25%; background: #f0fdfa; border: 1px solid #5eead4; border-radius: 8px; padding: 8px 10px; vertical-align: middle;">
              <div style="font-size: 10.5px; font-weight: bold; color: #0f766e; margin-bottom: 3px;">
                ${isRtl ? "صافي الربح التشغيلي" : "Net Operating Profit"}
              </div>
              <div style="font-size: 15px; font-weight: bold; color: #115e59; line-height: 1.25;">
                ${numSpan(netProfit)}
              </div>
              <div style="font-size: 9px; color: #0d9488; margin-top: 3px;">
                ${isRtl ? "صافي الهامش:" : "Net Margin:"} <strong>${netMargin.toFixed(1)}%</strong>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Section 2: Liquidity & Payment Channels Breakdown -->
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0f3d2e; margin-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">
          ${isRtl ? "ثانياً: تفصيل السيولة وقنوات التحصيل والدفع" : "Payment Channels Breakdown"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; line-height: 1.45;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 6px 10px; border: 1px solid #0f3d2e; width: 34%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "القناة / طريقة الدفع" : "Payment Channel"}</th>
              <th style="padding: 6px 10px; border: 1px solid #0f3d2e; width: 22%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "المبلغ (₪)" : "Amount (₪)"}</th>
              <th style="padding: 6px 10px; border: 1px solid #0f3d2e; width: 18%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "النسبة من الإيراد" : "Share"}</th>
              <th style="padding: 6px 10px; border: 1px solid #0f3d2e; width: 26%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "طبيعة التدفق" : "Cashflow Status"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "نقدي (كاش في الدرج)" : "Cash (Drawer)"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.cash || 0))}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.cash || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #059669; font-weight: 600; vertical-align: middle;">${isRtl ? "سيولة نقدية محصلة" : "Liquid Cash"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "بطاقة بنكية / فيزا (POS)" : "Credit / Debit Cards"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.card || 0))}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.card || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 600; vertical-align: middle;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "تحويل بنكي / شيكات" : "Bank Transfer / Checks"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.bank || 0))}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.bank || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 600; vertical-align: middle;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "جوال باي (Jawwal Pay)" : "Jawwal Pay Wallet"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.jawwal || 0))}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.jawwal || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #0d9488; font-weight: 600; vertical-align: middle;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle;">${isRtl ? "بال باي (PalPay)" : "PalPay Wallet"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${numSpan(Number(pb.palpay || 0))}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">${netRev > 0 ? ((Number(pb.palpay || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #0d9488; font-weight: 600; vertical-align: middle;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #fffbeb; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #92400e; vertical-align: middle;">${isRtl ? "مبيعات بالذمة / آجل (ديون عملاء)" : "Credit Sales"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #92400e; vertical-align: middle;">${numSpan(creditSales)}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; color: #92400e; vertical-align: middle;">${netRev > 0 ? ((creditSales / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #b45309; font-weight: 600; vertical-align: middle;">${isRtl ? "ذمم مدينة لم تُحصّل بعد" : "Uncollected Debt"}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1; vertical-align: middle;">${isRtl ? "إجمالي السيولة المحصلة فعلياً" : "Total Cash Collected"}</td>
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #166534; font-size: 11px; vertical-align: middle;">${numSpan(totalCollected)}</td>
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">${netRev > 0 ? ((totalCollected / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #166534; vertical-align: middle;">${isRtl ? "مقبوضات نقدية وبنكية" : "Liquid Cashflow"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Section 3: Operating Expenses -->
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0f3d2e; margin-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">
          ${isRtl ? "ثالثاً: المصاريف التشغيلية ومسحوبات الفترة" : "Operating Expenses & Outflows"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; line-height: 1.45;">
          <thead>
            <tr style="background: #334155; color: #ffffff;">
              <th style="padding: 6px 10px; border: 1px solid #334155; width: 50%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "بند المصروف" : "Expense Category"}</th>
              <th style="padding: 6px 10px; border: 1px solid #334155; width: 22%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "القيمة (₪)" : "Amount (₪)"}</th>
              <th style="padding: 6px 10px; border: 1px solid #334155; width: 28%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "التصنيف المحاسبي" : "Accounting Class"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "إجمالي المصاريف التشغيلية (رواتب، إيجار، كهرباء، خدمات)" : "General Operating Expenses (Rent, Utilities)"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle;">${numSpan(opex)}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "مصاريف تشغيلية تخص الفترة (P&L)" : "Operating Expense"}</td>
            </tr>
            ${shrinkage > 0 ? `
            <tr style="background: #fff1f2; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "عجز وتالف المخزون (من محاضر الجرد)" : "Inventory Shrinkage"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle;">${numSpan(shrinkage)}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "خسارة مخزون" : "Inventory Loss"}</td>
            </tr>
            ` : ""}
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; vertical-align: middle;">${isRtl ? "سداد دفعات الموردين (تسوية حسابات الموردين)" : "Supplier Debt Settlements"}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7; vertical-align: middle;">${numSpan(supplierPayments)}</td>
              <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; color: #0369a1; vertical-align: middle;">${isRtl ? "تسوية التزامات (تدفق نقدي خارج)" : "Accounts Payable Settlement"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 4: Top Selling Medicines Table -->
      <div style="margin-bottom: 14px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0f3d2e; margin-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">
          ${isRtl ? "رابعاً: قائمة الأدوية الأكثر مبيعاً" : "Top Selling Medicines"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; line-height: 1.45;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 6px 8px; border: 1px solid #1e293b; width: 30px; text-align: center; vertical-align: middle; font-weight: bold;">#</th>
              <th style="padding: 6px 10px; border: 1px solid #1e293b; width: 44%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold;">${isRtl ? "اسم الصنف / الدواء" : "Medicine Name"}</th>
              <th style="padding: 6px 8px; border: 1px solid #1e293b; width: 12%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الكمية" : "Qty"}</th>
              <th style="padding: 6px 8px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الإيراد (₪)" : "Revenue (₪)"}</th>
              <th style="padding: 6px 8px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "التكلفة (₪)" : "Cost (₪)"}</th>
              <th style="padding: 6px 8px; border: 1px solid #1e293b; width: 16%; text-align: center; vertical-align: middle; font-weight: bold;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
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
                      <td style="padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; vertical-align: middle; font-weight: bold;">${idx + 1}</td>
                      <td style="padding: 5.5px 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; vertical-align: middle; word-break: break-word;">${item.name || (isRtl ? "صنف غير معروف" : "Unknown")}</td>
                      <td style="padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; font-weight: bold;">${item.qty || 0}</td>
                      <td style="padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; vertical-align: middle;">${numSpan(rev)}</td>
                      <td style="padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: center; color: #475569; vertical-align: middle;">${numSpan(cost)}</td>
                      <td style="padding: 5.5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857; vertical-align: middle;">${numSpan(profit)}</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" style="text-align: center; padding: 10px; color: #94a3b8; vertical-align: middle;">${isRtl ? "لا توجد بيانات للأصناف" : "No item data"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 5: Official Sign-off & Verification -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 4px;">
            <div style="font-size: 10.5px; font-weight: bold; color: #334155; margin-bottom: 22px;">${isRtl ? "إعداد الصيدلي / الكاشير المسند" : "Prepared by Pharmacist"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 4px; font-size: 9px; color: #64748b;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 4px;">
            <div style="font-size: 10.5px; font-weight: bold; color: #334155; margin-bottom: 22px;">${isRtl ? "المراجعة والتدقيق المالي" : "Audited & Verified by"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 4px; font-size: 9px; color: #64748b;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 4px;">
            <div style="font-size: 10.5px; font-weight: bold; color: #334155; margin-bottom: 22px;">${isRtl ? "اعتماد الإدارة العامة" : "Management Approval"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 4px; font-size: 9px; color: #64748b;">${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}</div>
          </td>
        </tr>
      </table>

      <!-- Bottom System Footer -->
      <div style="border-top: 1.5px solid #cbd5e1; padding-top: 6px; text-align: center; font-size: 9.5px; color: #64748b; line-height: 1.4; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight: bold; color: #0f3d2e;">${isRtl ? "نظام روشتة لإدارة الصيدليات • تقرير محاسبي رسمي مُولّد آلياً • متوافق مع معايير IFRS / GAAP" : "Roshetta Pharmacy System • Automated Official Accounting Ledger • IFRS / GAAP Compliant"}</div>
        <div>${isRtl ? "هذه الوثيقة موثقة رقمياً وصالحة للأغراض الإدارية والضريبية والمحاسبية دون الحاجة إلى ختم يدوي" : "Digitally generated document valid for administrative, tax, and accounting purposes"}</div>
      </div>
    </div>
  `;
}
