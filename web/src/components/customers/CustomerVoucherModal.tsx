"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { addCustomerDebtDebit, payCustomerDebt } from "@/lib/customers/api";
import {
  VOUCHER_PAYMENT_CHANNELS,
  computeCustomerBalanceImpact,
  round2,
  type CustomerRecord,
} from "@/lib/customers/domain";
import { printCustomerVoucher } from "@/lib/customers/print";

interface CustomerVoucherModalProps {
  open: boolean;
  onClose: () => void;
  mode: "payment" | "debit";
  customer: CustomerRecord | null;
  pharmacyId: string;
  pharmacyName?: string;
  branchId?: string | null;
  branchName?: string;
  cashierName?: string;
  lang: "ar" | "en";
  onCompleted: (result: any) => void;
}

export default function CustomerVoucherModal({
  open,
  onClose,
  mode,
  customer,
  pharmacyId,
  pharmacyName = "Roshetta Pharmacy",
  branchId,
  branchName,
  cashierName,
  lang,
  onCompleted,
}: CustomerVoucherModalProps) {
  const isEn = lang === "en";
  const isPayment = mode === "payment";

  const [amountStr, setAmountStr] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [electronicRef, setElectronicRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentDebt = round2(customer?.debt || 0);

  useEffect(() => {
    if (!open || !customer) return;
    if (isPayment) {
      setAmountStr(currentDebt > 0 ? String(currentDebt) : "");
    } else {
      setAmountStr("");
    }
    setPaymentMethod("cash");
    setElectronicRef("");
    setNotes("");
  }, [open, customer?.id, isPayment, currentDebt]);

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amountStr);
    return Number.isFinite(n) && n > 0 ? round2(n) : 0;
  }, [amountStr]);

  const preview = useMemo(() => {
    if (!customer) return null;
    return computeCustomerBalanceImpact({
      currentDebt,
      actionType: isPayment ? "payment" : "manual_debit",
      amount: parsedAmount,
    });
  }, [customer, currentDebt, isPayment, parsedAmount]);

  if (!open || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      toast.error(isEn ? "Please enter a valid positive amount" : "يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (isPayment) {
        res = await payCustomerDebt(
          pharmacyId,
          customer.id,
          {
            payment: parsedAmount,
            paymentMethod,
            electronicRef,
            notes,
            branch_id: branchId ?? customer.branch_id ?? null,
            branchName: branchName || "",
            cashierName: cashierName || "",
          },
          lang
        );
        const afterBal = round2(res.data?.remainingDebt ?? preview?.after ?? 0);
        toast.success(
          afterBal < -0.005
            ? isEn
              ? `Payment saved! Advance credit: ₪${Math.abs(afterBal).toFixed(2)}`
              : `تم تسجيل السند! أصبح للعميل رصيد دائن ${Math.abs(afterBal).toFixed(2)} ₪`
            : isEn
              ? `Payment voucher #${res.data?.voucher_number || ""} recorded!`
              : `تم اعتماد سند القبض #${res.data?.voucher_number || ""} بنجاح!`
        );
      } else {
        res = await addCustomerDebtDebit(
          pharmacyId,
          customer.id,
          {
            amount: parsedAmount,
            notes: notes.trim() || (isEn ? "Manual debt charge" : "تسجيل قيد دين يدوي"),
            branch_id: branchId ?? customer.branch_id ?? null,
            branchName: branchName || "",
            cashierName: cashierName || "",
          },
          lang
        );
        toast.success(
          isEn
            ? `Manual debt entry #${res.data?.voucher_number || ""} recorded`
            : `تم قيد الدين برقم إشعار #${res.data?.voucher_number || ""} بنجاح`
        );
      }

      printCustomerVoucher({
        pharmacyName,
        customer: { ...customer, debt: res.data?.remainingDebt ?? preview?.after ?? currentDebt },
        voucher: {
          voucherNumber: res.data?.voucher_number,
          referenceId: res.data?.paymentId || res.data?.debtEntryId,
          type: isPayment ? "payment" : "manual_debit",
          amount: parsedAmount,
          balanceBefore: currentDebt,
          balanceAfter: res.data?.remainingDebt ?? preview?.after ?? currentDebt,
          paymentMethod: isPayment ? paymentMethod : "credit",
          electronicRef: isPayment ? electronicRef : "",
          branchName: res.data?.branchName || branchName || "",
          cashierName: res.data?.cashierName || cashierName || "",
          notes,
          date: new Date().toISOString(),
        },
        lang,
      });

      onCompleted(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Operation failed" : "تعذر تنفيذ العملية"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg p-6 md:p-7 shadow-2xl border border-mint-line max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-[20px] font-black ${isPayment ? "text-teal" : "text-coral"}`}>
              {isPayment
                ? isEn
                  ? "Customer Payment / Advance Deposit"
                  : "سند قبض (تسديد دين / إيداع رصيد)"
                : isEn
                  ? "Manual Debt Entry"
                  : "قيد دين يدوي على العميل"}
            </h2>
            <p className="text-[13px] font-bold text-ink-soft mt-0.5">
              {customer.name} {customer.phone ? `• ${customer.phone}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Balance Preview Card */}
        <div
          className={`rounded-2xl p-4 mb-4 border ${
            currentDebt < -0.005
              ? "bg-emerald-50 border-emerald-200"
              : currentDebt > 0.005
                ? "bg-coral-pale/50 border-coral/20"
                : "bg-slate-50 border-mint-line"
          }`}
        >
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-bold text-ink-soft">
              {isEn ? "Current Balance:" : "الرصيد الحالي:"}
            </span>
            <span
              dir="ltr"
              className={`font-mono font-black text-[18px] ${
                currentDebt < -0.005 ? "text-emerald-700" : currentDebt > 0.005 ? "text-coral" : "text-ink"
              }`}
            >
              {currentDebt < -0.005
                ? `${Math.abs(currentDebt).toFixed(2)} ₪ (${isEn ? "Credit" : "رصيد دائن"})`
                : `${currentDebt.toFixed(2)} ₪`}
            </span>
          </div>

          {preview && parsedAmount > 0 && (
            <div className="flex items-center justify-between text-[13px] mt-2 pt-2 border-t border-black/10">
              <span className="font-bold text-ink-soft">
                {isEn ? "Balance After:" : "الرصيد المتوقع بعد السند:"}
              </span>
              <span
                dir="ltr"
                className={`font-mono font-black text-[16px] ${
                  preview.after < -0.005
                    ? "text-emerald-700"
                    : preview.after > 0.005
                      ? "text-coral"
                      : "text-teal"
                }`}
              >
                {preview.after < -0.005
                  ? `${Math.abs(preview.after).toFixed(2)} ₪ (${isEn ? "Store Credit" : "رصيد دائن له"})`
                  : `${preview.after.toFixed(2)} ₪`}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[13px] font-bold text-ink-soft">
                {isEn ? "Amount (₪) *" : "المبلغ (₪) *"}
              </label>
              {isPayment && currentDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountStr(String(currentDebt))}
                  className="text-[12px] font-bold text-teal hover:underline"
                >
                  {isEn ? "Pay Full Debt" : "سداد كامل الدين"} ({currentDebt.toFixed(2)} ₪)
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              dir="ltr"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-bg border-2 border-mint-line rounded-xl px-4 py-3 text-[20px] font-mono font-black text-ink focus:outline-none focus:border-primary"
            />
            {isPayment && (
              <p className="text-[11px] font-semibold text-ink-soft mt-1">
                {isEn
                  ? "Tip: Paying more than current debt stores the surplus as advance credit for POS."
                  : "تلميح: دفع مبلغ أكبر من الدين الحالي يحفظ الفائض كرصيد دائن يستخدم في نقطة البيع."}
              </p>
            )}
          </div>

          {isPayment && (
            <>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-2">
                  {isEn ? "Payment Channel" : "وسيلة الدفع / الصندوق"}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VOUCHER_PAYMENT_CHANNELS.map((ch) => (
                    <button
                      key={ch.code}
                      type="button"
                      onClick={() => setPaymentMethod(ch.code)}
                      className={`py-2.5 px-3 rounded-xl text-[12px] font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === ch.code
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-bg text-ink border-mint-line hover:bg-white"
                      }`}
                    >
                      <span>{ch.emoji}</span>
                      <span>{isEn ? ch.labelEn : ch.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== "cash" && (
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1">
                    {isEn ? "Reference / Transaction Number" : "رقم المرجع / الحوالة الإلكترونية"}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={electronicRef}
                    onChange={(e) => setElectronicRef(e.target.value)}
                    placeholder={isEn ? "Receipt / Auth / Transfer #" : "مثال: TR-99102"}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-mono text-ink focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[13px] font-bold text-ink-soft mb-1">
              {isPayment
                ? isEn
                  ? "Voucher Notes (Optional)"
                  : "ملاحظات السند (اختياري)"
                : isEn
                  ? "Reason / Description *"
                  : "سبب القيد / البيان *"}
            </label>
            <input
              type="text"
              required={!isPayment}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isPayment
                  ? isEn
                    ? "e.g. Monthly installment"
                    : "مثال: دفعة على الحساب"
                  : isEn
                    ? "e.g. Carried forward balance from old notebook"
                    : "مثال: ترحيل رصيد سابق من الدفتر"
              }
              className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-mint-line font-bold text-ink-soft hover:bg-bg"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={submitting || parsedAmount <= 0}
              className={`flex-1 py-3 rounded-xl text-white font-black shadow-md disabled:opacity-50 ${
                isPayment ? "bg-teal hover:bg-teal/90" : "bg-coral hover:bg-coral/90"
              }`}
            >
              {submitting
                ? isEn
                  ? "Processing..."
                  : "جاري الاعتماد..."
                : isPayment
                  ? isEn
                    ? "Confirm & Print Voucher"
                    : "اعتماد وطباعة السند"
                  : isEn
                    ? "Record Manual Debt"
                    : "اعتماد قيد الدين"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
