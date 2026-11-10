"use client";

import React, { useMemo } from "react";
import {
  formatInvoiceStatus,
  isCompletedStatus,
  isDraftStatus,
  resolveBranchName,
} from "@/lib/purchases/domain";

interface Props {
  supplier: any | null;
  purchases: any[];
  branches: any[];
  lang: "ar" | "en";
  onClose: () => void;
  onPreviewInvoice: (inv: any) => void;
  onPayInvoice: (inv: any) => void;
}

export default function SupplierInvoicesModal({
  supplier,
  purchases,
  branches,
  lang,
  onClose,
  onPreviewInvoice,
  onPayInvoice,
}: Props) {
  const isEn = lang === "en";

  const supplierInvoices = useMemo(() => {
    if (!supplier) return [];
    const targetName = String(supplier.name || "").trim().toLowerCase();
    return purchases.filter(
      (p) =>
        String(p.supplier_id || "") === String(supplier.id) ||
        (targetName && String(p.supplier_name || "").trim().toLowerCase() === targetName)
    );
  }, [supplier, purchases]);

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-mint-line flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-ink">
              {isEn ? "Supplier Invoices:" : "فواتير المورد:"} {supplier.name}
            </h3>
            <p className="text-xs font-bold text-ink-soft mt-0.5">
              {isEn ? `${supplierInvoices.length} invoices` : `${supplierInvoices.length} فاتورة مسجلة`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {supplierInvoices.length === 0 ? (
            <div className="text-center py-12 text-sm font-bold text-ink-soft">
              {isEn ? "No purchase invoices recorded for this supplier" : "لا توجد فواتير مشتريات مسجلة لهذا المورد"}
            </div>
          ) : (
            supplierInvoices.map((inv) => {
              const st = formatInvoiceStatus(inv.status, lang);
              const isDraft = isDraftStatus(inv.status);
              const isCompleted = isCompletedStatus(inv.status);
              const remaining = isDraft ? 0 : Math.max(0, Number(inv.remaining || 0));
              const total = Number(inv.total_cost ?? inv.total ?? 0);
              const paid = Number(inv.paid_amount ?? inv.paid ?? 0);

              return (
                <div key={inv.id} className="bg-bg border border-mint-line rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-card border border-mint-line">
                        #{inv.invoice_number || inv.id}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary-pale text-primary">{st.label}</span>
                      <span className="text-xs font-bold text-ink-soft">{resolveBranchName(inv.branch_id, branches, lang)}</span>
                    </div>
                    <div className="text-xs text-ink-soft font-semibold">
                      {new Date(inv.date).toLocaleDateString(isEn ? "en-US" : "ar-EG")} • {isEn ? "Total" : "الإجمالي"}: ₪{total.toFixed(2)} •{" "}
                      {isEn ? "Paid" : "المدفوع"}: ₪{paid.toFixed(2)} •{" "}
                      <span className={remaining > 0 ? "text-coral font-black" : ""}>
                        {isEn ? "Remaining" : "المتبقي"}: {isDraft ? "—" : `₪${remaining.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted && remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => onPayInvoice(inv)}
                        className="px-3 py-1.5 rounded-xl bg-teal text-white text-xs font-black hover:opacity-90"
                      >
                        {isEn ? "Pay" : "سداد"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onPreviewInvoice(inv)}
                      className="px-3 py-1.5 rounded-xl bg-card border border-mint-line text-xs font-bold text-ink hover:border-primary"
                    >
                      {isEn ? "Details" : "تفاصيل"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
