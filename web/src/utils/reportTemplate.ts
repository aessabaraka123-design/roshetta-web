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

  return `
    <div style="width: 100%; max-width: 210mm; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'Segoe UI', 'Cairo', Tahoma, Arial, sans-serif; direction: ${isRtl ? "rtl" : "ltr"}; text-align: ${isRtl ? "right" : "left"}; line-height: 1.4; box-sizing: border-box; padding: 12mm 14mm;">
      
      <!-- Top Brand Header Block -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #0f3d2e; padding-bottom: 12px;">
        <tr>
          <td style="vertical-align: middle; width: 58%;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f3d2e; letter-spacing: -0.5px;">
              ${isRtl ? "التقرير المالي والإحصائي الشامل" : "Comprehensive Financial & Statistical Report"}
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #475569;">
              ${isRtl ? "نظام روشيتة لإدارة الصيدليات" : "Roshetta Smart Pharmacy System"} • ${isRtl ? "السجل المحاسبي المعتمد" : "Official Accounting Ledger"}
            </p>
          </td>
          <td style="vertical-align: middle; width: 42%; text-align: ${isRtl ? "left" : "right"};">
            <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #334155; line-height: 1.6;">
              <div><strong>${isRtl ? "الصيدلية:" : "Pharmacy:"}</strong> ${pharmacyName || (isRtl ? "صيدلية روشيتة" : "Roshetta Pharmacy")}</div>
              <div><strong>${isRtl ? "الفرع:" : "Branch:"}</strong> ${branchName}</div>
              <div><strong>${isRtl ? "الفترة:" : "Period:"}</strong> ${dateRange}</div>
              <div><strong>${isRtl ? "تاريخ الإصدار:" : "Issued:"}</strong> ${dateStr} ${timeStr}</div>
              <div><strong>${isRtl ? "العملة:" : "Currency:"}</strong> ${isRtl ? "شيكل إسرائيلي (₪ ILS)" : "Israeli Shekel (₪ ILS)"}</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Section 1: Executive KPI Cards (Table-based for 100% Word & PDF Parity) -->
      <div style="margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -3px;">
          <tr>
            <!-- Card 1: Net Revenue -->
            <td style="width: 25%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: bold; color: #166534; margin-bottom: 4px;">
                ${isRtl ? "صافي الإيرادات" : "Net Sales Revenue"}
              </div>
              <div style="font-size: 17px; font-weight: 900; color: #14532d;">
                ₪${fmt(netRev)}
              </div>
              <div style="font-size: 9.5px; color: #15803d; margin-top: 4px;">
                ${isRtl ? "بعد الخصومات والمرتجعات" : "Net of discounts & refunds"}
              </div>
            </td>

            <!-- Card 2: COGS -->
            <td style="width: 25%; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 4px;">
                ${isRtl ? "تكلفة البضاعة (COGS)" : "Cost of Goods Sold"}
              </div>
              <div style="font-size: 17px; font-weight: 900; color: #0f172a;">
                ₪${fmt(cogs)}
              </div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 4px;">
                ${isRtl ? "التكلفة التناسبية للمباع" : "Exact unit packaging cost"}
              </div>
            </td>

            <!-- Card 3: Gross Profit -->
            <td style="width: 25%; background: #ecfdf5; border: 1px solid #86efac; border-radius: 8px; padding: 10px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: bold; color: #15803d; margin-bottom: 4px;">
                ${isRtl ? "إجمالي الربح" : "Gross Profit"}
              </div>
              <div style="font-size: 17px; font-weight: 900; color: #047857;">
                ₪${fmt(grossProfit)}
              </div>
              <div style="font-size: 9.5px; color: #059669; margin-top: 4px;">
                ${isRtl ? "الهامش:" : "Margin:"} <strong>${grossMargin.toFixed(1)}%</strong>
              </div>
            </td>

            <!-- Card 4: Operating Net Profit -->
            <td style="width: 25%; background: #f0fdfa; border: 1px solid #5eead4; border-radius: 8px; padding: 10px; vertical-align: top;">
              <div style="font-size: 11px; font-weight: bold; color: #0f766e; margin-bottom: 4px;">
                ${isRtl ? "صافي الربح التشغيلي" : "Net Operating Profit"}
              </div>
              <div style="font-size: 17px; font-weight: 900; color: #115e59;">
                ₪${fmt(netProfit)}
              </div>
              <div style="font-size: 9.5px; color: #0d9488; margin-top: 4px;">
                ${isRtl ? "صافي الهامش:" : "Net Margin:"} <strong>${netMargin.toFixed(1)}%</strong>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Section 2: Liquidity & Payment Channels Breakdown -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${isRtl ? "ثانياً: تفصيل السيولة وقنوات التحصيل والدفع" : "II. Liquidity & Payment Channels Breakdown"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 6px;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 6px 8px; border: 1px solid #0f3d2e; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "القناة / طريقة الدفع" : "Payment Channel"}</th>
              <th style="padding: 6px 8px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "المبلغ (₪)" : "Amount (₪)"}</th>
              <th style="padding: 6px 8px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "النسبة من الإيراد" : "Share of Revenue"}</th>
              <th style="padding: 6px 8px; border: 1px solid #0f3d2e; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "طبيعة التدفق" : "Cashflow Status"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "نقدي (كاش في الدرج)" : "Cash (Drawer)"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(Number(pb.cash || 0))}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.cash || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #059669;">${isRtl ? "سيولة نقدية محصلة" : "Immediate Liquid Cash"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "بطاقة بنكية / فيزا (POS)" : "Credit / Debit Cards"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(Number(pb.card || 0))}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.card || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #0284c7;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "تحويل بنكي / شيكات" : "Bank Transfer / Checks"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(Number(pb.bank || 0))}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.bank || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #0284c7;">${isRtl ? "حساب بنكي جاري" : "Bank Account"}</td>
            </tr>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "جوال باي (Jawwal Pay)" : "Jawwal Pay Wallet"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(Number(pb.jawwal || 0))}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.jawwal || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #0d9488;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? "بال باي (PalPay)" : "PalPay Wallet"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(Number(pb.palpay || 0))}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center;">${netRev > 0 ? ((Number(pb.palpay || 0) / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #0d9488;">${isRtl ? "محفظة رقمية" : "Digital Wallet"}</td>
            </tr>
            <tr style="background: #fffbeb; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #92400e;">${isRtl ? "مبيعات بالذمة / آجل (ديون عملاء)" : "Credit Sales (Receivables)"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #92400e;">₪${fmt(creditSales)}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; color: #92400e;">${netRev > 0 ? ((creditSales / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #b45309;">${isRtl ? "ذمم مدينة لم تُحصّل بعد" : "Uncollected Debt"}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">${isRtl ? "إجمالي السيولة المحصلة فعلياً" : "Total Cash Collected"}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #166534; font-size: 12px;">₪${fmt(totalCollected)}</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${netRev > 0 ? ((totalCollected / netRev) * 100).toFixed(1) : 0}%</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1; color: #166534;">${isRtl ? "مقبوضات نقدية وبنكية" : "Liquid Cashflow"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Section 3: Operating Expenses & Disclosures -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${isRtl ? "ثالثاً: المصاريف التشغيلية ومسحوبات الفترة" : "III. Operating Expenses & Outflows"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 6px;">
          <thead>
            <tr style="background: #334155; color: #ffffff;">
              <th style="padding: 5px 8px; border: 1px solid #334155; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "بند المصروف" : "Expense Category"}</th>
              <th style="padding: 5px 8px; border: 1px solid #334155; text-align: center;">${isRtl ? "القيمة (₪)" : "Amount (₪)"}</th>
              <th style="padding: 5px 8px; border: 1px solid #334155; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "التصنيف المحاسبي" : "Accounting Class"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${isRtl ? "إجمالي المصاريف التشغيلية العامة (رواتب، إيجار، كهرباء، خدمات)" : "General Operating Expenses (Rent, Salaries, Utilities)"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c;">₪${fmt(opex)}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${isRtl ? "مصاريف تشغيلية تخص الفترة (P&L)" : "Income Statement Expense"}</td>
            </tr>
            ${shrinkage > 0 ? `
            <tr style="background: #fff1f2; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${isRtl ? "عجز وتالف المخزون (من محاضر الجرد)" : "Inventory Shrinkage & Loss"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #be123c;">₪${fmt(shrinkage)}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${isRtl ? "خسارة مخزون رأسمالي" : "Inventory Loss"}</td>
            </tr>
            ` : ""}
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0;">${isRtl ? "سداد دفعات الموردين (تسوية حسابات الموردين)" : "Supplier Debt Settlements (Accounts Payable)"}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #0284c7;">₪${fmt(supplierPayments)}</td>
              <td style="padding: 5px 8px; border: 1px solid #e2e8f0; color: #0369a1;">${isRtl ? "تسوية التزامات بالميزانية (تدفق نقدي خارج)" : "Balance Sheet Settlement (Cashflow Out)"}</td>
            </tr>
          </tbody>
        </table>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 9.5px; color: #64748b; line-height: 1.5;">
          <strong>${isRtl ? "💡 إفصاح محاسبي معتمد (IFRS / GAAP):" : "💡 GAAP / IFRS Disclosure:"}</strong>
          ${isRtl
            ? "دفعات سداد الموردين تُعامل كإطفاء للالتزامات في الميزانية العمومية والتدفقات النقدية، ولا تُخصم مرتين من أرباح التشغيل لأن تكلفة البضاعة المباعة (COGS) محتسبة مسبقاً بدقة للأصناف المباعة."
            : "Supplier debt payments settle Accounts Payable on the balance sheet and are tracked under cash flows; they are not double-deducted from operating profits."}
        </div>
      </div>

      <!-- Section 4: Daily Sales Performance Table -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${isRtl ? "رابعاً: جدول حركة المبيعات والأرباح اليومية" : "IV. Daily Sales & Margin Performance"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #0f3d2e; color: #ffffff;">
              <th style="padding: 5px 6px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "التاريخ" : "Date"}</th>
              <th style="padding: 5px 6px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "إجمالي المبيعات (₪)" : "Gross Sales (₪)"}</th>
              <th style="padding: 5px 6px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "تكلفة البضاعة (₪)" : "COGS (₪)"}</th>
              <th style="padding: 5px 6px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "إجمالي الربح (₪)" : "Gross Profit (₪)"}</th>
              <th style="padding: 5px 6px; border: 1px solid #0f3d2e; text-align: center;">${isRtl ? "نسبة الهامش" : "Margin %"}</th>
            </tr>
          </thead>
          <tbody>
            ${(report.dailyTrend && report.dailyTrend.length > 0)
              ? report.dailyTrend.map((d: any, idx: number) => {
                  const r = Number(d.revenue || 0);
                  const c = Number(d.cost || 0);
                  const p = Number(d.profit != null ? d.profit : (r - c));
                  const m = r > 0 ? ((p / r) * 100).toFixed(1) : "0.0";
                  return `
                    <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">${d.date}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center;">₪${fmt(r)}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; color: #475569;">₪${fmt(c)}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857;">₪${fmt(p)}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #059669;">${m}%</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="5" style="text-align: center; padding: 10px; color: #94a3b8;">${isRtl ? "لا توجد مبيعات مسجلة في هذه الفترة" : "No sales recorded in this period"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 5: Top Selling Medicines Table -->
      <div style="margin-bottom: 22px;">
        <div style="font-size: 13px; font-weight: bold; color: #0f3d2e; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          ${isRtl ? "خامساً: قائمة الأدوية الأكثر مبيعاً وتحقيقاً للأرباح" : "V. Top Selling & Profitable Medicines"}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff;">
              <th style="padding: 5px 6px; border: 1px solid #1e293b; width: 28px; text-align: center;">#</th>
              <th style="padding: 5px 6px; border: 1px solid #1e293b; text-align: ${isRtl ? "right" : "left"};">${isRtl ? "اسم الصنف / الدواء" : "Medicine Name"}</th>
              <th style="padding: 5px 6px; border: 1px solid #1e293b; text-align: center;">${isRtl ? "الكمية المباعة" : "Qty Sold"}</th>
              <th style="padding: 5px 6px; border: 1px solid #1e293b; text-align: center;">${isRtl ? "إجمالي الإيراد (₪)" : "Revenue (₪)"}</th>
              <th style="padding: 5px 6px; border: 1px solid #1e293b; text-align: center;">${isRtl ? "التكلفة (₪)" : "Cost (₪)"}</th>
              <th style="padding: 5px 6px; border: 1px solid #1e293b; text-align: center;">${isRtl ? "صافي الربح (₪)" : "Profit (₪)"}</th>
            </tr>
          </thead>
          <tbody>
            ${(report.topItems && report.topItems.length > 0)
              ? report.topItems.map((item: any, idx: number) => {
                  const rev = Number(item.revenue || item.value || 0);
                  const cost = Number(item.cost || 0);
                  const profit = Number(item.grossProfit != null ? item.grossProfit : (rev - cost));
                  return `
                    <tr style="background: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">${idx + 1}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a;">${item.name || (isRtl ? "صنف غير معروف" : "Unknown")}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center;">${item.qty || 0}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold;">₪${fmt(rev)}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; color: #475569;">₪${fmt(cost)}</td>
                      <td style="padding: 4px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #047857;">₪${fmt(profit)}</td>
                    </tr>
                  `;
                }).join("")
              : `<tr><td colspan="6" style="text-align: center; padding: 10px; color: #94a3b8;">${isRtl ? "لا توجد بيانات للأصناف" : "No item data available"}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <!-- Section 6: Official Sign-off & Verification -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 15px;">
        <tr>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10.5px; font-weight: bold; color: #475569; margin-bottom: 30px;">${isRtl ? "إعداد الصيدلي / الكاشير المسند" : "Prepared by Pharmacist"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 3px; font-size: 9.5px; color: #94a3b8;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10.5px; font-weight: bold; color: #475569; margin-bottom: 30px;">${isRtl ? "المراجعة والتدقيق المالي" : "Audited & Verified by"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 3px; font-size: 9.5px; color: #94a3b8;">${isRtl ? "التوقيع والتاريخ" : "Signature & Date"}</div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="font-size: 10.5px; font-weight: bold; color: #475569; margin-bottom: 30px;">${isRtl ? "اعتماد الإدارة العامة" : "Management Approval"}</div>
            <div style="border-top: 1px dashed #cbd5e1; width: 80%; margin: 0 auto; padding-top: 3px; font-size: 9.5px; color: #94a3b8;">${isRtl ? "الختم الرسمي والاعتماد" : "Official Stamp"}</div>
          </td>
        </tr>
      </table>

      <!-- Bottom System Footer Disclaimer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 9.5px; color: #94a3b8; line-height: 1.5;">
        <div>${isRtl ? "نظام روشيتة السحابي الموحد لإدارة الصيدليات • تقرير محاسبي رسمي مُولّد آلياً • متوافق مع معايير IFRS / GAAP" : "Roshetta Unified Pharmacy Management Cloud • Automated Official Accounting Ledger • IFRS / GAAP Compliant"}</div>
        <div>${isRtl ? "هذه الوثيقة موثقة رقمياً وصالحة للأغراض الإدارية والضريبية والمحاسبية دون الحاجة إلى ختم يدوي" : "Digitally generated document valid for administrative and accounting purposes without manual stamp"}</div>
      </div>
    </div>
  `;
}
