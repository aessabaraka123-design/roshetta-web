"use client";

import React from "react";
import {
  formatInvoiceStatus,
  formatPaymentMethod,
  isCompletedStatus,
  isDraftStatus,
  resolveBranchName,
  safeJson,
} from "@/lib/purchases/domain";

interface Props {
  invoice: any;
  branches: any[];
  lang: "ar" | "en";
  isDownloadingPdf: boolean;
  onPreview: (inv: any) => void;
  onDownloadPdf: (inv: any) => void;
  onPay: (inv: any) => void;
  onEdit: (inv: any) => void;
  onDelete: (inv: any) => void;
}

export default function PurchaseInvoiceCard({
  invoice,
  branches,
  lang,
  isDownloadingPdf,
  onPreview,
  onDownloadPdf,
  onPay,
  onEdit,
  onDelete,
}: Props) {
  const isEn = lang === "en";
  const statusInfo = formatInvoiceStatus(invoice.status, lang);
  const isDraft = isDraftStatus(invoice.status);
  const isCompleted = isCompletedStatus(invoice.status);
  const items = safeJson<any[]>(invoice.items, []);
  const totalCost = Number(invoice.total_cost ?? invoice.total ?? 0);
  const paidAmount = Number(invoice.paid_amount ?? invoice.paid ?? 0);
  const creditSettled = Number(invoice.credit_settled ?? invoice.creditSettled ?? 0);
  const remaining = isDraft ? 0 : Math.max(0, Number(invoice.remaining ?? 0));
  const branchLabel = resolveBranchName(invoice.branch_id || invoice.branch, branches, lang);
  const pmLabel = paidAmount > 0 ? formatPaymentMethod(invoice.payment_method || "cash", lang).label : "";

  const badgeClass =
    statusInfo.badgeTone === "emerald"
      ? "bg-teal/10 text-teal border-teal/25"
      : statusInfo.badgeTone === "amber"
      ? "bg-amber-pale text-amber border-amber/30"
      : "bg-coral-pale text-coral border-coral/30";

  return (
    <div className="bg-card border border-mint-line rounded-2xl p-4 sm:p-5 shadow-sm hover:border-primary/40 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${badgeClass}`}>{statusInfo.label}</span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-bg border border-mint-line text-ink">
              #{invoice.invoice_number || invoice.id}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-bg border border-mint-line text-ink-soft">
              {branchLabel}
            </span>
            {pmLabel && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-pale text-primary border border-primary/20">
                {pmLabel}
              </span>
            )}
          </div>

          <div className="text-base sm:text-lg font-black text-ink truncate">
            {invoice.supplier_name || (isEn ? "Cash Purchase (No Supplier)" : "شراء مباشر (بدون مورد)")}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-soft font-semibold">
            <span>
              {new Date(invoice.date).toLocaleDateString(isEn ? "en-US" : "ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>{isEn ? `${items.length} items` : `${items.length} صنف`}</span>
            {creditSettled > 0 && (
              <span className="text-teal font-bold">
                {isEn ? `Credit Offset: ₪${creditSettled.toFixed(2)}` : `تسوية رصيد دائن: ₪${creditSettled.toFixed(2)}`}
              </span>
            )}
            {invoice.notes && <span className="truncate max-w-xs">{isEn ? `Note: ${invoice.notes}` : `ملاحظة: ${invoice.notes}`}</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
          <div className="grid grid-cols-3 gap-3 text-center bg-bg border border-mint-line rounded-xl px-4 py-2.5">
            <div>
              <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Total" : "الإجمالي"}</div>
              <div className="text-sm font-black font-mono text-ink">₪{totalCost.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Paid" : "المدفوع"}</div>
              <div className="text-sm font-black font-mono text-teal">₪{paidAmount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Remaining" : "المتبقي"}</div>
              <div className={`text-sm font-black font-mono ${remaining > 0 ? "text-coral" : "text-ink-soft"}`}>
                {isDraft ? "—" : `₪${remaining.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCompleted && remaining > 0 && (
              <button
                type="button"
                onClick={() => onPay(invoice)}
                className="px-3.5 py-2 rounded-xl bg-teal text-white text-xs font-black hover:opacity-90 transition-all shadow-sm"
              >
                {isEn ? "Pay" : "سداد"}
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(invoice)}
              className="px-3.5 py-2 rounded-xl bg-primary-pale text-primary text-xs font-black hover:bg-primary hover:text-white transition-all"
            >
              {isDraft ? (isEn ? "Edit / Receive" : "تعديل / استلام") : isEn ? "Edit" : "تعديل"}
            </button>
            <button
              type="button"
              onClick={() => onPreview(invoice)}
              className="px-3 py-2 rounded-xl bg-bg border border-mint-line text-ink text-xs font-bold hover:border-primary transition-all"
            >
              {isEn ? "Preview" : "معاينة"}
            </button>
            <button
              type="button"
              disabled={isDownloadingPdf}
              onClick={() => onDownloadPdf(invoice)}
              className="px-3 py-2 rounded-xl bg-bg border border-mint-line text-ink text-xs font-bold hover:border-primary transition-all disabled:opacity-50"
            >
              {isDownloadingPdf ? "..." : "PDF"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(invoice)}
              className="px-3 py-2 rounded-xl bg-coral-pale text-coral text-xs font-black hover:bg-coral hover:text-white transition-all"
            >
              {isEn ? "Delete" : "حذف"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
