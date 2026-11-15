// @ts-ignore
import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useStore } from "@/store";

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
  const cogs = report.totalCost != null ? Number(report.totalCost) : Math.max(0, (totalSales - totalVat) - grossProfit);

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

import { buildUnifiedReportHtml } from "./reportTemplate";

export { buildUnifiedReportHtml };

export const exportComprehensivePDF = async (
  report: any,
  pharmacyName: string,
  dateRange: string,
  filename: string,
  branchName: string = "الفرع الرئيسي",
) => {
  const language = useStore.getState().language;
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "820px";
  container.style.zIndex = "-9999";
  container.style.opacity = "0.01";
  container.style.pointerEvents = "none";
  container.style.backgroundColor = "#ffffff";
  container.style.direction = language === "en" ? "ltr" : "rtl";
  container.style.fontFamily = "var(--font-ibm-plex-sans-arabic), 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif";
  container.style.color = "#1f2937";
  container.style.lineHeight = "1.9";
  container.style.letterSpacing = "normal";
  container.style.wordSpacing = "normal";

  container.innerHTML = buildUnifiedReportHtml({
    report,
    pharmacyName,
    dateRange,
    branchName,
    language,
  });

  document.body.appendChild(container);

  try {
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 600));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1200,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = pdfHeight;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    try {
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      pdf.save(`${filename}.pdf`);
    }
  } catch (err) {
    console.error("PDF Export Error:", err);
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};

export const exportComprehensiveWord = (
  report: any,
  pharmacyName: string,
  dateRange: string,
  filename: string,
  branchName: string = "الفرع الرئيسي",
) => {
  const language = useStore.getState().language;
  const isRtl = language !== "en";
  const bodyContent = buildUnifiedReportHtml({
    report,
    pharmacyName,
    dateRange,
    branchName,
    language,
  });

  const wordDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 210mm 297mm;
          margin: 15mm 15mm 15mm 15mm;
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body {
          font-family: 'Segoe UI', 'Cairo', Tahoma, Arial, sans-serif;
          direction: ${isRtl ? "rtl" : "ltr"};
          text-align: ${isRtl ? "right" : "left"};
          background: #ffffff;
          margin: 0;
          padding: 0;
        }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${bodyContent}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", wordDocument], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
