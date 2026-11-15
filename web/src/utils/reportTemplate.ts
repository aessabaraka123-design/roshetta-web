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
    return `<span dir="ltr" style="direction: ltr; unicode-bidi: isolate; display: inline-block; white-space: nowrap;">${prefix}₪${fmt(absVal)}</span>`;
  };

  return `
    <div style="width: 100%; max-width: 800px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: Tahoma, Arial, 'Segoe UI', sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.35; box-sizing: border-box; padding: 12px 16px;">
      
      <!-- Top Brand Header Block -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f3d2e; padding-bottom: 8px;">
        <tr>
          <td style="vertical-align: middle; width: 55%; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"};">
            <h1 style="margin: 0; font-size: 21px; font-weight: bold; color: #0f3d2e; font-family: Tahoma, Arial, sans-serif; line-height: 1.2;">
              ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
            </h1>
          </td>
          <td style="vertical-align: middle; width: 45%;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 10px; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.5;">
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الصيدلية:" : "Pharmacy:"}</td>
                  <td style="color: #1e293b; font-weight: bold; padding: 1.5px 0;">${pharmacyName || (isRtl ? "صيدلية روشيتة" : "Roshetta Pharmacy")}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الفرع:" : "Branch:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${branchName}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "الفترة:" : "Period:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${dateRange}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "تاريخ الإصدار:" : "Issued:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${dateStr} ${timeStr}</td>
                </tr>
                <tr>
                  <td style="width: 75px; font-weight: bold; color: #0f3d2e; padding: 1.5px 0;">${isRtl ? "العملة:" : "Currency:"}</td>
                  <td style="color: #334155; padding: 1.5px 0;">${isRtl ? "شيكل إسرائيلي (₪)" : "ILS (₪)"}</td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Section 1: Executive KPI Cards -->
      <div style="margin-bottom: 12px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 5px 0; margin: 0 -2.5px;">
          <tr>
            <!-- Card 1: Net Revenue -->
            <td style="width: 25%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 8px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: bold; color: #166534; margin-bottom: 2px;">
                ${isRtl ? "صافي الإيرادات" : "Net Sales Revenue"}
              </div>
              <div style="font-size: 14.5px; font-weight: bold; color: #14532d;">
                ${numSpan(netRev)}
              </div>
              <div style="font-size: 8.5px; color: #15803d; margin-top: 2px;">
                ${isRtl ? "بعد الخصومات والمرتجعات" : "Net of discounts"}
              </div>
            </td>

            <!-- Card 2: COGS -->
            <td style="width: 25%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 2px;">
                ${isRtl ? "تكلفة المبيعات (COGS)" : "Cost of Goods Sold"}
              </div>
              <div style="font-size: 14.5px; font-weight: bold; color: #0f172a;">
                ${numSpan(cogs)}
              </div>
              <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
                ${isRtl ? "التكلفة التناسبية للمباع" : "Exact unit cost"}
              </div>
            </td>

            <!-- Card 3: Gross Profit -->
            <td style="width: 25%; background: #ecfdf5; border: 1px solid #86efac; border-radius: 6px; padding: 6px 8px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: bold; color: #15803d; margin-bottom: 2px;">
                ${isRtl ? "إجمالي الربح" : "Gross Profit"}
              </div>
              <div style="font-size: 14.5px; font-weight: bold; color: #047857;">
                ${numSpan(grossProfit)}
              </div>
              <div style="font-size: 8.5px; color: #059669; margin-top: 2px;">
                ${isRtl ? "الهامش:" : "Margin:"} <strong>${grossMargin.toFixed(1)}%</strong>
              </div>
            </td>

            <!-- Card 4: Operating Net Profit -->
            <td style="width: 25%; background: #f0fdfa; border: 1px solid #5eead4; border-radius: 6px; padding: 6px 8px; vertical-align: top;">
              <div style="font-size: 10px; font-weight: bold; color: #0f766e; margin-bottom: 2px;">
                ${isRtl ? "صافي الربح التشغيلي" : "Net Operating Profit"}
              </div>
              <div style="font-size: 14.5px; font-weight: bold; color: #115e59;">
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
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; color: #0f3d2e; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
          ${isRtl ? "تفصيل قنوات التحصيل والدفع" : "Payment Channels Breakdown"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 4px 6px; border: 1px solid #0f3d2e; width: 34%; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "القناة / طريقة الدفع" : "Payment Channel"}</th>
              <th style="padding: 4px 6px; border: 1px solid #0f3d2e; width: 22%; text-align: center;">${isRtl ? "المبلغ (₪)" : "Amount (₪)"}</th>
              <th style="padding: 4px 6px; border: 1px solid #0f3d2e; width: 18%; text-align: center;">${isRtl ? "النسبة من الإيراد" : "Share"}</th>
              <th style="padding: 4px 6px; border: 1px solid #0f3d2e; width: 26%; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "طبيعة التدفق" : "Cashflow Status"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "نقدي (كاش في الدرج)" : "Cash (Drawer)"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(Number(pb.cash || 0))}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.cash || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #059669;">${isRtl ? "سيولة نقدية محصلة" : "Liquid Cash"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "بطاقة بنكية / فيزا (POS)" : "Credit / Debit Cards"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(Number(pb.card || 0))}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.card || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #0284c7;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "تحويل بنكي / شيكات" : "Bank Transfer / Checks"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(Number(pb.bank || 0))}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.bank || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #0284c7;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "جوال باي (Jawwal Pay)" : "Jawwal Pay Wallet"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(Number(pb.jawwal || 0))}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.jawwal || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #0d9488;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "بال باي (PalPay)" : "PalPay Wallet"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(Number(pb.palpay || 0))}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.palpay || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #0d9488;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #fffbeb; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #92400e;">${isRtl ? "مبيعات بالذمة / آجل (ديون عملاء)" : "Credit Sales"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #92400e;">${numSpan(creditSales)}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; color: #92400e;">${netRev > 0 ? ((creditSales / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #b45309;">${isRtl ? "ذمم مدينة لم تُحصّل بعد" : "Uncollected Debt"}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1;">${isRtl ? "إجمالي السيولة المحصلة فعلياً" : "Total Cash Collected"}</td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center; color: #166534; font-size: 10px;">${numSpan(totalCollected)}</td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; text-align: center;">${netRev > 0 ? ((totalCollected / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 4px 6px; border: 1px solid #cbd5e1; color: #166534;">${isRtl ? "مقبوضات نقدية وبنكية" : "Liquid Cashflow"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Section 3: Operating Expenses -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; color: #0f3d2e; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
          ${isRtl ? "المصاريف التشغيلية ومسحوبات الفترة" : "Operating Expenses & Outflows"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed;">
          <thead>
            <tr style="background: #334155; color: #ffffff;">
              <th style="padding: 4px 6px; border: 1px solid #334155; width: 50%; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "بند المصروف" : "Expense Category"}</th>
              <th style="padding: 4px 6px; border: 1px solid #334155; width: 22%; text-align: center;">${isRtl ? "القيمة (₪)" : "Amount (₪)"}</th>
              <th style="padding: 4px 6px; border: 1px solid #334155; width: 28%; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "التصنيف المحاسبي" : "Accounting Class"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0;">${isRtl ? "إجمالي المصاريف التشغيلية (رواتب، إيجار، كهرباء، خدمات)" : "General Operating Expenses (Rent, Utilities)"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c;">${numSpan(opex)}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0;">${isRtl ? "مصاريف تشغيلية تخص الفترة" : "Operating Expense"}</td>
            </tr>
            ${shrinkage > 0 ? `
            <tr style="background: #fff1f2; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0;">${isRtl ? "عجز وتالف المخزون (من محاضر الجرد)" : "Inventory Shrinkage"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c;">${numSpan(shrinkage)}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0;">${isRtl ? "خسارة مخزون" : "Inventory Loss"}</td>
            </tr>
            ` : ""}
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0;">${isRtl ? "سداد دفعات الموردين (تسوية حسابات الموردين)" : "Supplier Debt Settlements"}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7;">${numSpan(supplierPayments)}</td>
              <td style="padding: 3px 6px; border: 1px solid #e2e8f0; color: #0369a1;">${isRtl ? "تسوية التزامات (تدفق نقدي خارج)" : "Accounts Payable Settlement"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 4: Daily Sales Performance Table (if exists, max 5 rows) -->
      ${(report.dailyTrend && report.dailyTrend.length > 0) ? `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; color: #0f3d2e; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
          ${isRtl ? "جدول حركة المبيعات والأرباح اليومية" : "Daily Sales Performance"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 3px 6px; border: 1px solid #0f3d2e; width: 20%; text-align: center;">${isRtl ? "التاريخ" : "Date"}</th>
              <th style="padding: 3px 6px; border: 1px solid #0f3d2e; width: 22%; text-align: center;">${isRtl ? "المبيعات (₪)" : "Gross Sales (₪)"}</th>
              <th style="padding: 3px 6px; border: 1px solid #0f3d2e; width: 20%; text-align: center;">${isRtl ? "التكلفة (₪)" : "COGS (₪)"}</th>
              <th style="padding: 3px 6px; border: 1px solid #0f3d2e; width: 20%; text-align: center;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
              <th style="padding: 3px 6px; border: 1px solid #0f3d2e; width: 18%; text-align: center;">${isRtl ? "الهامش %" : "Margin %"}</th>
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
                  <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${d.date}</td>
                  <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${numSpan(r)}</td>
                  <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; color: #475569;">${numSpan(c)}</td>
                  <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857;">${numSpan(p)}</td>
                  <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #059669;">${m}%</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      ` : ""}

      <!-- Section 5: Top Selling Medicines Table (Max 6 rows) -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: bold; color: #0f3d2e; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
          ${isRtl ? "قائمة الأدوية الأكثر مبيعاً" : "Top Selling Medicines"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 3px 6px; border: 1px solid #1e293b; width: 28px; text-align: center;">#</th>
              <th style="padding: 3px 6px; border: 1px solid #1e293b; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "اسم الصنف / الدواء" : "Medicine Name"}</th>
              <th style="padding: 3px 6px; border: 1px solid #1e293b; width: 55px; text-align: center;">${isRtl ? "الكمية" : "Qty"}</th>
              <th style="padding: 3px 6px; border: 1px solid #1e293b; width: 85px; text-align: center;">${isRtl ? "الإيراد (₪)" : "Revenue (₪)"}</th>
              <th style="padding: 3px 6px; border: 1px solid #1e293b; width: 85px; text-align: center;">${isRtl ? "التكلفة (₪)" : "Cost (₪)"}</th>
              <th style="padding: 3px 6px; border: 1px solid #1e293b; width: 85px; text-align: center;">${isRtl ? "الربح (₪)" : "Profit (₪)"}</th>
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
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name || (isRtl ? "صنف غير معروف" : "Unknown")}</td>
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center;">${item.qty || 0}</td>
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${numSpan(rev)}</td>
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; color: #475569;">${numSpan(cost)}</td>
                      <td style="padding: 3px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857;">${numSpan(profit)}</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" style="text-align: center; padding: 6px; color: #94a3b8;">${isRtl ? "لا توجد بيانات للأصناف" : "No item data"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 6: Official Sign-off & Verification -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 10px;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 20px;">${isRtl ? "إعداد الكاشير / الصيدلي" : "Prepared by Pharmacist"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #94a3b8;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 20px;">${isRtl ? "المراجعة والتدقيق المالي" : "Audited & Verified by"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #94a3b8;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 20px;">${isRtl ? "اعتماد الإدارة العامة" : "Management Approval"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 75%; margin: 0 auto; padding-top: 3px; font-size: 8.5px; color: #94a3b8;">${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}</div>
          </td>
        </tr>
      </table>

      <!-- Bottom System Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; text-align: center; font-size: 9.5px; font-weight: bold; color: #64748b;">
        ${isRtl ? "نظام روشتة لإدارة الصيدليات" : "Roshetta Pharmacy System"}
      </div>
    </div>
  `;
}
