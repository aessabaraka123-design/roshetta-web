// @ts-ignore
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useStore } from "@/store";

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportCorporateExcel = (
  report: any,
  pharmacyName: string,
  dateRange: string,
  filename: string,
  branchName: string = "الفرع الرئيسي",
) => {
  const totalSales = Number(report.totalRevenue) || 0;
  const grossProfit = Number(report.totalProfit) || 0;
  const totalExpenses = Number(report.totalExpenses) || 0;
  const totalDiscount = Number(report.totalDiscount) || 0;
  const totalVat = Number(report.totalVat) || 0;
  const netProfit = Number(report.netProfit) || (grossProfit - totalExpenses);
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";
  const cogs = Math.max(0, totalSales - grossProfit);

  const pb = report.paymentBreakdown || {};
  const cashCollected =
    (Number(pb.cash) || 0) +
    (Number(pb.bank) || 0) +
    (Number(pb.jawwal) || 0) +
    (Number(pb.palpay) || 0) +
    (Number(pb.card) || 0) +
    (Number(pb.maalchat) || 0);
  const creditSales = Number(pb.credit) || 0;

  const paymentLabels: Record<string, string> = {
    cash: "نقدي (كاش)",
    bank: "تحويل بنكي",
    jawwal: "جوال باي (Jawwal Pay)",
    palpay: "بال باي (PalPay)",
    card: "بطاقة بنكية (Card)",
    maalchat: "مالتشات",
    credit: "مبيعات بالذمة (ديون)",
    insurance: "تأمين صحي",
    other: "أخرى",
  };

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const borderThin = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  const borderMedium = {
    top: { style: "medium", color: { rgb: "334155" } },
    bottom: { style: "medium", color: { rgb: "334155" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  const borderTotal = {
    top: { style: "medium", color: { rgb: "0F172A" } },
    bottom: { style: "double", color: { rgb: "0F172A" } },
    left: { style: "thin", color: { rgb: "0F172A" } },
    right: { style: "thin", color: { rgb: "0F172A" } },
  };

  const rows: any[][] = [];
  const merges: any[] = [];
  const rowStyles: { r: number; type: string }[] = [];

  const addRow = (cells: any[], type: string) => {
    const r = rows.length;
    rows.push(cells);
    rowStyles.push({ r, type });
    return r;
  };

  // Row 0: Title
  addRow([pharmacyName || "صيدلية روشيتة"], "main_title");
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  // Row 1: Subtitle
  addRow(["جدول إيرادات ومبيعات الفترة - السجل المحاسبي والمالي المعتمد"], "subtitle");
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

  // Row 2: Metadata
  addRow([
    `تاريخ الإصدار: ${dateStr} ${timeStr}  |  الفترة: ${dateRange}`,
    "", "",
    `الفرع: ${branchName}  |  العملة: شيكل إسرائيلي (ILS ₪)`,
    "", ""
  ], "meta");
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 5 } });

  // Row 3: Blank
  addRow([], "blank");

  // Row 4: Column Headers
  addRow(["#", "البيان / البند المالي", "الكمية", "المبلغ (₪)", "متوسط الوحدة (₪)", "ملاحظات التحليل والنسب"], "table_header");

  // Row 5: Section 1 Header
  const s1 = addRow(["أولاً: ملخص حركة المبيعات والتحصيل"], "section_header");
  merges.push({ s: { r: s1, c: 0 }, e: { r: s1, c: 5 } });

  // Section 1 items
  addRow(["1.1", "إجمالي المبيعات الإجمالية (Gross Sales)", "-", Number(totalSales.toFixed(2)), "-", "شامل المبيعات النقدية والآجلة"], "data_row");
  addRow(["1.2", "المقبوضات النقدية والبنكية الفورية", "-", Number(cashCollected.toFixed(2)), "-", `تم تحصيلها وإيداعها فعلياً (${totalSales > 0 ? ((cashCollected / totalSales) * 100).toFixed(1) : 0}%)`], "data_row_green");
  addRow(["1.3", "المبيعات الآجلة (ذمم عملاء مستحقة)", "-", Number(creditSales.toFixed(2)), "-", `مستحقات على الحساب (${totalSales > 0 ? ((creditSales / totalSales) * 100).toFixed(1) : 0}%)`], "data_row_amber");
  addRow(["1.4", "إجمالي الخصومات الممنوحة للعملاء", "-", Number(totalDiscount.toFixed(2)), "-", "تخفيضات ومكافآت بيعية"], "data_row");
  addRow(["1.5", "ضريبة القيمة المضافة (VAT)", "-", Number(totalVat.toFixed(2)), "-", "الضريبة المستحقة إن وجدت"], "data_row");

  // Blank
  addRow([], "blank");

  // Section 2 Header
  const s2 = addRow(["ثانياً: حساب الأرباح وهامش الصيدلية (قائمة الدخل)"], "section_header");
  merges.push({ s: { r: s2, c: 0 }, e: { r: s2, c: 5 } });

  addRow(["2.1", "تكلفة البضاعة المباعة (COGS)", "-", Number(cogs.toFixed(2)), "-", "تكلفة الشراء الأصلية للأصناف المباعة"], "data_row");
  addRow(["2.2", "إجمالي المصروفات التشغيلية والعمومية", "-", Number(totalExpenses.toFixed(2)), "-", "مصاريف نثرية وفواتير تشغيل"], "data_row");
  addRow(["2.3", "مجمل الربح (Gross Profit)", "-", Number(grossProfit.toFixed(2)), "-", "المبيعات مطروحاً منها تكلفة الشراء"], "data_row");
  addRow(["2.4", "صافي الربح المحقق (Net Profit)", "-", Number(netProfit.toFixed(2)), "-", `نسبة الربح الصافي: ${netMargin}%`], "highlight_profit");

  // Blank
  addRow([], "blank");

  // Section 3: Payment Breakdown
  const paymentKeys = Object.keys(pb);
  if (paymentKeys.length > 0) {
    const s3 = addRow(["ثالثاً: تحليل طرق الدفع والمقبوضات"], "section_header");
    merges.push({ s: { r: s3, c: 0 }, e: { r: s3, c: 5 } });

    paymentKeys.forEach((key, mIdx) => {
      const amt = Number(pb[key]) || 0;
      if (amt > 0) {
        const pct = totalSales > 0 ? ((amt / totalSales) * 100).toFixed(1) : "0.0";
        const label = paymentLabels[key] || key;
        addRow([`3.${mIdx + 1}`, label, "-", Number(amt.toFixed(2)), "-", `تمثل ${pct}% من حركة التحصيل`], "data_row");
      }
    });
    addRow([], "blank");
  }

  // Section 4: Top Selling Items
  const s4 = addRow(["رابعاً: تفصيل الأصناف والمنتجات الأكثر مبيعاً"], "section_header");
  merges.push({ s: { r: s4, c: 0 }, e: { r: s4, c: 5 } });

  let topQtySum = 0;
  let topValSum = 0;
  const topItems = report.topItems || [];

  if (topItems.length > 0) {
    topItems.forEach((item: any, idx: number) => {
      const qty = Number(item.qty) || 0;
      const val = Number(item.revenue || item.totalSale || item.value) || 0;
      topQtySum += qty;
      topValSum += val;
      const avgPrice = qty > 0 ? Number((val / qty).toFixed(2)) : 0;
      const sharePct = totalSales > 0 ? ((val / totalSales) * 100).toFixed(1) : "0.0";
      const itemName = item.name ? String(item.name) : "منتج غير معروف";

      addRow([
        idx + 1,
        itemName,
        qty,
        Number(val.toFixed(2)),
        avgPrice,
        `تمثل ${sharePct}% من إجمالي المبيعات`
      ], "data_row");
    });

    addRow([
      "",
      "مجموع أعلى الأصناف المباعة",
      topQtySum,
      Number(topValSum.toFixed(2)),
      "-",
      `تمثل ${totalSales > 0 ? ((topValSum / totalSales) * 100).toFixed(1) : 0}% من إجمالي المبيعات`
    ], "subtotal_row");
  } else {
    addRow(["-", "لا توجد مبيعات مسجلة في هذه الفترة", "-", 0, "-", "-"], "data_row");
  }

  // Blank
  addRow([], "blank");

  // Grand Total
  addRow([
    "",
    "المجموع العام النهائي للمبيعات",
    "-",
    Number(totalSales.toFixed(2)),
    "-",
    "مطابق لسجلات الفواتير والصندوق"
  ], "grand_total");

  // Blank
  addRow([], "blank");
  addRow([], "blank");

  // Signatures
  const sig = addRow([
    "توقيع المسؤول المالي / الكاشير: ____________________________",
    "", "",
    "اعتماد وتوقيع مدير الصيدلية: ____________________________",
    "", ""
  ], "signature");
  merges.push({ s: { r: sig, c: 0 }, e: { r: sig, c: 2 } });
  merges.push({ s: { r: sig, c: 3 }, e: { r: sig, c: 5 } });

  // Create sheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 8 },
    { wch: 44 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 42 }
  ];
  ws["!views"] = [{ RTL: true }];

  // Apply styling, borders and colors to every cell
  rowStyles.forEach((item) => {
    const r = item.r;
    if (item.type === "blank") return;

    for (let c = 0; c < 6; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };

      if (item.type === "main_title") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 15, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0F172A" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderMedium,
        };
      } else if (item.type === "subtitle") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "38BDF8" } },
          fill: { fgColor: { rgb: "1E293B" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: borderMedium,
        };
      } else if (item.type === "meta") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } },
          fill: { fgColor: { rgb: "F1F5F9" } },
          alignment: { horizontal: c < 3 ? "right" : "left", vertical: "center" },
          border: borderThin,
        };
      } else if (item.type === "table_header") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "334155" } },
          alignment: { horizontal: c === 1 ? "right" : c === 3 || c === 4 ? "left" : "center", vertical: "center" },
          border: borderMedium,
        };
      } else if (item.type === "section_header") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: "E2E8F0" } },
          alignment: { horizontal: "right", vertical: "center" },
          border: borderMedium,
        };
      } else if (item.type === "data_row") {
        const isNum = c === 3 || c === 4;
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: isNum || c === 1, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: r % 2 === 0 ? "FFFFFF" : "F8FAFC" } },
          alignment: { horizontal: c === 1 ? "right" : isNum ? "left" : "center", vertical: "center" },
          border: borderThin,
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "data_row_green") {
        const isNum = c === 3 || c === 4;
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "065F46" } },
          fill: { fgColor: { rgb: "F0FDF4" } },
          alignment: { horizontal: c === 1 ? "right" : isNum ? "left" : "center", vertical: "center" },
          border: borderThin,
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "data_row_amber") {
        const isNum = c === 3 || c === 4;
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "92400E" } },
          fill: { fgColor: { rgb: "FFFBEB" } },
          alignment: { horizontal: c === 1 ? "right" : isNum ? "left" : "center", vertical: "center" },
          border: borderThin,
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "highlight_profit") {
        const isNum = c === 3 || c === 4;
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "047857" } },
          fill: { fgColor: { rgb: "ECFDF5" } },
          alignment: { horizontal: c === 1 ? "right" : isNum ? "left" : "center", vertical: "center" },
          border: {
            top: { style: "medium", color: { rgb: "059669" } },
            bottom: { style: "medium", color: { rgb: "059669" } },
            left: { style: "thin", color: { rgb: "059669" } },
            right: { style: "thin", color: { rgb: "059669" } },
          },
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "subtotal_row") {
        const isNum = c === 3 || c === 4;
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: "F1F5F9" } },
          alignment: { horizontal: c === 1 ? "right" : isNum ? "left" : "center", vertical: "center" },
          border: borderMedium,
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "grand_total") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 12, bold: true, color: { rgb: c === 3 ? "34D399" : "FFFFFF" } },
          fill: { fgColor: { rgb: "0F172A" } },
          alignment: { horizontal: c === 1 ? "right" : c === 3 ? "left" : "center", vertical: "center" },
          border: borderTotal,
        };
        if (typeof ws[ref].v === "number") ws[ref].z = "#,##0.00";
      } else if (item.type === "signature") {
        ws[ref].s = {
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "334155" } },
          fill: { fgColor: { rgb: "F8FAFC" } },
          alignment: { horizontal: c < 3 ? "right" : "left", vertical: "center" },
          border: borderThin,
        };
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "السجل المحاسبي");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportComprehensivePDF = async (
  report: any,
  pharmacyName: string,
  dateRange: string,
  filename: string,
) => {
  const language = useStore.getState().language;
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.style.minHeight = "297mm";
  container.style.backgroundColor = "#ffffff";
  container.style.direction = language === "en" ? "ltr" : "rtl";
  container.style.fontFamily = "Cairo, Tahoma, sans-serif";
  container.style.color = "#1f2937";

  const generateTable = (headers: string[], rows: any[][]) => {
    return `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 40px; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f3d2e; color: white;">
          ${headers.map((h) => `<th style="padding: 12px 15px; text-align: right; font-weight: bold; border-bottom: 2px solid #0a291f;">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, i) => `
          <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
            ${row.map((cell) => `<td style="padding: 12px 15px; color: #334155;">${cell}</td>`).join("")}
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>`;
  };

  container.innerHTML = `
    
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', Tahoma, sans-serif !important; }
      </style>

    <div style="padding: 15mm; background: #ffffff; min-height: 267mm; position: relative;">
      
      <!-- Watermark -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(15, 61, 46, 0.02); font-weight: 900; z-index: 0; pointer-events: none; white-space: nowrap;">
        ${pharmacyName}
      </div>

      <div style="position: relative; z-index: 1;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg style="width: 50px; height: 50px; drop-shadow: 0 2px 4px rgba(0,0,0,0.1);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
                <g transform="rotate(-45 12 12)">
                  <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
                  <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
                </g>
              </svg>
            </div>
            <div>
              <h1 style="margin: 0; color: #0f3d2e; font-size: 28px; font-weight: 900;">${language === "en" ? "Comprehensive Financial Report" : "التقرير المالي الشامل"}</h1>
              <h2 style="margin: 5px 0 0 0; color: #64748b; font-size: 16px; font-weight: normal;">${language === "en" ? "Pharmacy:" : "صيدلية:"} <strong style="color: #334155;">${pharmacyName}</strong></h2>
            </div>
          </div>
          <div style="text-align: left; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">${language === "en" ? "Issue Date:" : "تاريخ الإصدار:"}</span> <span dir="ltr">${new Date().toLocaleDateString("en-GB")}</span>
            </div>
            <div style="font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">${language === "en" ? "Report Period:" : "فترة التقرير:"}</span> <span dir="ltr">${dateRange}</span>
            </div>
          </div>
        </div>

        <!-- Executive Summary -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          ${language === "en" ? "Financial Summary" : "الملخص المالي"}
        </h3>
        <div style="display: flex; gap: 15px; margin-bottom: 30px;">
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #10b981; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${language === "en" ? "Total Sales" : "إجمالي المبيعات"}</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #3b82f6; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${language === "en" ? "Gross Profit" : "الربح الإجمالي"}</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalProfit || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #ffffff; border: 1px solid #e2e8f0; border-right: 4px solid #ef4444; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}</div>
            <div style="font-size: 26px; font-weight: 900; color: #0f3d2e;">₪${(report.totalExpenses || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-right: 4px solid #0f3d2e; padding: 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #166534; margin-bottom: 8px; font-weight: bold;">${language === "en" ? "Net Profit" : "صافي الربح"}</div>
            <div style="font-size: 26px; font-weight: 900; color: #166534;">₪${(report.netProfit || 0).toLocaleString()}</div>
          </div>
        </div>
        <div style="display: flex; gap: 15px; margin-bottom: 30px;">
          <div style="flex: 1; background: #f0fdf4; border: 1px solid #bbf7d0; border-right: 4px solid #16a34a; padding: 15px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #166534; margin-bottom: 6px; font-weight: bold;">${language === "en" ? "Total Collected (Cash & Bank)" : "المحصل (نقداً وبنكياً)"}</div>
            <div style="font-size: 22px; font-weight: 900; color: #166534;">₪${Math.max(0, (report.totalRevenue || 0) - (report.paymentBreakdown?.credit || 0)).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-right: 4px solid #f59e0b; padding: 15px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; color: #b45309; margin-bottom: 6px; font-weight: bold;">${language === "en" ? "Credit Sales (Debts / Receivables)" : "المبيعات الآجلة (ذمم وديون)"}</div>
            <div style="font-size: 22px; font-weight: 900; color: #b45309;">₪${(report.paymentBreakdown?.credit || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Payment Breakdown -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          ${language === "en" ? "Payment Methods Analysis" : "تحليل طرق الدفع"}
        </h3>
        <div style="display: flex; gap: 15px; margin-bottom: 40px;">
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">${language === "en" ? "Cash" : "كاش"}</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.cash || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">${language === "en" ? "Credit Card" : "بطاقة بنكية"}</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.card || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">${language === "en" ? "Credit (Receivables)" : "آجل (ذمم)"}</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.credit || 0).toLocaleString()}</div>
          </div>
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">${language === "en" ? "Insurance" : "تأمين"}</div>
            <div style="font-size: 18px; font-weight: bold; color: #334155;">₪${(report.paymentBreakdown?.insurance || 0).toLocaleString()}</div>
          </div>
        </div>

        <!-- Daily Trend Table -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          ${language === "en" ? "Daily Sales" : "المبيعات اليومية"}
        </h3>
        ${generateTable(
          [language === "en" ? "Date" : "التاريخ", language === "en" ? "Total Sales" : "إجمالي المبيعات", language === "en" ? "Gross Profit" : "إجمالي الربح"],
          (report.dailyTrend || []).map((t: any) => [
            `<span dir="ltr">${t.date}</span>`,
            `<strong style="color: #0f3d2e;">₪${(t.revenue || 0).toLocaleString()}</strong>`,
            `<strong style="color: #10b981;">₪${(t.profit || 0).toLocaleString()}</strong>`,
          ]),
        )}

        <!-- Top Items Table -->
        <h3 style="color: #0f3d2e; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center; gap: 8px; page-break-before: auto;">
          <span style="width: 4px; height: 18px; background: #0f3d2e; border-radius: 4px; display: inline-block;"></span>
          ${language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}
        </h3>
        ${generateTable(
          [language === "en" ? "Medicine Name" : "اسم الدواء", language === "en" ? "Quantity Sold" : "الكمية المباعة", language === "en" ? "Total Revenue" : "إجمالي الإيرادات"],
          (report.topItems || []).map((i: any) => [
            i.name,
            `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${i.qty} ${language === "en" ? "Pack" : "عبوة"}</span>`,
            `₪${(i.revenue || 0).toLocaleString()}`,
          ]),
        )}

        <!-- Footer -->
        <div style="margin-top: 50px; text-align: center; border-top: 2px dashed #e2e8f0; padding-top: 20px;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f3d2e;">${language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات المتقدمة"}</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">${language === "en" ? "Official automated financial document • No stamp required" : "وثيقة مالية رسمية مُصدرة آلياً • لا تحتاج إلى ختم"}</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename + ".pdf");
  } catch {
  } finally {
    document.body.removeChild(container);
  }
};

export const exportInvoicePDF = async (
  invoiceData: {
    items: any[];
    subTotal: number;
    discount: number;
    finalTotal: number;
    customerName: string;
  },
  pharmacyName: string,
  invoiceNumber: string,
  language: string = 'ar',
) => {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.style.minHeight = "297mm";
  container.style.backgroundColor = "#ffffff";
  container.style.direction = "rtl";
  container.style.fontFamily = "Cairo, Tahoma, sans-serif";
  container.style.color = "#1f2937";

  const generateItemsTable = () => {
    return `<table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; font-size: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background-color: #0f3d2e; color: white;">
          <th style="padding: 12px 15px; text-align: right; font-weight: bold; border-bottom: 2px solid #0a291f; width: 40%;">${language === "en" ? "Item" : "الصنف"}</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">${language === "en" ? "Qty" : "الكمية"}</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">${language === "en" ? "Unit Price" : "السعر الإفرادي"}</th>
          <th style="padding: 12px 15px; text-align: center; font-weight: bold; border-bottom: 2px solid #0a291f;">${language === "en" ? "Total" : "الإجمالي"}</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.items
          .map(
            (item, i) => `
          <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f8fafc"}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 15px; color: #334155; font-weight: bold;">${item.name}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center;">${item.qty}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center;">₪${item.price}</td>
            <td style="padding: 12px 15px; color: #334155; text-align: center; font-weight: bold;">₪${(item.qty * item.price).toLocaleString()}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>`;
  };

  container.innerHTML = `
    
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { font-family: 'Cairo', Tahoma, sans-serif !important; }
      </style>

    <div style="padding: 15mm; background: #ffffff; min-height: 267mm; position: relative;">
      
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(15, 61, 46, 0.02); font-weight: 900; z-index: 0; pointer-events: none; white-space: nowrap;">
        ${pharmacyName}
      </div>

      <div style="position: relative; z-index: 1;">
        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #0f3d2e; margin-bottom: 30px;">
          <div style="display: flex; align-items: center; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <svg style="width: 50px; height: 50px; drop-shadow: 0 2px 4px rgba(0,0,0,0.1);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#2D6E7E" />
                <g transform="rotate(-45 12 12)">
                  <path d="M8.5 12 V8.5 a3.5 3.5 0 0 1 7 0 V12 Z" fill="#88B09F" />
                  <path d="M8.5 12 v3.5 a3.5 3.5 0 0 0 7 0 V12 Z" fill="#ffffff" />
                </g>
              </svg>
            </div>
            <div>
              <h1 style="margin: 0; color: #0f3d2e; font-size: 28px; font-weight: 900;">${language === "en" ? "Sales Invoice" : "فاتورة مبيعات"}</h1>
              <h2 style="margin: 5px 0 0 0; color: #64748b; font-size: 16px;">${language === "en" ? "Pharmacy:" : "صيدلية:"} <strong style="color: #334155;">${pharmacyName}</strong></h2>
            </div>
          </div>
          <div style="text-align: left; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">${language === "en" ? "Invoice No:" : "رقم الفاتورة:"}</span> <span dir="ltr">#${invoiceNumber}</span>
            </div>
            <div style="margin-bottom: 8px; font-size: 13px; color: #64748b;">
              <span style="font-weight: bold; color: #334155;">${language === "en" ? "Date:" : "التاريخ:"}</span> <span dir="ltr">${new Date().toLocaleString("en-GB")}</span>
            </div>
            ${invoiceData.customerName ? `<div style="font-size: 13px; color: #64748b;"><span style="font-weight: bold; color: #334155;">${language === "en" ? "Customer:" : "العميل:"}</span> ${invoiceData.customerName}</div>` : ""}
          </div>
        </div>

        ${generateItemsTable()}

        <!-- Totals Section -->
        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <div style="width: 300px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #64748b;">
              <span>${language === "en" ? "Subtotal:" : "المجموع الفرعي:"}</span>
              <span style="font-weight: bold; color: #334155;">₪${invoiceData.subTotal.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; color: #ef4444;">
              <span>${language === "en" ? "Discount:" : "الخصم:"}</span>
              <span style="font-weight: bold;">₪${invoiceData.discount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px dashed #cbd5e1; font-size: 18px; color: #0f3d2e; font-weight: 900;">
              <span>${language === "en" ? "Total Due:" : "الإجمالي المطلوب:"}</span>
              <span>₪${invoiceData.finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center; border-top: 2px dashed #e2e8f0; padding-top: 20px;">
          <h3 style="color: #0f3d2e; font-size: 16px; margin: 0 0 5px 0;">${language === "en" ? "Thank you for your visit, wishing you good health" : "شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية"}</h3>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">${language === "en" ? "This invoice was issued by" : "تم إصدار هذه الفاتورة من"} ${language === "en" ? "Roshetta System" : "نظام روشتة"}</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await new Promise((r) => setTimeout(r, 500));
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("Invoice_" + invoiceNumber + ".pdf");
  } catch {
  } finally {
    document.body.removeChild(container);
  }
};
