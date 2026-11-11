"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ConfirmModal";
import { deleteCustomer, useCustomerStatement } from "@/lib/customers/api";
import {
  formatPaymentMethod,
  formatTransactionType,
  resolveBranchName,
  round2,
  type BranchRecord,
  type CustomerRecord,
  type CustomerTransactionRecord,
} from "@/lib/customers/domain";
import { printCustomerStatement, printCustomerVoucher } from "@/lib/customers/print";
import { translateErrorMessage } from "@/lib/errorTranslations";

interface CustomerStatementModalProps {
  customerId: string | null;
  pharmacyId: string;
  pharmacyName?: string;
  branches: BranchRecord[];
  canManageCustomer: boolean;
  lang: "ar" | "en";
  inline?: boolean;
  onClose?: () => void;
  onOpenVoucher: (mode: "payment" | "debit", customer: CustomerRecord) => void;
  onEditCustomer: (customer: CustomerRecord) => void;
  onDeleted?: () => void;
}

type StatementTab = "ledger" | "invoices" | "payments";
type InvoiceFilter = "all" | "credit" | "paid";

function getCustomerInitials(rawName?: string) {
  const parts = String(rawName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export default function CustomerStatementModal({
  customerId,
  pharmacyId,
  pharmacyName = "Roshetta Pharmacy",
  branches,
  canManageCustomer,
  lang,
  inline = false,
  onClose,
  onOpenVoucher,
  onEditCustomer,
  onDeleted,
}: CustomerStatementModalProps) {
  const isEn = lang === "en";
  const [tab, setTab] = useState<StatementTab>("ledger");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("all");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { statement, isLoading, error, mutate } = useCustomerStatement(pharmacyId, customerId, lang);

  const customer = statement?.customer;
  const errorText = error ? translateErrorMessage(error?.code || error?.message || "", lang) : "";
  const kpis = statement?.kpis || {
    currentBalance: round2(customer?.debt || 0),
    isStoreCredit: round2(customer?.debt || 0) < -0.005,
    totalCreditSales: 0,
    totalCashSales: 0,
    totalPayments: 0,
    cashSalesCount: 0,
    creditSalesCount: 0,
    paymentsCount: 0,
    transactionsCount: 0,
  };
  const transactions = statement?.transactions || [];
  const creditSales = statement?.creditSales || [];
  const paidSales = statement?.paidSales || [];
  const payments = statement?.payments || [];

  const allInvoices = useMemo(() => {
    const merged = new Map<string, any>();
    for (const s of creditSales) {
      merged.set(String(s.id), { ...s, _invoiceKind: "credit" as const });
    }
    for (const s of paidSales) {
      const key = String(s.id);
      if (!merged.has(key)) {
        merged.set(key, { ...s, _invoiceKind: "paid" as const });
      }
    }
    return Array.from(merged.values()).sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || ""))
    );
  }, [creditSales, paidSales]);

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === "credit") return allInvoices.filter((s) => s._invoiceKind === "credit");
    if (invoiceFilter === "paid") return allInvoices.filter((s) => s._invoiceKind === "paid");
    return allInvoices;
  }, [allInvoices, invoiceFilter]);

  if (!customerId) return null;

  const curBal = round2(kpis.currentBalance);
  const isCreditAdvance = curBal < -0.005;
  const isDebtDue = curBal > 0.005;

  const branchLabel = customer
    ? customer.branch_id
      ? resolveBranchName(customer.branch_id, branches, lang)
      : isEn
        ? "All Branches"
        : "عام لجميع الفروع"
    : "";

  const handleWhatsApp = () => {
    if (!customer?.phone) {
      toast.error(isEn ? "No phone number registered" : "لا يوجد رقم جوال مسجل لهذا العميل");
      return;
    }
    const cleanPhone = customer.phone.replace(/[^\d]/g, "");
    const intlPhone = cleanPhone.startsWith("0") ? `970${cleanPhone.slice(1)}` : cleanPhone;
    const msg = isDebtDue
      ? isEn
        ? `Hello ${customer.name}, friendly reminder from ${pharmacyName}: your remaining balance is ${curBal.toFixed(2)} NIS.`
        : `مرحباً ${customer.name}، تذكير لطيف من ${pharmacyName}: الرصيد المتبقي في حسابكم هو ${curBal.toFixed(2)} ₪. نشكركم لتعاونكم.`
      : isEn
        ? `Hello ${customer.name}, thank you for visiting ${pharmacyName}.`
        : `مرحباً ${customer.name}، نسعد دائماً بخدمتكم في ${pharmacyName}.`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const handleDelete = () => {
    if (!customer) return;
    setDeleteError("");
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!customer || deleting) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteCustomer(pharmacyId, customer.id, lang);
      toast.success(isEn ? "Customer deleted" : "تم حذف العميل بنجاح");
      setDeleteConfirmOpen(false);
      onDeleted?.();
      onClose?.();
    } catch (err: any) {
      const msg = err?.message || (isEn ? "Cannot delete customer" : "تعذر حذف العميل");
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const renderVoucherBtn = (tx: CustomerTransactionRecord) => {
    if (!customer) return null;
    return (
      <button
        type="button"
        onClick={() =>
          printCustomerVoucher({
            pharmacyName,
            customer,
            voucher: {
              voucherNumber: tx.voucher_number,
              referenceId: tx.reference_id,
              type: tx.type,
              amount: tx.amount,
              balanceBefore: tx.balance_before,
              balanceAfter: tx.balance_after,
              paymentMethod: tx.payment_method,
              electronicRef: tx.electronic_ref,
              branchName: tx.branch_name,
              cashierName: tx.cashier_name,
              notes: tx.notes,
              date: tx.date,
            },
            lang,
          })
        }
        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-primary-pale text-primary hover:bg-primary hover:text-white transition-all"
      >
        🖨️ {isEn ? "Voucher" : "طباعة"}
      </button>
    );
  };

  const bodyContent = (
    <div className="space-y-4">
      {/* Compact Hero Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-mint-line shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Customer Identity */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-black text-[16px] ${
                isDebtDue
                  ? "bg-coral-pale text-coral border border-coral/25"
                  : isCreditAdvance
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-primary-pale text-primary border border-mint-line"
              }`}
            >
              {customer ? getCustomerInitials(customer.name) : "…"}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-black text-ink truncate">
                  {customer?.name ||
                    (isLoading
                      ? isEn
                        ? "Loading customer..."
                        : "جاري تحميل بيانات العميل..."
                      : isEn
                        ? "Unable to load customer"
                        : "تعذر تحميل ملف العميل")}
                </h2>
                {branchLabel && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-bg text-ink-soft border border-mint-line">
                    🏪 {branchLabel}
                  </span>
                )}
              </div>

              {isLoading && !customer ? (
                <div className="h-3.5 w-44 rounded bg-bg animate-pulse mt-1" />
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft font-medium">
                  {customer?.phone && (
                    <span dir="ltr" className="font-mono">
                      📞 {customer.phone}
                    </span>
                  )}
                  {customer?.address && <span>📍 {customer.address}</span>}
                  {customer?.lastVisit && (
                    <span>
                      🕒 {isEn ? "Last Visit:" : "آخر زيارة:"} {customer.lastVisit}
                    </span>
                  )}
                </div>
              )}

              {customer?.notes && (
                <p className="text-[12px] font-semibold text-primary bg-primary-pale/55 px-2.5 py-1 rounded-lg inline-block mt-1">
                  📝 {customer.notes}
                </p>
              )}
            </div>
          </div>

          {/* Net Balance Highlight + Modal Close */}
          <div className="flex items-start justify-between md:justify-end gap-2.5 shrink-0 w-full md:w-auto">
            <div
              className={`flex-1 md:flex-none rounded-2xl px-4 py-2.5 border min-w-[168px] ${
                isCreditAdvance
                  ? "bg-emerald-50 border-emerald-200"
                  : isDebtDue
                    ? "bg-coral-pale/55 border-coral/25"
                    : "bg-bg/80 border-mint-line"
              }`}
            >
              <div
                className={`text-[11px] font-bold ${
                  isCreditAdvance ? "text-emerald-700" : isDebtDue ? "text-coral" : "text-ink-soft"
                }`}
              >
                {isCreditAdvance
                  ? isEn
                    ? "Customer Store Credit"
                    : "رصيد دائن للعميل"
                  : isDebtDue
                    ? isEn
                      ? "Current Balance Due"
                      : "المتبقي عليه (ذمة)"
                    : isEn
                      ? "Settled Account"
                      : "الحساب خالص"}
              </div>
              <div
                dir="ltr"
                className={`text-[22px] font-mono font-black leading-tight mt-0.5 text-start ${
                  isCreditAdvance ? "text-emerald-700" : isDebtDue ? "text-coral" : "text-primary"
                }`}
              >
                {Math.abs(curBal).toFixed(2)} ₪
              </div>
            </div>

            {!inline && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={isEn ? "Close" : "إغلاق"}
                className="w-9 h-9 rounded-xl bg-bg text-ink-soft border border-mint-line flex items-center justify-center font-bold hover:bg-slate-200 hover:text-ink transition-colors shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Hero Action Bar */}
        {customer && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 mt-4 border-t border-mint-line/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenVoucher("payment", customer)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 shadow-xs transition-colors"
              >
                💰 {isEn ? "Payment Receipt" : "سند قبض / إيداع"}
              </button>
              <button
                type="button"
                onClick={() => onOpenVoucher("debit", customer)}
                className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[12px] font-bold hover:bg-amber-100 transition-colors"
              >
                ➕ {isEn ? "Manual Debt" : "قيد دين يدوي"}
              </button>
              <button
                type="button"
                onClick={() =>
                  printCustomerStatement({
                    pharmacyName,
                    customer,
                    transactions,
                    kpis,
                    lang,
                  })
                }
                className="px-3 py-2 rounded-xl bg-primary-pale text-primary text-[12px] font-bold hover:bg-primary hover:text-white transition-colors"
              >
                🖨️ {isEn ? "Print Statement" : "طباعة الكشف"}
              </button>
              {customer.phone && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[12px] font-bold hover:bg-emerald-100 transition-colors"
                >
                  💬 {isEn ? "WhatsApp" : "واتساب"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => mutate()}
                className="px-2.5 py-2 rounded-xl bg-bg/80 text-ink-soft border border-mint-line text-[12px] font-bold hover:text-primary hover:bg-white transition-colors"
                title={isEn ? "Refresh statement" : "تحديث الكشف"}
              >
                🔄 {isEn ? "Refresh" : "تحديث"}
              </button>
              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="px-3 py-2 rounded-xl bg-bg/80 text-ink border border-mint-line text-[12px] font-bold hover:bg-white transition-colors"
              >
                ✏️ {isEn ? "Edit" : "تعديل"}
              </button>
              {canManageCustomer && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-coral-pale text-coral text-[12px] font-bold hover:bg-coral hover:text-white transition-colors disabled:opacity-50"
                >
                  🗑️ {isEn ? "Delete" : "حذف"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {statement?.fallbackLegacy && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-amber-800">
          ⚠️{" "}
          {isEn
            ? "Compatibility mode active: the live backend is still on the previous release. Update the backend server to unlock full sequential voucher logs & manual debit entries."
            : "تم عرض كشف الحساب بوضع التوافق مع نسخة الخادم السابقة — يرجى رفع حزمة تحديث الخادم وتفعيله لإظهار أرقام السندات التسلسلية والقيود اليدوية بالكامل."}
        </div>
      )}

      {/* Focused 3-Card Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Credit Purchases & Debits" : "مشتريات الآجل والقيود"}
          </div>
          <div dir="ltr" className="text-[20px] font-mono font-black text-ink mt-1 text-start">
            {round2(kpis.totalCreditSales).toFixed(2)} ₪
          </div>
          <div className="text-[11px] font-medium text-ink-soft mt-0.5">
            {creditSales.length} {isEn ? "credit / split invoices" : "فاتورة آجل ومختلط"}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Total Payments & Credits" : "إجمالي التسديد والمرتجع الدائن"}
          </div>
          <div dir="ltr" className="text-[20px] font-mono font-black text-emerald-700 mt-1 text-start">
            +{round2(kpis.totalPayments).toFixed(2)} ₪
          </div>
          <div className="text-[11px] font-medium text-ink-soft mt-0.5">
            {payments.length} {isEn ? "receipts & settlements" : "سند قبض وتسوية"}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Direct Cash & Card Purchases" : "المشتريات النقدية المباشرة"}
          </div>
          <div dir="ltr" className="text-[20px] font-mono font-black text-primary mt-1 text-start">
            {round2(kpis.totalCashSales).toFixed(2)} ₪
          </div>
          <div className="text-[11px] font-medium text-ink-soft mt-0.5">
            {paidSales.length} {isEn ? "paid invoices" : "فاتورة مدفوعة"}
          </div>
        </div>
      </div>

      {/* Unified 3-Tab Ledger Switcher */}
      <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-2xl border border-mint-line shadow-xs">
        {[
          { id: "ledger" as const, labelAr: `الدفتر الموحّد (${transactions.length})`, labelEn: `Unified Ledger (${transactions.length})` },
          { id: "invoices" as const, labelAr: `الفواتير (${allInvoices.length})`, labelEn: `Invoices (${allInvoices.length})` },
          { id: "payments" as const, labelAr: `سندات القبض (${payments.length})`, labelEn: `Receipts (${payments.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-[13px] font-bold transition-colors ${
              tab === item.id ? "bg-primary text-white shadow-xs" : "text-ink-soft hover:bg-bg/70 hover:text-ink"
            }`}
          >
            {isEn ? item.labelEn : item.labelAr}
          </button>
        ))}
      </div>

      {/* Tab Content Panel */}
      <div className="bg-white rounded-2xl border border-mint-line shadow-xs overflow-hidden min-h-[240px]">
        {isLoading && !statement ? (
          <div className="py-12 text-center text-ink-soft font-bold">
            {isEn ? "Loading customer statement..." : "جاري تحميل كشف الحساب..."}
          </div>
        ) : error && !statement ? (
          <div className="py-10 px-4 text-center space-y-3">
            <div className="text-coral font-black text-[15px]">
              ⚠️ {isEn ? "Could not load customer statement" : "تعذر تحميل كشف حساب العميل"}
            </div>
            {errorText && <p className="text-[13px] text-ink-soft font-semibold">{errorText}</p>}
            <button
              type="button"
              onClick={() => mutate()}
              className="px-4 py-2 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90"
            >
              🔄 {isEn ? "Retry" : "إعادة المحاولة"}
            </button>
          </div>
        ) : tab === "ledger" ? (
          transactions.length === 0 ? (
            <div className="py-12 text-center text-ink-soft font-bold">
              {isEn ? "No ledger entries recorded yet." : "لا توجد حركات مسجلة في دفتر العميل حتى الآن."}
            </div>
          ) : (
            <div className="divide-y divide-mint-line/80">
              {transactions.map((tx) => {
                const info = formatTransactionType(tx.type, lang);
                const pm = tx.payment_method ? formatPaymentMethod(tx.payment_method, lang) : null;
                const isDebit = info.direction === "debit";
                const rowKey = String(tx.id);
                const isExpanded = expandedTxId === rowKey;
                const balAfter = round2(tx.balance_after);
                const balBefore = round2(tx.balance_before);
                const canPrintVoucher =
                  tx.type === "payment" ||
                  tx.type === "manual_debit" ||
                  tx.type === "credit_refund" ||
                  tx.type === "opening_balance";

                return (
                  <div key={rowKey} className="transition-colors hover:bg-bg/40">
                    <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => setExpandedTxId(isExpanded ? null : rowKey)}
                        className="flex-1 min-w-0 text-start flex items-start gap-3 group"
                      >
                        <span
                          className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 border transition-colors ${
                            isExpanded
                              ? "bg-primary text-white border-primary"
                              : "bg-bg text-ink-soft border-mint-line group-hover:border-primary/40"
                          }`}
                        >
                          {isExpanded ? "▾" : "◂"}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isDebit ? "bg-coral-pale text-coral" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {info.label}
                            </span>
                            <span className="font-mono font-bold text-[12px] text-primary">
                              {tx.voucher_number ? `#${tx.voucher_number}` : tx.reference_id || "-"}
                            </span>
                            {pm && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-bg text-ink-soft border border-mint-line/80">
                                {pm.emoji} {pm.label}
                              </span>
                            )}
                          </div>

                          <div className="text-[13px] font-semibold text-ink mt-1 truncate">
                            {tx.notes || info.label}
                          </div>

                          <div className="text-[11px] text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-2">
                            <span>{tx.date ? new Date(tx.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""}</span>
                            {tx.branch_name && <span>• {tx.branch_name}</span>}
                            {tx.cashier_name && <span>• {tx.cashier_name}</span>}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ps-9 sm:ps-0">
                        <div className="text-end">
                          <div dir="ltr" className={`font-mono font-black text-[15px] ${isDebit ? "text-coral" : "text-emerald-700"}`}>
                            {isDebit ? "+" : "-"}
                            {round2(tx.amount).toFixed(2)} ₪
                          </div>
                          <div dir="ltr" className="font-mono text-[11px] text-ink-soft mt-0.5">
                            {balBefore.toFixed(2)} →{" "}
                            <span
                              className={`font-bold ${
                                balAfter < -0.005 ? "text-emerald-700" : balAfter > 0.005 ? "text-coral" : "text-primary"
                              }`}
                            >
                              {balAfter.toFixed(2)} ₪
                            </span>
                          </div>
                        </div>

                        {canPrintVoucher && renderVoucherBtn(tx)}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 ms-9 border-t border-mint-line/60 bg-bg/30 rounded-b-xl text-[12px] text-ink-soft space-y-1.5">
                        {tx.notes && (
                          <div>
                            <strong className="text-ink">{isEn ? "Details:" : "البيان:"}</strong> {tx.notes}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span>
                            <strong className="text-ink">{isEn ? "Method:" : "الوسيلة:"}</strong>{" "}
                            {pm ? `${pm.emoji} ${pm.label}` : "-"}
                          </span>
                          {tx.electronic_ref && (
                            <span dir="ltr" className="font-mono text-primary">
                              Ref: {tx.electronic_ref}
                            </span>
                          )}
                          <span>
                            <strong className="text-ink">{isEn ? "Before:" : "الرصيد قبل:"}</strong>{" "}
                            <span dir="ltr" className="font-mono">{balBefore.toFixed(2)} ₪</span>
                          </span>
                          <span>
                            <strong className="text-ink">{isEn ? "After:" : "الرصيد بعد:"}</strong>{" "}
                            <span dir="ltr" className="font-mono font-bold text-ink">{balAfter.toFixed(2)} ₪</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "invoices" ? (
          <div className="p-4 space-y-3">
            {/* Sub-filter chips preserving full Credit vs Paid visibility */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-mint-line/80">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all" as const, ar: `الكل (${allInvoices.length})`, en: `All (${allInvoices.length})` },
                  { id: "credit" as const, ar: `آجل ومختلط (${creditSales.length})`, en: `Credit & Split (${creditSales.length})` },
                  { id: "paid" as const, ar: `مدفوعة (${paidSales.length})`, en: `Paid (${paidSales.length})` },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setInvoiceFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                      invoiceFilter === chip.id
                        ? "bg-primary text-white border-primary"
                        : "bg-bg/70 text-ink-soft border-mint-line hover:text-ink"
                    }`}
                  >
                    {isEn ? chip.en : chip.ar}
                  </button>
                ))}
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="py-10 text-center text-ink-soft font-bold">
                {invoiceFilter === "credit"
                  ? isEn
                    ? "No credit invoices found."
                    : "لا توجد فواتير ذمم أو دفع مختلط."
                  : invoiceFilter === "paid"
                    ? isEn
                      ? "No paid sales found."
                      : "لا توجد فواتير مدفوعة مباشرة."
                    : isEn
                      ? "No invoices recorded for this customer."
                      : "لا توجد فواتير مسجلة لهذا العميل."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredInvoices.map((sale) => {
                  const pm = formatPaymentMethod(sale.paymentMethod, lang);
                  const splitEntries = sale.payments ? Object.entries(sale.payments).filter(([, v]) => Number(v) > 0) : [];
                  const isCreditInv = sale._invoiceKind === "credit";
                  return (
                    <div key={sale.id} className="rounded-xl border border-mint-line p-3.5 bg-bg/35">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-black text-[14px] text-primary">#{sale.id}</span>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isCreditInv ? "bg-coral-pale text-coral" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {pm.emoji} {pm.label}
                          </span>
                          {sale.status === "refunded" && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-coral-pale text-coral">
                              {isEn ? "Refunded" : "مسترجعة"}
                            </span>
                          )}
                          {sale.status === "partially_refunded" && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              {isEn ? "Partially Refunded" : "مرتجع جزئي"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-ink-soft">
                            {sale.date ? new Date(sale.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""}
                          </span>
                          <span dir="ltr" className="font-mono font-black text-[15px] text-ink">
                            {round2(sale.total).toFixed(2)} ₪
                          </span>
                        </div>
                      </div>

                      {splitEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[11px] mb-2">
                          {splitEntries.map(([k, v]) => {
                            const sub = formatPaymentMethod(k, lang);
                            return (
                              <span key={k} className="px-2 py-0.5 rounded-md bg-white border border-mint-line font-semibold">
                                {sub.label}: {round2(v).toFixed(2)} ₪
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {Array.isArray(sale.items) && sale.items.length > 0 && (
                        <div className="text-[12px] text-ink-soft pt-2 border-t border-mint-line/60 flex flex-wrap gap-1.5">
                          {sale.items.map((it: any, idx: number) => (
                            <span key={`${it.id || idx}`} className="bg-white px-2.5 py-0.5 rounded-lg border border-mint-line/70">
                              {it.name} × {it.cartQty ?? it.qty ?? 1}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-ink-soft font-bold">
            {isEn ? "No payment vouchers or credit return adjustments yet." : "لا توجد سندات قبض أو تسويات مرتجع دائن حتى الآن."}
          </div>
        ) : (
          <div className="divide-y divide-mint-line/80">
            {payments.map((p: any) => {
              const isCreditAdj = String(p.id || "").startsWith("RET-CR-") || p.paymentMethod === "credit_adjustment";
              const pm = formatPaymentMethod(p.paymentMethod || "cash", lang);
              const matchingTx = transactions.find((t) => String(t.reference_id) === String(p.id));
              return (
                <div key={p.id} className="px-4 py-3.5 hover:bg-emerald-50/35 transition-colors flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-[14px] text-primary">
                        {matchingTx?.voucher_number ? `#${matchingTx.voucher_number}` : p.id}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                        {isCreditAdj
                          ? isEn
                            ? "Return to Credit Balance"
                            : "تسوية مرتجع للرصيد الدائن"
                          : `${pm.emoji} ${pm.label}`}
                      </span>
                      {p.electronicRef && (
                        <span className="text-[11px] font-mono text-primary" dir="ltr">
                          Ref: {p.electronicRef}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-soft mt-1">
                      {p.date ? new Date(p.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""}
                      {p.branchName ? ` • ${p.branchName}` : ""}
                      {p.cashierName ? ` • ${p.cashierName}` : ""}
                    </div>
                    {matchingTx && (
                      <div dir="ltr" className="text-[11px] font-mono text-ink-soft mt-0.5">
                        {round2(matchingTx.balance_before).toFixed(2)} →{" "}
                        <span className="font-bold text-ink">{round2(matchingTx.balance_after).toFixed(2)} ₪</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span dir="ltr" className="font-mono font-black text-[17px] text-emerald-700">
                      +{round2(p.amount ?? p.total).toFixed(2)} ₪
                    </span>
                    {customer && (
                      <button
                        type="button"
                        onClick={() =>
                          printCustomerVoucher({
                            pharmacyName,
                            customer,
                            voucher: {
                              voucherNumber: matchingTx?.voucher_number,
                              referenceId: p.id,
                              type: isCreditAdj ? "credit_refund" : "payment",
                              amount: Number(p.amount ?? p.total ?? 0),
                              balanceBefore: matchingTx?.balance_before,
                              balanceAfter: matchingTx?.balance_after,
                              paymentMethod: p.paymentMethod,
                              electronicRef: p.electronicRef,
                              branchName: p.branchName,
                              cashierName: p.cashierName,
                              date: p.date,
                            },
                            lang,
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-[12px] font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                      >
                        🖨️ {isEn ? "Receipt" : "سند"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const confirmModalEl = customer ? (
    <ConfirmModal
      isOpen={deleteConfirmOpen}
      title={isEn ? "Confirm Deletion" : "تأكيد الحذف"}
      message={
        <>
          <span>
            {isEn ? "Are you sure you want to permanently delete customer " : "هل أنت متأكد من حذف العميل "}
            <span className="font-black text-primary">{customer.name}</span>
            {isEn ? "? This action cannot be undone." : " نهائياً؟ هذا الإجراء لا يمكن التراجع عنه."}
          </span>
          {(Math.abs(curBal) > 0.005 || transactions.length > 0) && (
            <span className="block mt-3 text-[12px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {Math.abs(curBal) > 0.005
                ? isEn
                  ? `Note: Customer has an unsettled balance (${Math.abs(curBal).toFixed(2)} ₪); settle it before deletion.`
                  : `ملاحظة: يوجد رصيد غير مُصفّى على هذا الحساب (${Math.abs(curBal).toFixed(2)} ₪)؛ يجب تسويته أولاً قبل الحذف.`
                : isEn
                  ? "Note: System protects customers with recorded invoices or financial transactions."
                  : "ملاحظة: يمنع النظام الحذف تلقائياً لوجود فواتير أو حركات مالية مرتبطة بهذا الحساب."}
            </span>
          )}
        </>
      }
      onConfirm={executeDelete}
      onCancel={() => {
        if (deleting) return;
        setDeleteConfirmOpen(false);
        setDeleteError("");
      }}
      confirmText={
        deleting
          ? isEn
            ? "Deleting..."
            : "جارٍ الحذف..."
          : isEn
            ? "Yes, Delete Customer"
            : "نعم، احذف العميل"
      }
      cancelText={isEn ? "Cancel" : "تراجع"}
      isDestructive={true}
      isLoading={deleting}
      errorMessage={deleteError}
    />
  ) : null;

  if (inline) {
    return (
      <>
        {bodyContent}
        {confirmModalEl}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6">
        <div className="bg-bg rounded-[32px] w-full max-w-5xl max-h-[92vh] overflow-y-auto p-4 md:p-6 shadow-2xl border border-mint-line">
          {bodyContent}
        </div>
      </div>
      {confirmModalEl}
    </>
  );
}
