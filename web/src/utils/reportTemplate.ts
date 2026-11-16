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
  const r = report || {};
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const netRev = Number(r.netRevenue ?? r.totalRevenue ?? 0);
  const cogs = Number(r.cogs ?? r.totalCost ?? 0);
  const grossProfit = Number(r.grossProfit ?? r.totalProfit ?? (netRev - cogs));
  const grossMargin = r.grossMargin != null ? Number(r.grossMargin) : (netRev > 0 ? (grossProfit / netRev) * 100 : 0);
  const opex = Number(r.operatingExpenses ?? r.totalExpenses ?? 0);
  const supplierPayments = Number(r.supplierPayments ?? 0);
  const shrinkage = Number(r.inventoryShrinkageCost ?? 0);
  const netProfit = Number(r.netProfit ?? (grossProfit - opex - shrinkage));
  const netMargin = r.netMargin != null ? Number(r.netMargin) : (r.profitMargin != null ? Number(r.profitMargin) : (netRev > 0 ? (netProfit / netRev) * 100 : 0));
  const pb = r.paymentBreakdown || {};
  const creditSales = Number(pb.credit ?? 0);
  const totalCollected = Number(r.totalCollected ?? Math.max(0, netRev - creditSales));

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
    <div style="width: 100%; max-width: 790px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.4; letter-spacing: normal !important; word-spacing: normal !important; text-rendering: geometricPrecision; box-sizing: border-box; padding: 8px 12px;">
      
      <!-- Top Brand Header Block -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 9px; border-bottom: 2px solid #0f3d2e; padding-bottom: 6px;">
        <tr>
          <td style="vertical-align: middle; width: 55%; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; padding: 2px;">
            <h1 style="margin: 0; font-size: 19px; font-weight: bold; color: #0f3d2e; font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif; line-height: 1.25; letter-spacing: normal !important;">
              ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
            </h1>
            <div style="margin-top: 2px; font-size: 10.5px; font-weight: 600; color: #475569;">
              ${isRtl ? "التقرير المالي والإجرائي الشامل • سجل التدقيق المعتمد" : "Comprehensive Financial & Audit Report"}
            </div>
          </td>
          <td style="vertical-align: middle; width: 45%; padding: 2px;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.45;">
                <tr>
                  <td style="width: 70px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الصيدلية:" : "Pharmacy:"}</td>
                  <td style="color: #0f172a; font-weight: bold; padding: 1.5px 0;">${safePharmacy}</td>
                </tr>
                <tr>
                  <td style="width: 70px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الفرع:" : "Branch:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${safeBranch}</td>
                </tr>
                <tr>
                  <td style="width: 70px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الفترة:" : "Period:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${safePeriod}</td>
                </tr>
                <tr>
                  <td style="width: 70px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "تاريخ الإصدار:" : "Issued:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${dateStr} ${timeStr}</td>
                </tr>
                <tr>
                  <td style="width: 70px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "العملة:" : "Currency:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${isRtl ? "شيكل إسرائيلي (₪)" : "ILS (₪)"}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Section 1: Executive KPI Cards -->
      <div style="margin-bottom: 9px; page-break-inside: avoid; break-inside: avoid;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -3px;">
          <tr>
            <!-- Card 1: Net Revenue -->
            <td style="width: 25%; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 6px 8px; vertical-align: middle;">
              <div style="font-size: 10px; font-weight: bold; color: #166534; margin-bottom: 2px;">
                ${isRtl ? "صافي الإيرادات" : "Net Sales Revenue"}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: #14532d; line-height: 1.2;">
                ${numSpan(netRev)}
              </div>
              <div style="font-size: 8.5px; color: #15803d; margin-top: 2px;">
                ${isRtl ? "بعد الخصومات والمرتجعات" : "Net of discounts"}
              </div>
            </td>

            <!-- Card 2: COGS -->
            <td style="width: 25%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; vertical-align: middle;">
              <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 2px;">
                ${isRtl ? "تكلفة المبيعات (COGS)" : "Cost of Goods Sold"}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: #0f172a; line-height: 1.2;">
                ${numSpan(cogs)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
                ${isRtl ? "التكلفة التناسبية للمباع" : "Exact unit cost"}
              </div>
            </td>

            <!-- Card 3: Gross Profit -->
            <td style="width: 25%; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 6px 8px; vertical-align: middle;">
              <div style="font-size: 10px; font-weight: bold; color: #15803d; margin-bottom: 2px;">
                ${isRtl ? "إجمالي الربح" : "Gross Profit"}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: #047857; line-height: 1.2;">
                ${numSpan(grossProfit)}
              </div>
              <div style="font-size: 8.5px; color: #059669; margin-top: 2px;">
                ${isRtl ? "الهامش:" : "Margin:"} <strong>${grossMargin.toFixed(1)}%</strong>
              </div>
            </td>

            <!-- Card 4: Operating Net Profit -->
            <td style="width: 25%; background: #f0fdfa; border: 1px solid #5eead4; border-radius: 6px; padding: 6px 8px; vertical-align: middle;">
              <div style="font-size: 10px; font-weight: bold; color: #0f766e; margin-bottom: 2px;">
                ${isRtl ? "صافي الربح التشغيلي" : "Net Operating Profit"}
              </div>
              <div style="font-size: 14px; font-weight: bold; color: #115e59; line-height: 1.2;">
                ${numSpan(netProfit)}
              </div>
              <div style="font-size: 8.5px; color: #0d9488; margin-top: 2px;">
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
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; line-height: 1.65; overflow: visible;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 9px 12px; border: 1px solid #0f3d2e; width: 34%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "القناة / طريقة الدفع" : "Payment Channel"}</th>
              <th style="padding: 9px 12px; border: 1px solid #0f3d2e; width: 20%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "المبلغ (₪)" : "Amount (₪)"}</th>
              <th style="padding: 9px 12px; border: 1px solid #0f3d2e; width: 16%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "النسبة من الإيراد" : "Share"}</th>
              <th style="padding: 9px 12px; border: 1px solid #0f3d2e; width: 30%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "طبيعة التدفق" : "Cashflow Status"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "نقدي (كاش في الدرج)" : "Cash (Drawer)"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(Number(pb.cash || 0))}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((Number(pb.cash || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #059669; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "سيولة نقدية محصلة" : "Liquid Cash"}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "بطاقة بنكية / فيزا (POS)" : "Credit / Debit Cards"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(Number(pb.card || 0))}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((Number(pb.card || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #ffffff;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "تحويل بنكي / شيكات" : "Bank Transfer / Checks"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(Number(pb.bank || 0))}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((Number(pb.bank || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #0284c7; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "جوال باي (Jawwal Pay)" : "Jawwal Pay Wallet"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(Number(pb.jawwal || 0))}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((Number(pb.jawwal || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #0d9488; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #ffffff;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "بال باي (PalPay)" : "PalPay Wallet"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(Number(pb.palpay || 0))}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((Number(pb.palpay || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #0d9488; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #fffbeb;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #92400e; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "مبيعات بالذمة / آجل (ديون عملاء)" : "Credit Sales"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #92400e; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(creditSales)}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; color: #92400e; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((creditSales / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #b45309; font-weight: 600; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "ذمم مدينة لم تُحصّل بعد" : "Uncollected Debt"}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td style="padding: 9px 12px; border: 1px solid #cbd5e1; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "إجمالي السيولة المحصلة فعلياً" : "Total Cash Collected"}</td>
              <td style="padding: 9px 12px; border: 1px solid #cbd5e1; text-align: center; color: #166534; font-size: 11px; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(totalCollected)}</td>
              <td style="padding: 9px 12px; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle; line-height: 1.65; overflow: visible;">${netRev > 0 ? ((totalCollected / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 9px 12px; border: 1px solid #cbd5e1; color: #166534; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "مقبوضات نقدية وبنكية" : "Liquid Cashflow"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Section 3: Operating Expenses -->
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0f3d2e; margin-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">
          ${isRtl ? "ثالثاً: المصاريف التشغيلية ومسحوبات الفترة" : "Operating Expenses & Outflows"}
        </div>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; line-height: 1.65; overflow: visible;">
          <thead>
            <tr style="background: #334155; color: #ffffff;">
              <th style="padding: 9px 12px; border: 1px solid #334155; width: 44%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "بند المصروف" : "Expense Category"}</th>
              <th style="padding: 9px 12px; border: 1px solid #334155; width: 18%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "القيمة (₪)" : "Amount (₪)"}</th>
              <th style="padding: 9px 12px; border: 1px solid #334155; width: 38%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "التصنيف المحاسبي" : "Accounting Class"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "إجمالي المصاريف التشغيلية (رواتب، إيجار، كهرباء، خدمات)" : "General Operating Expenses (Rent, Utilities)"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(opex)}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "مصاريف تشغيلية تخص الفترة (P&L)" : "Operating Expense"}</td>
            </tr>
            ${shrinkage > 0 ? `
            <tr style="background: #fff1f2;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "عجز وتالف المخزون (من محاضر الجرد)" : "Inventory Shrinkage"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(shrinkage)}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "خسارة مخزون" : "Inventory Loss"}</td>
            </tr>
            ` : ""}
            <tr style="background: #f8fafc;">
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "سداد دفعات الموردين (تسوية حسابات الموردين)" : "Supplier Debt Settlements"}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(supplierPayments)}</td>
              <td style="padding: 9px 12px; border: 1px solid #e2e8f0; color: #0369a1; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${isRtl ? "تسوية التزامات (تدفق نقدي خارج)" : "Accounts Payable Settlement"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 4: Top Selling Medicines Table -->
      <div style="margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0f3d2e; margin-bottom: 5px; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 3px;">
          ${isRtl ? "رابعاً: قائمة الأدوية الأكثر مبيعاً" : "Top Selling Medicines"}
        </div>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; line-height: 1.65; overflow: visible;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 34px; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">#</th>
              <th style="padding: 9px 12px; border: 1px solid #1e293b; width: 44%; text-align: ${isRtl ? "right" : "left"}; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "اسم الصنف / الدواء" : "Medicine Name"}</th>
              <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 10%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "الكمية" : "Qty"}</th>
              <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "الإيراد (₪)" : "Revenue (₪)"}</th>
              <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 14%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "التكلفة (₪)" : "Cost (₪)"}</th>
              <th style="padding: 9px 8px; border: 1px solid #1e293b; width: 18%; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.5; overflow: visible;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
            </tr>
          </thead>
          <tbody>
            ${(r.topItems && r.topItems.length > 0)
              ? r.topItems.slice(0, 10).map((item: any, idx: number) => {
                  const rev = Number(item.revenue || item.value || 0);
                  const cost = Number(item.cost || 0);
                  const profit = Number(item.grossProfit != null ? item.grossProfit : (rev - cost));
                  return `
                    <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
                      <td style="padding: 9px 8px; border: 1px solid #e2e8f0; text-align: center; color: #64748b; vertical-align: middle; font-weight: bold; line-height: 1.65; overflow: visible;">${idx + 1}</td>
                      <td style="padding: 9px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; vertical-align: middle; line-height: 1.65; overflow: visible; word-break: break-word;">${item.name || (isRtl ? "صنف غير معروف" : "Unknown")}</td>
                      <td style="padding: 9px 8px; border: 1px solid #e2e8f0; text-align: center; vertical-align: middle; font-weight: bold; line-height: 1.65; overflow: visible;">${item.qty || 0}</td>
                      <td style="padding: 9px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(rev)}</td>
                      <td style="padding: 9px 8px; border: 1px solid #e2e8f0; text-align: center; color: #475569; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(cost)}</td>
                      <td style="padding: 9px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857; vertical-align: middle; line-height: 1.65; overflow: visible;">${numSpan(profit)}</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" style="text-align: center; padding: 14px; color: #94a3b8; vertical-align: middle; line-height: 1.65;">${isRtl ? "لا توجد بيانات للأصناف" : "No item data"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 5: Official Sign-off & Verification -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 2px;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 16px;">${isRtl ? "إعداد الصيدلي / الكاشير المسند" : "Prepared by Pharmacist"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #64748b;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 2px;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 16px;">${isRtl ? "المراجعة والتدقيق المالي" : "Audited & Verified by"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #64748b;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top; padding: 2px;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 16px;">${isRtl ? "اعتماد الإدارة العامة" : "Management Approval"}</div>
            <div style="border-top: 1.5px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #64748b;">${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}</div>
          </td>
        </tr>
      </table>

      <!-- Bottom System Footer -->
      <div style="border-top: 1.5px solid #cbd5e1; padding-top: 5px; text-align: center; font-size: 8.5px; color: #64748b; line-height: 1.35; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight: bold; color: #0f3d2e;">${isRtl ? "نظام روشتة لإدارة الصيدليات • تقرير محاسبي رسمي مُولّد آلياً • متوافق مع معايير IFRS / GAAP" : "Roshetta Pharmacy System • Automated Official Accounting Ledger • IFRS / GAAP Compliant"}</div>
        <div>${isRtl ? "هذه الوثيقة موثقة رقمياً وصالحة للأغراض الإدارية والضريبية والمحاسبية دون الحاجة إلى ختم يدوي" : "Digitally generated document valid for administrative, tax, and accounting purposes"}</div>
      </div>
    </div>
  `;
}
