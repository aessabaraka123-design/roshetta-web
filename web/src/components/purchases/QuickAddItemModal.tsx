"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { normalizeUnitsInput } from "@/lib/purchases/domain";
import { quickAddInventoryItemAction } from "@/lib/purchases/api";

interface Props {
  isOpen: boolean;
  pharmacyId: string;
  branchId: string;
  lang: "ar" | "en";
  onClose: () => void;
  onItemCreated: (item: any) => void;
}

export default function QuickAddItemModal({ isOpen, pharmacyId, branchId, lang, onClose, onItemCreated }: Props) {
  const isEn = lang === "en";
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scientificName: "",
    barcode: "",
    category: "",
    price_buy: "",
    price_sell: "",
    minQty: "5",
    expiry: "",
    unitMode: 1 as 1 | 2 | 3,
    boxName: "علبة",
    part1Name: "شريط",
    part1Qty: "2",
    part1Price: "",
    part2Name: "حبة",
    part2Qty: "10",
    part2Price: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const name = form.name.trim();
    if (!name) {
      toast.error(isEn ? "Item name is required" : "اسم الصنف مطلوب");
      return;
    }
    const cost = Number(form.price_buy) || 0;
    const price = Number(form.price_sell) || 0;
    const unitsArr = normalizeUnitsInput({
      unitMode: form.unitMode,
      boxName: form.boxName,
      boxPrice: price,
      part1Name: form.part1Name,
      part1Qty: Number(form.part1Qty) || 1,
      part1Price: Number(form.part1Price) || 0,
      part2Name: form.part2Name,
      part2Qty: Number(form.part2Qty) || 1,
      part2Price: Number(form.part2Price) || 0,
    });

    setSubmitting(true);
    try {
      const res = await quickAddInventoryItemAction(
        pharmacyId,
        {
          name,
          scientificName: form.scientificName.trim(),
          barcode: form.barcode.trim(),
          category: form.category.trim(),
          cost,
          price,
          qty: 0,
          minQty: Number(form.minQty) || 5,
          expiry: form.expiry.trim(),
          branch_id: branchId || "Main",
          units: unitsArr,
        },
        lang
      );

      toast.success(isEn ? "Item added to inventory and cart" : "تمت إضافة الصنف للمخزون والفاتورة");
      onItemCreated({
        id: res.itemId,
        name,
        scientificName: form.scientificName.trim(),
        barcode: form.barcode.trim(),
        category: form.category.trim(),
        cost,
        purchase_price: cost,
        price,
        sell_price: price,
        expiry: form.expiry.trim(),
        expiry_date: form.expiry.trim(),
        qty: 1,
        unit_size: unitsArr && unitsArr.length > 0 ? unitsArr[0].count : 1,
        units: unitsArr,
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to add item" : "تعذر إضافة الصنف"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-ink">{isEn ? "Quick Add New Item" : "إضافة صنف جديد سريع للمخزون"}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Commercial Name *" : "الاسم التجاري *"}</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Barcode" : "الباركود"}</label>
              <input
                type="text"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Scientific Name" : "الاسم العلمي"}</label>
              <input
                type="text"
                value={form.scientificName}
                onChange={(e) => setForm({ ...form, scientificName: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm text-ink"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Cost Price" : "سعر التكلفة (شراء)"}</label>
              <input
                type="number"
                step="0.01"
                value={form.price_buy}
                onChange={(e) => setForm({ ...form, price_buy: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Sell Price" : "سعر البيع"}</label>
              <input
                type="number"
                step="0.01"
                value={form.price_sell}
                onChange={(e) => setForm({ ...form, price_sell: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Expiry Date" : "تاريخ الصلاحية"}</label>
              <input
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Packaging Levels" : "نظام التجزئة والوحدات"}</label>
              <select
                value={form.unitMode}
                onChange={(e) => setForm({ ...form, unitMode: Number(e.target.value) as 1 | 2 | 3 })}
                className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink"
              >
                <option value={1}>{isEn ? "Single Unit" : "وحدة واحدة (علبة فقط)"}</option>
                <option value={2}>{isEn ? "2 Levels (Box + Strip)" : "مستويان (علبة + شريط)"}</option>
                <option value={3}>{isEn ? "3 Levels (Box + Strip + Pill)" : "3 مستويات (علبة + شريط + حبة)"}</option>
              </select>
            </div>
          </div>

          {form.unitMode >= 2 && (
            <div className="p-3 rounded-xl bg-bg border border-mint-line space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم المستوى 1"
                  value={form.part1Name}
                  onChange={(e) => setForm({ ...form, part1Name: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-bold"
                />
                <input
                  type="number"
                  placeholder="العدد بالعلبة"
                  value={form.part1Qty}
                  onChange={(e) => setForm({ ...form, part1Qty: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-mono"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="سعر البيع (تلقائي)"
                  value={form.part1Price}
                  onChange={(e) => setForm({ ...form, part1Price: e.target.value })}
                  className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-mono"
                />
              </div>
              {form.unitMode === 3 && (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="اسم المستوى 2"
                    value={form.part2Name}
                    onChange={(e) => setForm({ ...form, part2Name: e.target.value })}
                    className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-bold"
                  />
                  <input
                    type="number"
                    placeholder="حبات بالشريط"
                    value={form.part2Qty}
                    onChange={(e) => setForm({ ...form, part2Qty: e.target.value })}
                    className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-mono"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="سعر الحبة (تلقائي)"
                    value={form.part2Price}
                    onChange={(e) => setForm({ ...form, part2Price: e.target.value })}
                    className="h-9 px-2 rounded-lg bg-card border border-mint-line text-xs font-mono"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg border border-mint-line font-bold text-sm">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:bg-teal disabled:opacity-50"
            >
              {submitting ? "..." : isEn ? "Save & Add to Invoice" : "حفظ وإضافة للفاتورة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
