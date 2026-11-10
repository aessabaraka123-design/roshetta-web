/**
 * web/src/lib/customers/print.ts
 * Clean HTML iframe printing helpers for Customer Payment Vouchers and Account Statements.
 */

import {
  formatPaymentMethod,
  formatTransactionType,
  round2,
  type CustomerRecord,
  type CustomerTransactionRecord,
} from "@/lib/customers/domain";

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printHtmlDocument(html: string) {
  if (typeof document === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }, 250);
}

export function printCustomerVoucher({
  pharmacyName,
  customer,
  voucher,
  lang = "ar",
}: {
  pharmacyName: string;
  customer: CustomerRecord;
  voucher: {
    voucherNumber?: string;
    referenceId?: string;
    type?: string;
    amount: number;
    balanceBefore?: number;
    balanceAfter?: number;
    paymentMethod?: string;
    electronicRef?: string;
    branchName?: string;
    cashierName?: string;
    notes?: string;
    date?: string;
  };
  lang?: "ar" | "en";
}) {
  const isEn = lang === "en";
  const dir = isEn ? "ltr" : "rtl";
  const pmInfo = formatPaymentMethod(voucher.paymentMethod || "cash", lang);
  const isDebit = voucher.type === "manual_debit" || voucher.type === "credit_sale";
  const title = isDebit
    ? isEn
      ? "Customer Debt Debit Notice"
      : "إشعار قيد دين على عميل"
    : isEn
      ? "Official Debt Receipt Voucher"
      : "سند قبض / إيداع عميل رسمي";

  const before = voucher.balanceBefore != null ? round2(voucher.balanceBefore) : null;
  const after = voucher.balanceAfter != null ? round2(voucher.balanceAfter) : round2(customer.debt || 0);
  const dateLabel = voucher.date ? new Date(voucher.date).toLocaleString(isEn ? "en-US" : "ar-EG") : new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Cairo, Tahoma, Arial, sans-serif; background: #fff; color: #0f172a; margin: 20px; }
    .card { max-width: 480px; margin: 0 auto; border: 2px solid #0d4f8b; border-radius: 14px; padding: 20px; }
    .hdr { text-align: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 14px; }
    .hdr h1 { margin: 0; font-size: 18px; color: #0d4f8b; }
    .hdr p { margin: 4px 0 0; font-size: 13px; color: #475569; font-weight: bold; }
    .badge { display: inline-block; margin-top: 8px; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; background: #eff6ff; color: #0d4f8b; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .row strong { color: #334155; }
    .amt { text-align: center; background: ${isDebit ? "#fff1f2" : "#ecfdf5"}; color: ${isDebit ? "#be123c" : "#047857"}; border-radius: 10px; padding: 12px; margin: 14px 0; }
    .amt .lbl { font-size: 12px; font-weight: bold; }
    .amt .val { font-size: 24px; font-weight: 900; font-family: monospace; margin-top: 4px; }
    .foot { text-align: center; font-size: 11px; color: #64748b; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hdr">
      <h1>${escapeHtml(pharmacyName)}</h1>
      <p>${escapeHtml(title)}</p>
      <div class="badge">${voucher.voucherNumber ? `#${escapeHtml(voucher.voucherNumber)}` : escapeHtml(voucher.referenceId || "")}</div>
    </div>
    <div class="amt">
      <div class="lbl">${isEn ? "Amount" : "قيمة السند"}</div>
      <div class="val">${round2(voucher.amount).toFixed(2)} ₪</div>
    </div>
    <div class="row"><strong>${isEn ? "Customer:" : "العميل:"}</strong><span>${escapeHtml(customer.name)}${customer.phone ? ` (${escapeHtml(customer.phone)})` : ""}</span></div>
    ${before !== null ? `<div class="row"><strong>${isEn ? "Balance Before:" : "الرصيد السابق:"}</strong><span dir="ltr">${before.toFixed(2)} ₪</span></div>` : ""}
    <div class="row"><strong>${isEn ? "Balance After:" : "الرصيد الجديد:"}</strong><span dir="ltr" style="font-weight:900">${after < -0.005 ? `${Math.abs(after).toFixed(2)} ₪ (${isEn ? "Credit" : "له رصيد دائن"})` : `${after.toFixed(2)} ₪`}</span></div>
    <div class="row"><strong>${isEn ? "Method:" : "وسيلة الدفع:"}</strong><span>${escapeHtml(pmInfo.emoji)} ${escapeHtml(pmInfo.label)}</span></div>
    ${voucher.electronicRef ? `<div class="row"><strong>${isEn ? "Reference:" : "المرجع الإلكتروني:"}</strong><span dir="ltr">${escapeHtml(voucher.electronicRef)}</span></div>` : ""}
    ${voucher.branchName ? `<div class="row"><strong>${isEn ? "Branch:" : "الفرع:"}</strong><span>${escapeHtml(voucher.branchName)}</span></div>` : ""}
    ${voucher.cashierName ? `<div class="row"><strong>${isEn ? "Recorded By:" : "المسؤول:"}</strong><span>${escapeHtml(voucher.cashierName)}</span></div>` : ""}
    <div class="row"><strong>${isEn ? "Date:" : "التاريخ:"}</strong><span dir="ltr">${escapeHtml(dateLabel)}</span></div>
    ${voucher.notes ? `<div class="row"><strong>${isEn ? "Notes:" : "ملاحظات:"}</strong><span>${escapeHtml(voucher.notes)}</span></div>` : ""}
    <div class="foot">${isEn ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}</div>
  </div>
</body>
</html>`;

  printHtmlDocument(html);
}

export function printCustomerStatement({
  pharmacyName,
  customer,
  transactions,
  kpis,
  lang = "ar",
}: {
  pharmacyName: string;
  customer: CustomerRecord;
  transactions: CustomerTransactionRecord[];
  kpis: {
    currentBalance: number;
    totalCreditSales: number;
    totalCashSales: number;
    totalPayments: number;
  };
  lang?: "ar" | "en";
}) {
  const isEn = lang === "en";
  const dir = isEn ? "ltr" : "rtl";

  const rowsHtml = transactions
    .map((tx) => {
      const txInfo = formatTransactionType(tx.type, lang);
      const pmInfo = tx.payment_method ? formatPaymentMethod(tx.payment_method, lang) : { label: "-" };
      const debit = txInfo.direction === "debit" ? round2(tx.amount).toFixed(2) : "-";
      const credit = txInfo.direction === "credit" ? round2(tx.amount).toFixed(2) : "-";
      const dateStr = tx.date ? new Date(tx.date).toLocaleDateString(isEn ? "en-US" : "ar-EG") : "";
      return `<tr>
        <td>${tx.voucher_number ? `#${escapeHtml(tx.voucher_number)}` : escapeHtml(tx.reference_id || "-")}</td>
        <td>${escapeHtml(dateStr)}</td>
        <td>${escapeHtml(txInfo.label)}${tx.notes ? `<div style="font-size:11px;color:#64748b">${escapeHtml(tx.notes)}</div>` : ""}</td>
        <td>${escapeHtml(pmInfo.label)}${tx.electronic_ref ? ` (${escapeHtml(tx.electronic_ref)})` : ""}</td>
        <td style="color:#be123c;font-weight:bold" dir="ltr">${debit}</td>
        <td style="color:#047857;font-weight:bold" dir="ltr">${credit}</td>
        <td style="font-weight:900" dir="ltr">${round2(tx.balance_after).toFixed(2)} ₪</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${isEn ? "Customer Account Statement" : "كشف حساب العميل"}</title>
  <style>
    body { font-family: Cairo, Tahoma, Arial, sans-serif; color: #0f172a; margin: 24px; }
    .hdr { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d4f8b; padding-bottom: 12px; margin-bottom: 16px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center; }
    .kpi .lbl { font-size: 11px; color: #475569; font-weight: bold; }
    .kpi .val { font-size: 16px; font-weight: 900; font-family: monospace; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: ${isEn ? "left" : "right"}; }
    th { background: #f8fafc; font-weight: bold; }
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1 style="margin:0;font-size:20px;color:#0d4f8b">${escapeHtml(pharmacyName)}</h1>
      <div style="font-size:15px;font-weight:bold;margin-top:4px">${isEn ? "Customer Account Statement:" : "كشف حساب العميل:"} ${escapeHtml(customer.name)}</div>
      <div style="font-size:12px;color:#475569">${customer.phone ? escapeHtml(customer.phone) : ""}</div>
    </div>
    <div style="font-size:12px;color:#475569">${new Date().toLocaleString(isEn ? "en-US" : "ar-EG")}</div>
  </div>
  <div class="kpis">
    <div class="kpi"><div class="lbl">${kpis.currentBalance < -0.005 ? (isEn ? "Store Credit" : "رصيد دائن للعميل") : (isEn ? "Balance Due" : "الدين المتبقي")}</div><div class="val" dir="ltr">${Math.abs(round2(kpis.currentBalance)).toFixed(2)} ₪</div></div>
    <div class="kpi"><div class="lbl">${isEn ? "Credit Charges" : "إجمالي الديون والآجل"}</div><div class="val" dir="ltr">${round2(kpis.totalCreditSales).toFixed(2)} ₪</div></div>
    <div class="kpi"><div class="lbl">${isEn ? "Payments & Credits" : "السداد والمرتجع الدائن"}</div><div class="val" dir="ltr">${round2(kpis.totalPayments).toFixed(2)} ₪</div></div>
    <div class="kpi"><div class="lbl">${isEn ? "Paid Purchases" : "مشتريات مدفوعة"}</div><div class="val" dir="ltr">${round2(kpis.totalCashSales).toFixed(2)} ₪</div></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isEn ? "Voucher" : "السند"}</th>
        <th>${isEn ? "Date" : "التاريخ"}</th>
        <th>${isEn ? "Statement / Notes" : "البيان"}</th>
        <th>${isEn ? "Method" : "الطريقة"}</th>
        <th>${isEn ? "Debit (+)" : "مدين (+)"}</th>
        <th>${isEn ? "Credit (-)" : "دائن (-)"}</th>
        <th>${isEn ? "Balance" : "الرصيد"}</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || `<tr><td colspan="7" style="text-align:center">${isEn ? "No entries" : "لا توجد حركات مسجلة"}</td></tr>`}</tbody>
  </table>
</body>
</html>`;

  printHtmlDocument(html);
}
