"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { resolveBranchId, validateSupplierInput } from "@/lib/purchases/domain";
import { addSupplierAction, updateSupplierAction } from "@/lib/purchases/api";

interface Props {
  isOpen: boolean;
  editingSupplier: any | null;
  pharmacyId: string;
  branches: any[];
  defaultBranchId: string;
  canSwitchBranch: boolean;
  lang: "ar" | "en";
  onClose: () => void;
  onSaved: () => void;
}

export default function SupplierFormModal({
  isOpen,
  editingSupplier,
  pharmacyId,
  branches,
  defaultBranchId,
  canSwitchBranch,
  lang,
  onClose,
  onSaved,
}: Props) {
  const isEn = lang === "en";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingSupplier) {
      setName(editingSupplier.name || "");
      setPhone(editingSupplier.phone || "");
      setEmail(editingSupplier.email || "");
      setCompany(editingSupplier.company || "");
      setNotes(editingSupplier.notes || "");
      setBranchId(editingSupplier.branch_id ? resolveBranchId(editingSupplier.branch_id, branches) : "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setCompany("");
      setNotes("");
      setBranchId(canSwitchBranch ? "" : resolveBranchId(defaultBranchId, branches));
    }
  }, [isOpen, editingSupplier, defaultBranchId, canSwitchBranch, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const validation = validateSupplierInput({ name }, lang);
    if (!validation.valid) {
      toast.error(validation.firstError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        company: company.trim(),
        notes: notes.trim(),
        branch_id: branchId || null,
      };
      if (editingSupplier) {
        await updateSupplierAction(pharmacyId, editingSupplier.id, payload, lang);
        toast.success(isEn ? "Supplier updated successfully" : "تم تحديث بيانات المورد بنجاح");
      } else {
        await addSupplierAction(pharmacyId, payload, lang);
        toast.success(isEn ? "Supplier added successfully" : "تمت إضافة المورد بنجاح");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to save supplier" : "تعذر حفظ بيانات المورد"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-ink">
            {editingSupplier ? (isEn ? "Edit Supplier" : "تعديل بيانات المورد") : isEn ? "Add New Supplier" : "إضافة مورد جديد"}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Supplier Name *" : "اسم المورد *"}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Phone" : "رقم الهاتف"}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Company" : "الشركة / المستودع"}</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm text-ink"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Email" : "البريد الإلكتروني"}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Branch Scope" : "الفرع"}</label>
              <select
                value={branchId}
                disabled={!canSwitchBranch}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink disabled:opacity-65"
              >
                {canSwitchBranch && <option value="">{isEn ? "All Branches (Pharmacy-Wide)" : "مشترك لكل الفروع"}</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Notes" : "ملاحظات"}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-bg border border-mint-line text-sm text-ink"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg border border-mint-line font-bold text-sm">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:bg-teal disabled:opacity-50"
            >
              {submitting ? "..." : isEn ? "Save" : "حفظ البيانات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
