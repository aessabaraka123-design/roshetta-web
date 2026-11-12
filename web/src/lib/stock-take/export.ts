/**
 * web/src/lib/stock-take/export.ts
 * Global ERP Excel Variance & Shrinkage Export + Printable Blind/Full Count Sheet.
 */

// @ts-ignore
import XLSX from "xlsx-js-style";
import { formatQtyWithUnits, round2 } from "@/lib/inventory/domain";
import { formatSignedDeltaWithUnits, formatStockTakeReason } from "@/lib/stock-take/domain";

const borderThin = {
  top: { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
};

const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: { fgColor: { rgb: "1B3A5C" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: borderThin,
};

const titleStyle = {
  font: { bold: true, color: { rgb: "1B3A5C" }, sz: 14 },
  alignment: { horizontal: "center", vertical: "center" },
};

const cellStyle = {
  font: { color: { rgb: "1C2733" }, sz: 10 },
  alignment: { horizontal: "center", vertical: "center" },
  border: borderThin,
};

export function exportStockTakeVarianceExcel({
  sessionNumber,
  title,
  lines,
  summary,
  pharmacyName = "Roshetta Pharmacy",
  showCosts = true,
  language = "ar",
}: {
  sessionNumber?: string;
  title?: string;
  lines: any[];
  summary?: any;
  pharmacyName?: string;
  showCosts?: boolean;
  language?: "ar" | "en";
}) {
  const isEn = language === "en";
  const today = new Date().toISOString().split("T")[0];
  const rows: any[][] = [];

  rows.push([
    isEn
      ? `Stock Take Variance Report — ${sessionNumber || "DRAFT"} — ${pharmacyName} (${today})`
      : `تقرير فروقات الجرد — ${sessionNumber || "مسودة"} — ${pharmacyName} (${today})`,
  ]);
  if (title) rows.push([title]);
  else rows.push([]);

  const headers = showCosts
    ? isEn
      ? ["Drug", "Barcode", "Expected Qty", "Actual Qty", "Variance", "Variance %", "Reason", "Unit Cost", "Cost Impact", "Notes"]
      : ["اسم الصنف", "الباركود", "الرصيد الدفتري", "الجرد الفعلي", "الفرق", "نسبة الفارق %", "السبب", "متوسط التكلفة", "الأثر المالي", "ملاحظات"]
    : isEn
      ? ["Drug", "Barcode", "Expected Qty", "Actual Qty", "Variance", "Variance %", "Reason", "Notes"]
      : ["اسم الصنف", "الباركود", "الرصيد الدفتري", "الجرد الفعلي", "الفرق", "نسبة الفارق %", "السبب", "ملاحظات"];

  const headerRowIndex = rows.length;
  rows.push(headers);

  for (const line of lines) {
    const units = line.units;
    const expectedVal = line.expectedBaseQty ?? line.expectedQty ?? 0;
    const actualVal = line.actualBaseQty ?? line.actualQty ?? 0;
    const expectedFmt = formatQtyWithUnits({ qty: expectedVal, units }, units, language);
    const actualFmt = formatQtyWithUnits({ qty: actualVal, units }, units, language);
    const deltaFmt = formatSignedDeltaWithUnits(line.deltaBaseQty || 0, units, language);
    const reasonLabel = formatStockTakeReason(line.reasonCode || line.reason, line.deltaBaseQty || 0, language).label;
    const pctText = `${round2(line.variancePct || 0)}%`;

    if (showCosts) {
      rows.push([
        line.name || "",
        line.barcode || "",
        expectedFmt,
        actualFmt,
        deltaFmt,
        pctText,
        reasonLabel,
        round2(line.weightedUnitCost ?? 0),
        round2(line.costImpact ?? 0),
        line.notes || "",
      ]);
    } else {
      rows.push([
        line.name || "",
        line.barcode || "",
        expectedFmt,
        actualFmt,
        deltaFmt,
        pctText,
        reasonLabel,
        line.notes || "",
      ]);
    }
  }

  if (summary) {
    const countedN = summary.countedLines ?? summary.countedCount ?? 0;
    const totalN = summary.totalLines ?? summary.totalItems ?? lines.length;
    const matchedN = Math.max(0, totalN - (summary.changedLinesCount ?? summary.discrepancyCount ?? 0));
    const diffN = summary.changedLinesCount ?? summary.discrepancyCount ?? 0;
    rows.push([]);
    if (showCosts) {
      rows.push([
        isEn ? "Totals" : "الإجمالي",
        "",
        isEn ? `Counted: ${countedN}/${totalN}` : `تم جرد: ${countedN}/${totalN}`,
        isEn ? `Matched: ${matchedN}` : `مطابق: ${matchedN}`,
        isEn ? `Discrepancies: ${diffN}` : `فروقات: ${diffN}`,
        `${round2(summary.shrinkagePct ?? 0)}%`,
        isEn ? `Shortage: -${round2(summary.shortageCostValue ?? 0)}` : `العجز: -${round2(summary.shortageCostValue ?? 0)}`,
        isEn ? `Surplus: +${round2(summary.surplusCostValue ?? 0)}` : `الفائض: +${round2(summary.surplusCostValue ?? 0)}`,
        round2(summary.netVarianceValue ?? 0),
        "",
      ]);
    } else {
      rows.push([
        isEn ? "Totals" : "الإجمالي",
        "",
        isEn ? `Counted: ${countedN}/${totalN}` : `تم جرد: ${countedN}/${totalN}`,
        isEn ? `Matched: ${matchedN}` : `مطابق: ${matchedN}`,
        isEn ? `Discrepancies: ${diffN}` : `فروقات: ${diffN}`,
        "",
        "",
        "",
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colCount = headers.length;
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  ws["!cols"] = headers.map((_, i) => ({ wch: i === 0 ? 28 : i === 2 || i === 3 || i === 4 ? 20 : 14 }));
  ws["!views"] = [{ rightToLeft: !isEn }];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      if (r === 0) ws[ref].s = titleStyle;
      else if (r === headerRowIndex) ws[ref].s = headerStyle;
      else if (r > headerRowIndex) ws[ref].s = cellStyle;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isEn ? "Variance Report" : "تقرير فروقات الجرد");
  XLSX.writeFile(wb, `roshetta-stock-take-${sessionNumber || today}.xlsx`);
}

export function printStockTakeCountSheet({
  sessionNumber,
  title,
  lines,
  blindMode = false,
  pharmacyName = "Roshetta Pharmacy",
  language = "ar",
}: {
  sessionNumber?: string;
  title?: string;
  lines: any[];
  blindMode?: boolean;
  pharmacyName?: string;
  language?: "ar" | "en";
}) {
  if (typeof window === "undefined") return;
  const isEn = language === "en";
  const dir = isEn ? "ltr" : "rtl";
  const today = new Date().toLocaleDateString(isEn ? "en-GB" : "ar-EG");

  const escapeHtml = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const rowsHtml = lines
    .map((line, idx) => {
      const units = Array.isArray(line.units) ? line.units : [];
      const unitNames = units.length > 0 ? units.map((u: any) => u.name).join(" / ") : isEn ? "Unit" : "وحدة";
      const expectedVal = line.expectedBaseQty ?? line.expectedQty ?? 0;
      const expectedCol = blindMode
        ? ""
        : `<td>${escapeHtml(formatQtyWithUnits({ qty: expectedVal, units }, units, language))}</td>`;
      return `
        <tr>
          <td>${idx + 1}</td>
          <td style="text-align:${isEn ? "left" : "right"};font-weight:700">${escapeHtml(line.name)}</td>
          <td style="font-family:monospace">${escapeHtml(line.barcode || "—")}</td>
          <td>${escapeHtml(unitNames)}</td>
          ${expectedCol}
          <td style="min-width:110px"></td>
          <td style="min-width:120px">${escapeHtml(line.notes || "")}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(sessionNumber || "Stock Take")} — ${escapeHtml(pharmacyName)}</title>
  <style>
    body { font-family: Arial, Tahoma, sans-serif; margin: 20px; color: #0f172a; }
    h1 { font-size: 18px; margin: 0 0 4px 0; color: #1B3A5C; }
    .meta { font-size: 12px; color: #475569; margin-bottom: 14px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid #cbd5e1; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
    th { background: #1B3A5C; color: #fff; font-weight: 700; }
    tr:nth-child(even) { background: #f8fafc; }
    .sig { margin-top: 24px; display: flex; justify-content: space-between; font-size: 12px; color: #334155; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(pharmacyName)} — ${isEn ? "Physical Count Sheet" : "كشف الجرد الفعلي للمخزون"}</h1>
  <div class="meta">
    <span><strong>${isEn ? "Session" : "الجلسة"}:</strong> ${escapeHtml(sessionNumber || (isEn ? "Draft" : "مسودة"))} ${title ? `— ${escapeHtml(title)}` : ""}</span>
    <span><strong>${isEn ? "Date" : "التاريخ"}:</strong> ${escapeHtml(today)}</span>
    <span class="badge">${blindMode ? (isEn ? "BLIND COUNT SHEET" : "جرد أعمى (الرصيد الدفتري مخفي)") : (isEn ? "STANDARD COUNT SHEET" : "جرد قياسي")}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${isEn ? "Item Name" : "اسم الصنف"}</th>
        <th>${isEn ? "Barcode" : "الباركود"}</th>
        <th>${isEn ? "Units" : "الوحدات"}</th>
        ${blindMode ? "" : `<th>${isEn ? "Expected" : "الدفتري"}</th>`}
        <th>${isEn ? "Actual Count" : "العدّ الفعلي"}</th>
        <th>${isEn ? "Notes" : "ملاحظات"}</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="sig">
    <span>${isEn ? "Counted By" : "توقيع القائم بالجرد"}: _______________________</span>
    <span>${isEn ? "Verified / Manager" : "اعتماد مدير الصيدلية"}: _______________________</span>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1024,height=760");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
