/**
 * web/src/lib/inventory/export.ts
 * Global ERP Corporate Excel Export for Inventory Valuation, FEFO Batches, and Stock Take Sheets.
 */

// @ts-ignore
import XLSX from "xlsx-js-style";
import {
  computeStockStatus,
  formatQtyWithUnits,
  resolveBranchName,
  round2,
  type BranchRecord,
} from "@/lib/inventory/domain";

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

function downloadWorkbook(wb: any, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportInventoryValuationExcel({
  items,
  branches = [],
  pharmacyName = "Roshetta Pharmacy",
  showCosts = true,
  language = "ar",
}: {
  items: any[];
  branches?: BranchRecord[];
  pharmacyName?: string;
  showCosts?: boolean;
  language?: "ar" | "en";
}) {
  const isEn = language === "en";
  const today = new Date().toISOString().split("T")[0];
  const rows: any[][] = [];

  rows.push([
    isEn
      ? `Inventory Valuation & Stock Report — ${pharmacyName} (${today})`
      : `تقرير جرد وتقييم المخزون — ${pharmacyName} (${today})`,
  ]);
  rows.push([]);

  const headers = showCosts
    ? isEn
      ? ["Name", "Scientific Name", "Barcode", "Category", "Branch", "Stock", "Boxes", "Min Boxes", "Expiry", "Unit Cost", "Sell Price", "Cost Value", "Retail Value", "Controlled"]
      : ["الاسم التجاري", "الاسم العلمي", "الباركود", "الفئة", "الفرع", "الكمية المفصلة", "عدد العلب", "الحد الأدنى (علب)", "الصلاحية", "التكلفة", "سعر البيع", "قيمة التكلفة", "قيمة البيع", "مراقب"]
    : isEn
      ? ["Name", "Scientific Name", "Barcode", "Category", "Branch", "Stock", "Boxes", "Min Boxes", "Expiry", "Sell Price", "Retail Value", "Controlled"]
      : ["الاسم التجاري", "الاسم العلمي", "الباركود", "الفئة", "الفرع", "الكمية المفصلة", "عدد العلب", "الحد الأدنى (علب)", "الصلاحية", "سعر البيع", "قيمة البيع", "مراقب"];

  rows.push(headers);

  let totalCost = 0;
  let totalRetail = 0;

  for (const item of items) {
    const st = computeStockStatus(item);
    totalCost = round2(totalCost + st.costValue);
    totalRetail = round2(totalRetail + st.retailValue);
    const branchLabel = resolveBranchName(branches, item.branch_id, item.branchName, language);
    const ctrlLabel = [true, 1, "1"].includes(item.isControlled) ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا");
    const stockText = formatQtyWithUnits(item, item.units, language);

    if (showCosts) {
      rows.push([
        item.name || "",
        item.scientificName || "",
        item.barcode || "",
        item.category || "",
        branchLabel,
        stockText,
        st.boxesRemaining,
        st.minQtyBoxes,
        st.nearestExpiry || "—",
        round2(item.cost),
        round2(item.price),
        st.costValue,
        st.retailValue,
        ctrlLabel,
      ]);
    } else {
      rows.push([
        item.name || "",
        item.scientificName || "",
        item.barcode || "",
        item.category || "",
        branchLabel,
        stockText,
        st.boxesRemaining,
        st.minQtyBoxes,
        st.nearestExpiry || "—",
        round2(item.price),
        st.retailValue,
        ctrlLabel,
      ]);
    }
  }

  rows.push([]);
  if (showCosts) {
    rows.push([isEn ? "Totals" : "الإجمالي", "", "", "", "", items.length, "", "", "", "", "", totalCost, totalRetail, ""]);
  } else {
    rows.push([isEn ? "Totals" : "الإجمالي", "", "", "", "", items.length, "", "", "", "", totalRetail, ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colCount = headers.length;
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  ws["!cols"] = headers.map((_, i) => ({ wch: i === 0 ? 28 : i === 5 ? 22 : 14 }));
  ws["!views"] = [{ rightToLeft: !isEn }];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      if (r === 0) ws[ref].s = titleStyle;
      else if (r === 2) ws[ref].s = headerStyle;
      else if (r > 2) ws[ref].s = cellStyle;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isEn ? "Inventory Valuation" : "تقييم المخزون");
  downloadWorkbook(wb, `roshetta-inventory-${today}.xlsx`);
}

export function exportBatchesFefoExcel({
  batches,
  pharmacyName = "Roshetta Pharmacy",
  showCosts = true,
  language = "ar",
}: {
  batches: any[];
  pharmacyName?: string;
  showCosts?: boolean;
  language?: "ar" | "en";
}) {
  const isEn = language === "en";
  const today = new Date().toISOString().split("T")[0];
  const rows: any[][] = [];
  rows.push([isEn ? `FEFO Batches & Expiry Report — ${pharmacyName} (${today})` : `تقرير التشغيلات والصلاحيات (FEFO) — ${pharmacyName} (${today})`]);
  rows.push([]);

  const headers = showCosts
    ? isEn
      ? ["Drug", "Batch #", "Expiry", "Days Left", "Stock Remaining", "Boxes", "Unit Cost", "Sell Price", "Status"]
      : ["الدواء", "رقم التشغيلة", "تاريخ الانتهاء", "الأيام المتبقية", "الرصيد", "العلب", "التكلفة", "سعر البيع", "الحالة"]
    : isEn
      ? ["Drug", "Batch #", "Expiry", "Days Left", "Stock Remaining", "Boxes", "Sell Price", "Status"]
      : ["الدواء", "رقم التشغيلة", "تاريخ الانتهاء", "الأيام المتبقية", "الرصيد", "العلب", "سعر البيع", "الحالة"];

  rows.push(headers);

  for (const b of batches) {
    const statusText = b.expiryStatus?.isExpired
      ? (isEn ? "Expired" : "منتهي")
      : b.expiryStatus?.isCritical
        ? (isEn ? "Critical (<=30d)" : "حرج (<=30 يوم)")
        : b.expiryStatus?.isExpiringSoon
          ? (isEn ? "Warning (<=60d)" : "قريب (<=60 يوم)")
          : (isEn ? "Valid" : "سليم");
    const stockFmt = formatQtyWithUnits({ qty: b.qty, units: b.units }, b.units, language);

    if (showCosts) {
      rows.push([
        b.drug_name || "",
        b.batch_number || "—",
        b.expiry || "—",
        b.expiryStatus?.daysLeft ?? "—",
        stockFmt,
        b.remainingBoxes ?? b.qty,
        round2(b.cost ?? b.purchase_price),
        round2(b.price),
        statusText,
      ]);
    } else {
      rows.push([
        b.drug_name || "",
        b.batch_number || "—",
        b.expiry || "—",
        b.expiryStatus?.daysLeft ?? "—",
        stockFmt,
        b.remainingBoxes ?? b.qty,
        round2(b.price),
        statusText,
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colCount = headers.length;
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  ws["!cols"] = headers.map((_, i) => ({ wch: i === 0 ? 28 : i === 4 ? 22 : 14 }));
  ws["!views"] = [{ rightToLeft: !isEn }];

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < colCount; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;
      if (r === 0) ws[ref].s = titleStyle;
      else if (r === 2) ws[ref].s = headerStyle;
      else if (r > 2) ws[ref].s = cellStyle;
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, isEn ? "FEFO Batches" : "الدفعات والصلاحيات");
  downloadWorkbook(wb, `roshetta-batches-fefo-${today}.xlsx`);
}
