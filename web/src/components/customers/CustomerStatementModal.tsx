"use client";

import { useState } from "react";
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

type StatementTab = "ledger" | "credit" | "paid" | "payments";

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
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { statement, isLoading, error, mutate } = useCustomerStatement(pharmacyId, customerId, lang);

  if (!customerId) return null;

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
    <div className="space-y-5">
      {/* Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-5 border border-mint-line shadow-sm">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[22px] font-black text-ink">
              {customer?.name ||
                (isLoading
                  ? isEn
                    ? "Loading customer..."
                    : "جاري تحميل بيانات العميل..."
                  : error
                    ? isEn
                      ? "Unable to load customer"
                      : "تعذر تحميل ملف العميل"
                    : "...")}
            </h2>
            {branchLabel && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-ink-soft">
                🏪 {branchLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-soft font-medium">
            {customer?.phone && <span dir="ltr">📞 {customer.phone}</span>}
            {customer?.address && <span>📍 {customer.address}</span>}
            {customer?.lastVisit && (
              <span>
                🕒 {isEn ? "Last Visit:" : "آخر زيارة:"} {customer.lastVisit}
              </span>
            )}
          </div>
          {customer?.notes && (
            <p className="text-[12px] font-semibold text-primary bg-primary-pale/50 px-3 py-1.5 rounded-xl inline-block mt-1">
              📝 {customer.notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customer && (
            <>
              <button
                type="button"
                onClick={() => onOpenVoucher("payment", customer)}
                className="px-4 py-2.5 rounded-xl bg-teal text-white text-[13px] font-black hover:bg-teal/90 shadow-sm"
              >
                💰 {isEn ? "Payment / Deposit" : "سند قبض / إيداع"}
              </button>
              <button
                type="button"
                onClick={() => onOpenVoucher("debit", customer)}
                className="px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[13px] font-bold hover:bg-amber-100"
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
                className="px-3.5 py-2.5 rounded-xl bg-primary-pale text-primary text-[13px] font-bold hover:bg-primary hover:text-white transition-all"
              >
                🖨️ {isEn ? "Statement" : "طباعة الكشف"}
              </button>
              {customer.phone && (
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[13px] font-bold hover:bg-emerald-100"
                >
                  💬 {isEn ? "WhatsApp" : "واتساب"}
                </button>
              )}
              <button
                type="button"
                onClick={() => onEditCustomer(customer)}
                className="px-3 py-2.5 rounded-xl bg-bg text-ink border border-mint-line text-[13px] font-bold hover:bg-slate-100"
              >
                ✏️ {isEn ? "Edit" : "تعديل"}
              </button>
              {canManageCustomer && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-3 py-2.5 rounded-xl bg-coral-pale text-coral text-[13px] font-bold hover:bg-coral hover:text-white transition-all disabled:opacity-50"
                >
                  🗑️ {isEn ? "Delete" : "حذف"}
                </button>
              )}
              {!inline && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 text-ink-soft text-[13px] font-bold hover:bg-slate-200"
                >
                  ✕
                </button>
              )}
            </>
          )}
          {!customer && !inline && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl bg-slate-100 text-ink-soft text-[13px] font-bold hover:bg-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {statement?.fallbackLegacy && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-bold text-amber-800">
          ⚠️{" "}
          {isEn
            ? "Compatibility mode active: the live backend is still on the previous release. Update the backend server to unlock full sequential voucher logs & manual debit entries."
            : "تم عرض كشف الحساب بوضع التوافق مع نسخة الخادم السابقة — يرجى رفع حزمة تحديث الخادم وتفعيله لإظهار أرقام السندات التسلسلية والقيود اليدوية بالكامل."}
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          className={`rounded-2xl p-4 border ${
            isCreditAdvance
              ? "bg-emerald-50 border-emerald-200"
              : isDebtDue
                ? "bg-coral-pale/40 border-coral/20"
                : "bg-white border-mint-line"
          }`}
        >
          <div className="text-[12px] font-bold text-ink-soft">
            {isCreditAdvance
              ? isEn
                ? "Customer Store Credit"
                : "رصيد دائن للعميل"
              : isEn
                ? "Current Balance Due"
                : "الرصيد / الدين الحالي"}
          </div>
          <div
            dir="ltr"
            className={`text-[22px] font-mono font-black mt-1 ${
              isCreditAdvance ? "text-emerald-700" : isDebtDue ? "text-coral" : "text-teal"
            }`}
          >
            {Math.abs(curBal).toFixed(2)} ₪
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-mint-line">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Total Credit & Manual Debits" : "إجمالي الفواتير والديون الآجلة"}
          </div>
          <div dir="ltr" className="text-[22px] font-mono font-black text-ink mt-1">
            {round2(kpis.totalCreditSales).toFixed(2)} ₪
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-mint-line">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Collected & Credit Returns" : "إجمالي التسديد والمرتجع الدائن"}
          </div>
          <div dir="ltr" className="text-[22px] font-mono font-black text-emerald-700 mt-1">
            +{round2(kpis.totalPayments).toFixed(2)} ₪
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-mint-line">
          <div className="text-[12px] font-bold text-ink-soft">
            {isEn ? "Direct Paid Purchases" : "مشتريات نقدية / إلكترونية مدفوعة"}
          </div>
          <div dir="ltr" className="text-[22px] font-mono font-black text-primary mt-1">
            {round2(kpis.totalCashSales).toFixed(2)} ₪
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-mint-line">
        {[
          { id: "ledger" as const, labelAr: `دفتر الأستاذ الموحد (${transactions.length})`, labelEn: `Unified Ledger (${transactions.length})` },
          { id: "credit" as const, labelAr: `فواتير الذمم والمختلط (${creditSales.length})`, labelEn: `Credit & Split (${creditSales.length})` },
          { id: "paid" as const, labelAr: `المشتريات المدفوعة (${paidSales.length})`, labelEn: `Paid Sales (${paidSales.length})` },
          { id: "payments" as const, labelAr: `سندات القبض والمرتجع الدائن (${payments.length})`, labelEn: `Receipts & Credits (${payments.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-[13px] font-bold transition-all ${
              tab === item.id ? "bg-primary text-white shadow-sm" : "text-ink-soft hover:bg-bg"
            }`}
          >
            {isEn ? item.labelEn : item.labelAr}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-3xl border border-mint-line p-4 md:p-5 min-h-[260px]">
        {isLoading && !statement ? (
          <div className="py-12 text-center text-ink-soft font-bold">
            {isEn ? "Loading customer statement..." : "جاري تحميل كشف الحساب..."}
          </div>
        ) : error && !statement ? (
          <div className="py-10 text-center space-y-3">
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
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-mint-line text-[12px] font-black text-ink-soft">
                    <th className="py-3 px-3 text-start">{isEn ? "Voucher" : "السند / المرجع"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Type & Notes" : "البيان"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Method" : "الوسيلة"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Debit / Credit" : "الحركة"}</th>
                    <th className="py-3 px-3 text-start">{isEn ? "Balance Before -> After" : "الرصيد قبل ← بعد"}</th>
                    <th className="py-3 px-3 text-center">{isEn ? "Print" : "إجراء"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line/60 text-[13px]">
                  {transactions.map((tx) => {
                    const info = formatTransactionType(tx.type, lang);
                    const pm = tx.payment_method ? formatPaymentMethod(tx.payment_method, lang) : null;
                    const isDebit = info.direction === "debit";
                    return (
                      <tr key={tx.id} className="hover:bg-bg/50">
                        <td className="py-3 px-3 font-mono font-bold text-primary">
                          <div>{tx.voucher_number ? `#${tx.voucher_number}` : tx.reference_id || "-"}</div>
                          <div className="text-[11px] font-sans text-ink-soft font-normal">
                            {tx.date ? new Date(tx.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold mb-1 ${
                              isDebit ? "bg-coral-pale text-coral" : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {info.label}
                          </span>
                          {tx.notes && <div className="text-[12px] text-ink font-medium">{tx.notes}</div>}
                          <div className="text-[11px] text-ink-soft">
                            {tx.branch_name || ""} {tx.cashier_name ? `• ${tx.cashier_name}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {pm ? (
                            <div className="text-[12px] font-bold text-ink">
                              {pm.emoji} {pm.label}
                            </div>
                          ) : (
                            "-"
                          )}
                          {tx.electronic_ref && (
                            <div className="text-[11px] font-mono text-primary" dir="ltr">
                              Ref: {tx.electronic_ref}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-black" dir="ltr">
                          <span className={isDebit ? "text-coral" : "text-emerald-700"}>
                            {isDebit ? "+" : "-"}
                            {round2(tx.amount).toFixed(2)} ₪
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[12px]" dir="ltr">
                          <span className="text-ink-soft">{round2(tx.balance_before).toFixed(2)}</span>
                          {" → "}
                          <span
                            className={`font-black ${
                              round2(tx.balance_after) < -0.005
                                ? "text-emerald-700"
                                : round2(tx.balance_after) > 0.005
                                  ? "text-coral"
                                  : "text-teal"
                            }`}
                          >
                            {round2(tx.balance_after).toFixed(2)} ₪
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {(tx.type === "payment" || tx.type === "manual_debit" || tx.type === "credit_refund" || tx.type === "opening_balance") &&
                            renderVoucherBtn(tx)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : tab === "credit" || tab === "paid" ? (
          (() => {
            const list = tab === "credit" ? creditSales : paidSales;
            if (!list.length) {
              return (
                <div className="py-12 text-center text-ink-soft font-bold">
                  {tab === "credit"
                    ? isEn
                      ? "No credit invoices found."
                      : "لا توجد فواتير ذمم أو دفع مختلط."
                    : isEn
                      ? "No paid sales found."
                      : "لا توجد فواتير مدفوعة مباشرة."}
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {list.map((sale) => {
                  const pm = formatPaymentMethod(sale.paymentMethod, lang);
                  const splitEntries = sale.payments ? Object.entries(sale.payments).filter(([, v]) => Number(v) > 0) : [];
                  return (
                    <div key={sale.id} className="rounded-2xl border border-mint-line p-4 bg-bg/40">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono font-black text-[14px] text-primary">#{sale.id}</span>
                          <span className="text-[12px] text-ink-soft mx-2">
                            {sale.date ? new Date(sale.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""}
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
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold px-2.5 py-1 rounded-lg bg-white border border-mint-line">
                            {pm.emoji} {pm.label}
                          </span>
                          <span dir="ltr" className="font-mono font-black text-[16px] text-ink">
                            {round2(sale.total).toFixed(2)} ₪
                          </span>
                        </div>
                      </div>

                      {splitEntries.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-[12px] mb-2">
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
                        <div className="text-[12px] text-ink-soft pt-2 border-t border-mint-line/60 flex flex-wrap gap-2">
                          {sale.items.map((it: any, idx: number) => (
                            <span key={`${it.id || idx}`} className="bg-white px-2.5 py-1 rounded-lg border border-mint-line/70">
                              {it.name} × {it.cartQty ?? it.qty ?? 1}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-ink-soft font-bold">
            {isEn ? "No payment vouchers or credit return adjustments yet." : "لا توجد سندات قبض أو تسويات مرتجع دائن حتى الآن."}
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p: any) => {
              const isCreditAdj = String(p.id || "").startsWith("RET-CR-") || p.paymentMethod === "credit_adjustment";
              const pm = formatPaymentMethod(p.paymentMethod || "cash", lang);
              const matchingTx = transactions.find((t) => String(t.reference_id) === String(p.id));
              return (
                <div key={p.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-[14px] text-primary">
                        {matchingTx?.voucher_number ? `#${matchingTx.voucher_number}` : p.id}
                      </span>
                      <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800">
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
                      {p.date ? new Date(p.date).toLocaleString(isEn ? "en-US" : "ar-EG") : ""} • {p.branchName || ""} •{" "}
                      {p.cashierName || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span dir="ltr" className="font-mono font-black text-[18px] text-emerald-700">
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
                        className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-[12px] font-bold hover:bg-emerald-600 hover:text-white transition-all"
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

      {/* Refresh notice */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => mutate()}
          className="text-[12px] font-bold text-ink-soft hover:text-primary"
        >
          🔄 {isEn ? "Refresh Statement" : "تحديث كشف الحساب"}
        </button>
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
