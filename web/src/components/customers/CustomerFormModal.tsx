"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCustomer, updateCustomer } from "@/lib/customers/api";
import type { BranchRecord, CustomerRecord } from "@/lib/customers/domain";

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacyId: string;
  branches: BranchRecord[];
  initialCustomer?: CustomerRecord | null;
  defaultBranchId?: string | null;
  isGeneralManager: boolean;
  cashierName?: string;
  lang: "ar" | "en";
  onSaved: (custId?: string) => void;
}

export default function CustomerFormModal({
  open,
  onClose,
  pharmacyId,
  branches,
  initialCustomer,
  defaultBranchId,
  isGeneralManager,
  cashierName,
  lang,
  onSaved,
}: CustomerFormModalProps) {
  const isEdit = Boolean(initialCustomer?.id);
  const isEn = lang === "en";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingType, setOpeningType] = useState<"debit" | "credit">("debit");
  const [submitting, setSubmitting] = useState(false);

  const activeBranches = branches.filter(
    (b) => !["مؤرشف", "archived", "deleted"].includes(String(b.status || ""))
  );

  useEffect(() => {
    if (!open) return;
    if (initialCustomer) {
      setName(initialCustomer.name || "");
      setPhone(initialCustomer.phone || "");
      setAddress(initialCustomer.address || "");
      setNotes(initialCustomer.notes || "");
      setBranchId(initialCustomer.branch_id || "");
      setOpeningBalance("");
      setOpeningType("debit");
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
      setBranchId(
        defaultBranchId && defaultBranchId !== "all"
          ? defaultBranchId
          : isGeneralManager
            ? ""
            : activeBranches[0]?.id || "Main"
      );
      setOpeningBalance("");
      setOpeningType("debit");
    }
  }, [open, initialCustomer, defaultBranchId, isGeneralManager]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(isEn ? "Customer name is required" : "يرجى إدخال اسم العميل");
      return;
    }

    const openingAmt = parseFloat(openingBalance);
    if (!isEdit && openingBalance && (Number.isNaN(openingAmt) || openingAmt < 0)) {
      toast.error(isEn ? "Invalid opening balance" : "قيمة الرصيد الافتتاحي غير صالحة");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && initialCustomer) {
        await updateCustomer(
          pharmacyId,
          initialCustomer.id,
          {
            name,
            phone,
            address,
            notes,
            branch_id: branchId || null,
          },
          lang
        );
        toast.success(isEn ? "Customer updated successfully" : "تم تحديث بيانات العميل بنجاح");
        onSaved(initialCustomer.id);
      } else {
        const res = await createCustomer(
          pharmacyId,
          {
            name,
            phone,
            address,
            notes,
            branch_id: branchId || null,
            openingBalance: openingAmt > 0 ? openingAmt : undefined,
            openingType,
            cashierName,
          },
          lang
        );
        toast.success(isEn ? "Customer registered successfully!" : "تم تسجيل العميل بنجاح!");
        onSaved(res.data?.custId);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to save customer" : "تعذر حفظ بيانات العميل"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg p-6 md:p-7 shadow-2xl border border-mint-line max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-black text-primary">
            {isEdit
              ? isEn
                ? "Edit Customer Profile"
                : "تعديل بيانات العميل"
              : isEn
                ? "Add New Customer"
                : "إضافة عميل جديد"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold text-ink-soft mb-1">
              {isEn ? "Full Name *" : "اسم العميل الكامل *"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? "Example: Ahmed Mahmoud" : "مثال: أحمد محمود"}
              className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-bold text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-ink-soft mb-1">
                {isEn ? "Phone Number (Optional)" : "رقم الجوال (اختياري)"}
              </label>
              <input
                type="text"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="059xxxxxxx"
                className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-mono text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-ink-soft mb-1">
                {isEn ? "Branch Scope" : "نطاق الفرع"}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!isGeneralManager && activeBranches.length <= 1}
                className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[14px] font-bold text-ink focus:outline-none focus:border-primary disabled:opacity-70"
              >
                {isGeneralManager && (
                  <option value="">
                    {isEn ? "All Branches (Shared)" : "عام لجميع الفروع"}
                  </option>
                )}
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-ink-soft mb-1">
              {isEn ? "Address (Optional)" : "العنوان (اختياري)"}
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isEn ? "Neighborhood / Street" : "الحي / الشارع"}
              className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-medium text-ink focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-ink-soft mb-1">
              {isEn ? "Medical / Account Notes (Optional)" : "ملاحظات طبية أو حسابية (اختياري)"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "Allergies, chronic meds, credit limit notes..." : "مثال: مرض مزمن، سقف دين متفق عليه..."}
              className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] text-ink focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {!isEdit && (
            <div className="bg-slate-50 border border-mint-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-black text-primary">
                  {isEn ? "Opening Balance (Optional)" : "رصيد افتتاحي مرحّل (اختياري)"}
                </span>
                <span className="text-[11px] font-semibold text-ink-soft">
                  {isEn ? "Recorded cleanly in customer ledger" : "يُقيد تلقائياً في دفتر العميل"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpeningType("debit")}
                  className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold border transition-all ${
                    openingType === "debit"
                      ? "bg-coral-pale border-coral text-coral"
                      : "bg-white border-mint-line text-ink-soft"
                  }`}
                >
                  {isEn ? "Previous Debt (Owes us)" : "دين سابق على العميل (+)"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpeningType("credit")}
                  className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold border transition-all ${
                    openingType === "credit"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                      : "bg-white border-mint-line text-ink-soft"
                  }`}
                >
                  {isEn ? "Advance Credit (We owe)" : "رصيد دائن للعميل (-)"}
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border border-mint-line rounded-xl px-4 py-2.5 text-[15px] font-mono font-bold text-ink focus:outline-none focus:border-primary"
              />
            </div>
          )}

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
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-black hover:bg-primary/90 shadow-md disabled:opacity-50"
            >
              {submitting
                ? isEn
                  ? "Saving..."
                  : "جاري الحفظ..."
                : isEdit
                  ? isEn
                    ? "Save Changes"
                    : "حفظ التعديلات"
                  : isEn
                    ? "Save Customer"
                    : "اعتماد وحفظ العميل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
