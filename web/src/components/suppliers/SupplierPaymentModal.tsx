"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  PAYMENT_METHODS,
  PaymentMethodCode,
  resolveBranchId,
  round2,
  validatePaymentInput,
} from "@/lib/purchases/domain";
import { paySupplierAction } from "@/lib/purchases/api";

interface Props {
  supplier: any | null;
  pharmacyId: string;
  branches: any[];
  defaultBranchId: string;
  canSwitchBranch: boolean;
  actorName: string;
  lang: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupplierPaymentModal({
  supplier,
  pharmacyId,
  branches,
  defaultBranchId,
  canSwitchBranch,
  actorName,
  lang,
  onClose,
  onSuccess,
}: Props) {
  const isEn = lang === "en";
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodCode>("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [branchId, setBranchId] = useState("Main");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      const bal = Number(supplier.balance) || 0;
      setAmount(bal > 0 ? String(bal) : "");
      setMethod("cash");
      setPaymentRef("");
      setBranchId(resolveBranchId(supplier.branch_id || defaultBranchId, branches));
    }
  }, [supplier, defaultBranchId, branches]);

  if (!supplier) return null;

  const currentBal = Number(supplier.balance) || 0;
  const parsedAmount = Number(amount) || 0;
  const afterBal = round2(currentBal - parsedAmount);
  const methodMeta = PAYMENT_METHODS[method];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validatePaymentInput({ amount: parsedAmount, paymentMethod: method }, lang);
    if (!validation.valid) {
      toast.error(validation.firstError);
      return;
    }

    setSubmitting(true);
    try {
      await paySupplierAction(
        pharmacyId,
        supplier.id,
        {
          amount: parsedAmount,
          paymentMethod: method,
          paymentRef: paymentRef.trim(),
          branch_id: branchId || "Main",
          paidBy: actorName,
        },
        lang
      );
      toast.success(isEn ? "Payment voucher recorded successfully" : "تم تسجيل سند صرف للمورد بنجاح");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Payment failed" : "تعذر حفظ سند السداد"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-ink">
            {isEn ? "Record Payment Voucher" : "سداد دفعة للمورد"}: {supplier.name}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-bg border border-mint-line mb-4 space-y-1 text-xs">
          <div className="flex justify-between font-bold">
            <span className="text-ink-soft">{isEn ? "Current Balance:" : "الرصيد الحالي:"}</span>
            <span className={`font-mono font-black ${currentBal > 0 ? "text-coral" : currentBal < 0 ? "text-teal" : "text-ink"}`}>
              ₪{Math.abs(currentBal).toFixed(2)} {currentBal > 0 ? (isEn ? "(Payable)" : "(مستحق للمورد)") : currentBal < 0 ? (isEn ? "(Our Credit)" : "(رصيد دائن لنا)") : ""}
            </span>
          </div>
          {parsedAmount > 0 && (
            <div className="flex justify-between font-bold">
              <span className="text-ink-soft">{isEn ? "Projected Balance:" : "الرصيد بعد الدفعة:"}</span>
              <span className="font-mono font-black text-primary">
                ₪{Math.abs(afterBal).toFixed(2)} {afterBal < 0 ? (isEn ? "(Credit for Pharmacy)" : "(فائض/رصيد لنا)") : ""}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ink-soft">{isEn ? "Voucher Amount (₪)" : "قيمة الدفعة (₪)"}</label>
              {currentBal > 0 && (
                <button type="button" onClick={() => setAmount(String(currentBal))} className="text-xs font-black text-primary hover:underline">
                  {isEn ? "Pay Full Debt" : "سداد كامل الدين"}
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-bg border border-mint-line font-mono text-base font-black text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-2">{isEn ? "Payment Method" : "طريقة الدفع"}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(PAYMENT_METHODS).map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setMethod(m.code)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    method === m.code ? "bg-primary text-white border-primary" : "bg-bg text-ink-soft border-mint-line hover:text-ink"
                  }`}
                >
                  {isEn ? m.labelEn : m.labelAr}
                </button>
              ))}
            </div>
          </div>

          {methodMeta.requiresRef && (
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Reference / Transfer #" : "رقم المرجع / الحوالة (اختياري)"}</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="REF-..."
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line font-mono text-sm text-ink"
              />
            </div>
          )}

          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Disbursement Branch" : "الفرع الصادر منه الدفعة"}</label>
              <select
                value={branchId}
                disabled={!canSwitchBranch || Boolean(supplier.branch_id)}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink disabled:opacity-65"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-[11px] font-semibold text-ink-soft bg-bg rounded-xl p-2.5 border border-mint-line">
            {isEn
              ? "Auto-allocates to oldest open completed invoices (FIFO), excluding drafts. Surplus stays as credit."
              : "يُوزَّع تلقائياً بنظام الأقدم فالأقدم (FIFO) على الفواتير المعتمدة فقط، وأي فائض يُحفظ كرصيد دائن للصيدلية."}
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg border border-mint-line font-bold text-sm">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-teal text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "..." : isEn ? "Confirm Payment" : "اعتماد سند السداد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
