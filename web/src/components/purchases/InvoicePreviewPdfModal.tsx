"use client";

import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  formatInvoiceStatus,
  formatPaymentMethod,
  isDraftStatus,
  resolveBranchName,
  safeJson,
} from "@/lib/purchases/domain";

interface Props {
  invoice: any | null;
  branches: any[];
  pharmacyName?: string;
  lang: "ar" | "en";
  onClose: () => void;
}

export default function InvoicePreviewPdfModal({ invoice, branches, pharmacyName, lang, onClose }: Props) {
  const isEn = lang === "en";
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  if (!invoice) return null;

  const items = safeJson<any[]>(invoice.items, []);
  const statusInfo = formatInvoiceStatus(invoice.status, lang);
  const isDraft = isDraftStatus(invoice.status);
  const totalCost = Number(invoice.total_cost ?? invoice.total ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? invoice.paid ?? 0);
  const creditSettled = Number(invoice.credit_settled ?? invoice.creditSettled ?? 0);
  const remaining = isDraft ? 0 : Math.max(0, Number(invoice.remaining ?? 0));
  const branchLabel = resolveBranchName(invoice.branch_id || invoice.branch, branches, lang);
  const supplierLabel = invoice.supplier_name || (isEn ? "No Supplier" : "بدون مورد");
  const pmLabel = paidAmount > 0 ? formatPaymentMethod(invoice.payment_method || "cash", lang).label : "—";

  const handleDownloadPdf = async () => {
    if (!printRef.current || exporting) return;
    setExporting(true);
    try {
      // 100% browser-local PDF generation (works offline seamlessly)
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .from(printRef.current)
        .set({
          margin: 8,
          filename: `purchase-${invoice.invoice_number || invoice.id}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();
    } catch {
      toast.error(isEn ? "Failed to export PDF" : "تعذر إنشاء ملف PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-mint-line flex items-center justify-between">
          <h3 className="text-lg font-black text-ink">
            {isEn ? "Purchase Invoice Preview" : "معاينة فاتورة الشراء"} #{invoice.invoice_number || invoice.id}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-bg border border-mint-line text-xs font-bold text-ink hover:border-primary"
            >
              {isEn ? "Print" : "طباعة"}
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-black hover:bg-teal disabled:opacity-50"
            >
              {exporting ? "..." : "PDF"}
            </button>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white text-slate-900" ref={printRef} dir={isEn ? "ltr" : "rtl"}>
          <div className="text-center pb-5 mb-5 border-b-2 border-dashed border-slate-200">
            {pharmacyName && <div className="text-xs font-bold text-slate-500 mb-1">{pharmacyName}</div>}
            <h2 className="text-2xl font-black text-slate-900">{supplierLabel}</h2>
            <p className="text-sm font-mono text-slate-600 mt-1">
              {isEn ? "Invoice #:" : "رقم الفاتورة:"} {invoice.invoice_number || invoice.id}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-2 text-xs font-bold text-slate-600">
              <span>{branchLabel}</span>
              <span>•</span>
              <span>{statusInfo.label}</span>
              {paidAmount > 0 && (
                <>
                  <span>•</span>
                  <span>{pmLabel}</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(invoice.date).toLocaleDateString(isEn ? "en-US" : "ar-EG")}</span>
            </div>
          </div>

          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-black text-slate-500">
                <th className="py-2 text-start">{isEn ? "Item" : "الصنف"}</th>
                <th className="py-2 text-center">{isEn ? "Qty" : "الكمية"}</th>
                <th className="py-2 text-center">{isEn ? "Unit Cost" : "سعر الشراء"}</th>
                <th className="py-2 text-end">{isEn ? "Total" : "الإجمالي"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const qty = Number(item.qty) || 0;
                const cost = Number(item.cost ?? item.purchase_price ?? 0);
                return (
                  <tr key={idx}>
                    <td className="py-2.5 text-sm font-bold text-slate-800">
                      <div>{item.name}</div>
                      {(item.expiry_date || item.expiry) && (
                        <div className="text-[11px] font-mono text-slate-500">Exp: {item.expiry_date || item.expiry}</div>
                      )}
                    </td>
                    <td className="py-2.5 text-sm font-mono text-center">{qty}</td>
                    <td className="py-2.5 text-sm font-mono text-center">₪{cost.toFixed(2)}</td>
                    <td className="py-2.5 text-sm font-mono font-black text-end">₪{(qty * cost).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {invoice.notes && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <strong>{isEn ? "Notes:" : "ملاحظات:"}</strong> {invoice.notes}
            </div>
          )}

          <div className="mt-5 pt-4 border-t-2 border-dashed border-slate-200 space-y-2">
            <div className="flex justify-between text-base font-black">
              <span>{isEn ? "Grand Total" : "الإجمالي الكلي"}</span>
              <span className="font-mono">₪{totalCost.toFixed(2)}</span>
            </div>
            {creditSettled > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-700">
                <span>{isEn ? "Supplier Credit Offset" : "تسوية تلقائية من الرصيد الدائن"}</span>
                <span className="font-mono">-₪{creditSettled.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>{isEn ? "Paid" : "المدفوع"}</span>
              <span className="font-mono">₪{paidAmount.toFixed(2)}</span>
            </div>
            {!isDraft && (
              <div className="flex justify-between text-sm font-black text-rose-700">
                <span>{isEn ? "Remaining Balance" : "المتبقي ذمة"}</span>
                <span className="font-mono">₪{remaining.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
