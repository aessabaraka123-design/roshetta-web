"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { PAYMENT_METHODS, PaymentMethodCode, validatePaymentInput } from "@/lib/purchases/domain";
import { payPurchaseInvoiceAction } from "@/lib/purchases/api";

interface Props {
  invoice: any | null;
  pharmacyId: string;
  lang: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickPayInvoiceModal({ invoice, pharmacyId, lang, onClose, onSuccess }: Props) {
  const isEn = lang === "en";
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodCode>("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) {
      setAmount(String(Number(invoice.remaining || 0)));
      setMethod("cash");
      setPaymentRef("");
    }
  }, [invoice]);

  if (!invoice) return null;

  const remaining = Number(invoice.remaining || 0);
  const methodMeta = PAYMENT_METHODS[method];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validatePaymentInput(
      { amount: Number(amount), paymentMethod: method, maxRemaining: remaining },
      lang
    );
    if (!validation.valid) {
      toast.error(validation.firstError);
      return;
    }

    setSubmitting(true);
    try {
      await payPurchaseInvoiceAction(
        pharmacyId,
        invoice.id,
        {
          payment: Number(amount),
          paymentMethod: method,
          paymentRef: paymentRef.trim(),
          branch_id: invoice.branch_id,
          supplier_id: invoice.supplier_id,
        },
        lang
      );
      toast.success(isEn ? "Invoice payment recorded successfully" : "تم تسجيل سداد الفاتورة بنجاح");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Payment failed" : "تعذر تسجيل السداد"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-ink">
            {isEn ? "Pay Purchase Invoice" : "سداد دفعة فاتورة شراء"} #{invoice.invoice_number || invoice.id}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        <div className="p-3 rounded-xl bg-bg border border-mint-line mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-ink-soft">{invoice.supplier_name || "مورد"}</span>
          <span className="text-sm font-black font-mono text-coral">
            {isEn ? "Remaining:" : "المتبقي:"} ₪{remaining.toFixed(2)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ink-soft">{isEn ? "Payment Amount (₪)" : "مبلغ السداد (₪)"}</label>
              <button type="button" onClick={() => setAmount(String(remaining))} className="text-xs font-black text-primary hover:underline">
                {isEn ? "Full Remaining" : "سداد كامل المتبقي"}
              </button>
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
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Transfer / Reference #" : "رقم المرجع / الحوالة (اختياري)"}</label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="REF-..."
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line font-mono text-sm text-ink"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg border border-mint-line font-bold text-sm">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-teal text-white font-black text-sm hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "..." : isEn ? "Confirm Payment" : "تأكيد السداد"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
