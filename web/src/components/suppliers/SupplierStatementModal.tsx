"use client";

import React, { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { projectSupplierStatement } from "@/lib/purchases/domain";
import { getPendingPurchaseCommands } from "@/lib/purchases/transport";
import { jsonFetcher, swrPurchaseKeys } from "@/lib/purchases/api";

interface Props {
  supplier: any | null;
  pharmacyId: string;
  purchases: any[];
  branches: any[];
  lang: "ar" | "en";
  onClose: () => void;
  onRecordPayment: (supplier: any) => void;
  onOpenInvoice?: (invoiceId: string) => void;
}

export default function SupplierStatementModal({
  supplier,
  pharmacyId,
  purchases,
  branches,
  lang,
  onClose,
  onRecordPayment,
  onOpenInvoice,
}: Props) {
  const isEn = lang === "en";
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const keys = swrPurchaseKeys(pharmacyId);
  const stmtUrl = supplier && keys ? `${keys.statement(supplier.id)}?lang=${lang}` : null;

  const { data: serverStatement, isLoading } = useSWR(stmtUrl, jsonFetcher, {
    revalidateOnFocus: true,
    keepPreviousData: true,
  });

  const projected = useMemo(() => {
    if (!supplier) return null;
    const pending = getPendingPurchaseCommands(pharmacyId);
    return projectSupplierStatement({
      baseStatement: serverStatement || null,
      supplierId: supplier.id,
      supplier,
      purchases,
      pendingCommands: pending,
      branches,
      lang,
    });
  }, [supplier, serverStatement, pharmacyId, purchases, branches, lang]);

  if (!supplier || !projected) return null;

  const { kpis, transactions } = projected;
  const currentBal = Number(kpis?.currentBalance ?? supplier.balance ?? 0);

  const handleExportPdf = async () => {
    if (!printRef.current || exporting) return;
    setExporting(true);
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .from(printRef.current)
        .set({
          margin: 8,
          filename: `statement-${supplier.name || supplier.id}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
        })
        .save();
    } catch {
      toast.error(isEn ? "Failed to export PDF" : "تعذر تصدير كشف الحساب PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-6xl max-h-[93vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-mint-line flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-ink">
              {isEn ? "Supplier Account Statement:" : "كشف حساب وسجل حركات المورد:"} {supplier.name}
            </h3>
            {supplier.company && <p className="text-xs font-bold text-ink-soft">{supplier.company}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-bg border border-mint-line text-xs font-black text-ink hover:border-primary"
            >
              {exporting ? "..." : isEn ? "Export PDF" : "تصدير PDF"}
            </button>
            <button
              type="button"
              onClick={() => onRecordPayment(supplier)}
              className="px-4 py-2 rounded-xl bg-teal text-white text-xs font-black hover:opacity-90 shadow-sm"
            >
              {isEn ? "+ New Payment" : "+ سداد دفعة جديدة"}
            </button>
            <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Printable / Scrollable Statement Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5" ref={printRef} dir={isEn ? "ltr" : "rtl"}>
          {/* KPI Strip from Authoritative Server / Projected State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-teal/10 border border-teal/25">
              <div className="text-xs font-bold text-teal">{isEn ? "Total Paid" : "إجمالي المسدد والمصروف"}</div>
              <div className="text-2xl font-black font-mono text-teal mt-1">
                ₪{Number(kpis?.totalPaid || 0).toFixed(2)}
              </div>
            </div>
            <div className={`rounded-2xl p-4 border ${currentBal > 0 ? "bg-coral-pale border-coral/25" : "bg-primary-pale border-primary/25"}`}>
              <div className="text-xs font-bold text-ink-soft">
                {currentBal > 0
                  ? isEn
                    ? "Outstanding Debt Payable"
                    : "إجمالي الدين المستحق للمورد"
                  : currentBal < 0
                  ? isEn
                    ? "Our Credit Balance (Surplus)"
                    : "رصيد دائن لنا (فائض)"
                  : isEn
                  ? "Current Balance (Settled)"
                  : "الرصيد الحالي (خالِص)"}
              </div>
              <div className={`text-2xl font-black font-mono mt-1 ${currentBal > 0 ? "text-coral" : "text-primary"}`}>
                ₪{Math.abs(currentBal).toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-bg border border-mint-line">
              <div className="text-xs font-bold text-ink-soft">{isEn ? "Recorded Entries" : "عدد الحركات والفواتير"}</div>
              <div className="text-2xl font-black font-mono text-ink mt-1">
                {transactions.length} {isEn ? "entries" : "حركة"}
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading && transactions.length === 0 ? (
            <div className="text-center py-12 font-bold text-ink-soft">{isEn ? "Loading statement..." : "جارٍ تحميل كشف الحساب..."}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 font-bold text-ink-soft">
              {isEn ? "No transactions recorded for this supplier" : "لا توجد حركات مالية مسجلة لهذا المورد"}
            </div>
          ) : (
            <div className="overflow-x-auto border border-mint-line rounded-2xl">
              <table className="w-full text-start border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-bg border-b border-mint-line text-xs font-black text-ink-soft">
                    <th className="py-3 px-3 text-start">{isEn ? "Date" : "التاريخ"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Type" : "نوع الحركة"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Doc / Voucher #" : "رقم الفاتورة / السند"}</th>
                    <th className="py-3 px-3 text-end">{isEn ? "Total / Amount" : "الإجمالي"}</th>
                    <th className="py-3 px-3 text-end">{isEn ? "Paid" : "المسدد"}</th>
                    <th className="py-3 px-3 text-end">{isEn ? "Remaining" : "المتبقي"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Branch / Method" : "الفرع / طريقة الدفع"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Details & Notes" : "تفاصيل وملاحظات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line text-xs sm:text-sm">
                  {transactions.map((tx: any) => {
                    const isPay = tx.type === "payment";
                    const isRev = tx.type === "reversal";
                    const isCredit = tx.type === "credit_settlement";
                    const badgeLabel = isPay
                      ? isEn
                        ? "Payment Voucher"
                        : "سند صرف وسداد"
                      : isRev
                      ? isEn
                        ? "Canceled / Reversed"
                        : "إلغاء / استرجاع"
                      : isCredit
                      ? isEn
                        ? "Invoice + Credit Offset"
                        : "خصم من الرصيد"
                      : isEn
                      ? "Purchase Invoice"
                      : "فاتورة شراء";
                    const badgeClass = isPay
                      ? "bg-teal/10 text-teal"
                      : isRev
                      ? "bg-coral-pale text-coral"
                      : isCredit
                      ? "bg-primary-pale text-primary"
                      : "bg-amber-pale text-amber";

                    const totalCost = Number(tx.totalCost ?? tx.amount ?? 0);
                    const paidAmount = Number(tx.paidAmount ?? (isPay ? tx.amount : 0));
                    const remainingAmount = isRev || isPay ? 0 : Math.max(0, Number(tx.remainingAmount ?? 0));

                    return (
                      <tr key={tx.id} className={`hover:bg-bg/70 ${tx.isPending ? "bg-amber-pale/20" : ""}`}>
                        <td className="py-3 px-3 font-mono text-xs text-ink-soft whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString(isEn ? "en-US" : "ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${badgeClass}`}>
                            {badgeLabel}
                            {tx.isPending ? (isEn ? " (Pending Sync)" : " (بانتظار المزامنة)") : ""}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-ink whitespace-nowrap">
                          {onOpenInvoice && !isPay && !isRev && tx.reference_id ? (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(tx.reference_id)}
                              className="px-2.5 py-1 rounded-lg bg-primary-pale text-primary hover:bg-primary hover:text-white transition-all"
                            >
                              {tx.voucherNo}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-bg border border-mint-line">{tx.voucherNo}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-black text-ink">₪{totalCost.toFixed(2)}</td>
                        <td className="py-3 px-3 text-end font-mono font-black text-teal">₪{paidAmount.toFixed(2)}</td>
                        <td className={`py-3 px-3 text-end font-mono font-black ${remainingAmount > 0 ? "text-coral" : "text-ink-soft"}`}>
                          ₪{remainingAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-ink text-xs">{tx.branchName}</div>
                          <div className="text-[11px] font-bold text-primary">{tx.paymentMethodLabel || "—"}</div>
                          {tx.referenceNumber && <div className="text-[10px] font-mono text-ink-soft">#{tx.referenceNumber}</div>}
                        </td>
                        <td className="py-3 px-3 text-xs text-ink-soft max-w-xs">
                          <div>{tx.notes}</div>
                          {tx.created_by && <div className="text-[10px] font-bold mt-0.5">{isEn ? "By:" : "بواسطة:"} {tx.created_by}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
