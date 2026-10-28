"use client";

import React, { useState, useMemo } from "react";
import masterDrugsData from "@/data/masterDrugs.json";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";
import { useStore } from "@/store";

export interface MasterDrug {
  barcode: string;
  name: string;
  scientificName: string;
  category: string;
  defaultUnit: string;
  hasSubUnit: boolean;
  sub1Name?: string;
  sub1Count?: number;
  hasSubUnit2?: boolean;
  sub2Name?: string;
  sub2Count?: number;
  isControlled?: number;
  description?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventory?: any[];
  pharmacyId?: string;
  branches?: any[];
  onItemAdded?: () => void;
  onSelectDrug?: (drug: MasterDrug) => void;
}

export default function MasterCatalogModal({
  isOpen,
  onClose,
  inventory = [],
  pharmacyId,
  branches = [],
  onItemAdded,
  onSelectDrug,
}: Props) {
  const language = useStore((state: any) => state.language) || "ar";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "not_in_stock">("all");

  // Quick Add Modal State
  const [quickDrug, setQuickDrug] = useState<MasterDrug | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickForm, setQuickForm] = useState({
    price_sell: "",
    price_buy: "",
    qty: "10",
    minQty: "5",
    branch_id: "",
    batch_number: "",
    expiry_date: "",
    sub1Price: "",
    sub2Price: "",
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    masterDrugsData.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ["الكل", ...Array.from(set)];
  }, []);

  // Stock lookup map for O(1) matching
  const stockLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of inventory) {
      if (item.batch_number || item.id) {
        if (item.name) {
          const clean = item.name.replace(/\s*\(القديم\)|\s*\(الجديد\)/g, "").trim().toLowerCase();
          map.set(clean, item);
        }
      }
    }
    return map;
  }, [inventory]);

  const getInStockItem = (drug: MasterDrug) => {
    if (!drug || !drug.name) return null;
    const clean = drug.name.trim().toLowerCase();
    return stockLookup.get(clean) || null;
  };

  // Filter drugs
  const filteredDrugs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (masterDrugsData as MasterDrug[]).filter((drug) => {
      // Category match
      if (selectedCategory !== "الكل" && drug.category !== selectedCategory) {
        return false;
      }
      // Status filter
      const inStock = Boolean(getInStockItem(drug));
      if (statusFilter === "in_stock" && !inStock) return false;
      if (statusFilter === "not_in_stock" && inStock) return false;

      // Search match
      if (!query) return true;
      const matchName = drug.name.toLowerCase().includes(query);
      const matchSci = drug.scientificName?.toLowerCase().includes(query);
      const matchBarcode = drug.barcode?.toLowerCase().includes(query);
      return matchName || matchSci || matchBarcode;
    });
  }, [search, selectedCategory, statusFilter, stockLookup]);

  // Open Quick Add
  const handleOpenQuickAdd = (drug: MasterDrug) => {
    const defaultBranch = branches && branches.length > 0 ? branches[0].id : "";
    setQuickDrug(drug);
    setQuickForm({
      price_sell: "",
      price_buy: "",
      qty: "10",
      minQty: "5",
      branch_id: defaultBranch,
      batch_number: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      sub1Price: "",
      sub2Price: "",
    });
  };

  // Auto calculate sub-unit prices in Quick Add
  const handlePriceChange = (val: string) => {
    const mainPrice = parseFloat(val) || 0;
    let s1 = "";
    let s2 = "";
    if (quickDrug && mainPrice > 0) {
      if (quickDrug.hasSubUnit && (quickDrug.sub1Count || 0) > 0) {
        s1 = (mainPrice / (quickDrug.sub1Count || 1)).toFixed(2);
        if (quickDrug.hasSubUnit2 && (quickDrug.sub2Count || 0) > 0) {
          s2 = (mainPrice / ((quickDrug.sub1Count || 1) * (quickDrug.sub2Count || 1))).toFixed(2);
        }
      }
    }
    setQuickForm((prev) => ({
      ...prev,
      price_sell: val,
      sub1Price: s1,
      sub2Price: s2,
    }));
  };

  // Submit Quick Add to server
  const handleSaveQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDrug || !pharmacyId) return;

    const sell = parseFloat(quickForm.price_sell);
    if (!sell || sell <= 0) {
      toast.error(language === "en" ? "Please enter a valid selling price" : "يرجى إدخال سعر بيع صحيح");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate units format
      let units = null;
      let totalQty = parseFloat(quickForm.qty) || 0;

      if (quickDrug.hasSubUnit && !quickDrug.hasSubUnit2) {
        const p1q = quickDrug.sub1Count || 1;
        totalQty = totalQty * p1q;
        units = JSON.stringify([
          { name: quickDrug.defaultUnit || "علبة", count: p1q },
          { name: quickDrug.sub1Name || "شريط", count: 1 },
        ]);
      } else if (quickDrug.hasSubUnit && quickDrug.hasSubUnit2) {
        const p1q = quickDrug.sub1Count || 1;
        const p2q = quickDrug.sub2Count || 1;
        totalQty = totalQty * p1q * p2q;
        units = JSON.stringify([
          { name: quickDrug.defaultUnit || "علبة", count: p1q * p2q },
          { name: quickDrug.sub1Name || "شريط", count: p2q },
          { name: quickDrug.sub2Name || "حبة", count: 1 },
        ]);
      }

      const eventId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const itemId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        id: itemId,
        eventId,
        name: quickDrug.name,
        scientificName: quickDrug.scientificName,
        barcode: quickDrug.barcode,
        category: quickDrug.category,
        price_sell: sell,
        price_buy: parseFloat(quickForm.price_buy) || 0,
        qty: totalQty,
        minQty: parseFloat(quickForm.minQty) || 5,
        reorder_level: parseFloat(quickForm.minQty) || 5,
        batch_number: quickForm.batch_number,
        expiry_date: quickForm.expiry_date,
        branch_id: quickForm.branch_id || (branches[0]?.id ?? ""),
        isControlled: quickDrug.isControlled ? 1 : 0,
        units,
      };

      const res = await fetch(`${API_BASE_URL}/api/pharmacies/${pharmacyId}/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": eventId,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        return; // Session expired interceptor handles notification and redirection
      }

      const data = await res.json();
      if (data.success) {
        toast.success(
          language === "en"
            ? `${quickDrug.name} added to inventory successfully!`
            : `تم إدراج ${quickDrug.name} بالمخزون بنجاح!`
        );
        setQuickDrug(null);
        if (onItemAdded) onItemAdded();
      } else if (data.code === "INVENTORY_NAME_CONFLICT") {
        toast.error(
          language === "en"
            ? "An item with this name already exists in inventory"
            : "يوجد صنف بنفس هذا الاسم مسبقاً في المخزون"
        );
      } else {
        toast.error(data.error || (language === "en" ? "Failed to add item to inventory" : "فشل إدراج الصنف بالمخزون"));
      }
    } catch (err) {
      toast.error(language === "en" ? "Server connection error" : "خطأ في الاتصال بالخادم");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-mint-line flex flex-col overflow-hidden text-ink">
        {/* Header */}
        <div className="p-5 border-b border-mint-line flex items-center justify-between bg-gradient-to-r from-primary/10 via-card to-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
              <span className="text-xl">📘</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">دليل الأدوية الافتراضي الموحد</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  70+ صنف معتمد ⚡
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                قاعدة بيانات الأدوية الرسمية لإدارة وموظفي الصيدلية - فحص التوفر والإدراج السريع بنقرة واحدة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-mint-line flex items-center justify-center text-ink-soft hover:bg-bg hover:text-ink transition-colors font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-bg/50 border-b border-mint-line flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم التجاري، الاسم العلمي، أو الباركود..."
              className="w-full bg-card border-2 border-mint-line rounded-2xl px-4 py-2.5 pl-10 text-sm font-medium outline-none focus:border-primary transition-colors text-ink"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink"
              >
                مسح
              </button>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex gap-1.5 bg-card p-1 rounded-2xl border border-mint-line self-start">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all" ? "bg-primary text-white shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              الكل ({masterDrugsData.length})
            </button>
            <button
              onClick={() => setStatusFilter("in_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "in_stock" ? "bg-teal text-white shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              ✓ متوفر بالصيدلية
            </button>
            <button
              onClick={() => setStatusFilter("not_in_stock")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "not_in_stock" ? "bg-amber-500 text-white shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              + غير مضاف
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-2 border-b border-mint-line overflow-x-auto flex gap-2 no-scrollbar bg-card">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border ${
                selectedCategory === cat
                  ? "bg-primary/10 text-primary border-primary"
                  : "bg-bg text-ink-soft border-mint-line hover:text-ink"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Drug Grid List */}
        <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDrugs.length === 0 ? (
            <div className="col-span-full py-16 text-center text-ink-soft">
              <span className="text-4xl block mb-2">🔍</span>
              <p className="font-bold">لم يتم العثور على أدوية مطابقة للبحث</p>
              <p className="text-xs mt-1">جرب البحث بكلمة أخرى أو تغيير تصنيف الفلتر</p>
            </div>
          ) : (
            filteredDrugs.map((drug) => {
              const inStock = getInStockItem(drug);
              return (
                <div
                  key={drug.barcode || drug.name}
                  className={`bg-card rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                    inStock ? "border-teal/40 bg-teal/5" : "border-mint-line"
                  }`}
                >
                  <div>
                    {/* Header Tags */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inStock ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                            ✓ متوفر في صيدليتك
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                            غير مضاف بالمخزون
                          </span>
                        )}
                        {drug.isControlled ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-coral-pale text-coral border border-coral/30">
                            مراقب
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-ink-soft font-mono bg-bg px-2 py-0.5 rounded-lg border border-mint-line">
                        {drug.defaultUnit || "علبة"}
                      </span>
                    </div>

                    {/* Drug Names */}
                    <h3 className="font-bold text-sm text-ink leading-tight mb-1" dir="auto">
                      {drug.name}
                    </h3>
                    <p className="text-xs text-ink-soft font-mono truncate mb-2" dir="ltr">
                      {drug.scientificName}
                    </p>

                    {/* Sub units tag */}
                    {drug.hasSubUnit && (
                      <div className="text-[11px] text-teal font-medium mb-2.5 flex items-center gap-1">
                        <span>📦 التجزئة:</span>
                        <span>
                          {drug.sub1Count} {drug.sub1Name}
                          {drug.hasSubUnit2 ? ` × ${drug.sub2Count} ${drug.sub2Name}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer / Actions */}
                  <div className="pt-3 border-t border-mint-line/70 flex items-center justify-between mt-1">
                    {inStock ? (
                      <div>
                        <span className="text-[11px] text-ink-soft block">الرصيد والسعر:</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-teal">{inStock.qty ?? 0}</span>
                          <span className="text-[11px] text-ink-soft">|</span>
                          <span className="text-xs font-bold text-ink">{inStock.price ?? inStock.price_sell} ₪</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium">جاهز للإدراج السريع</span>
                    )}

                    {onSelectDrug ? (
                      <button
                        onClick={() => {
                          onSelectDrug(drug);
                          onClose();
                        }}
                        className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-teal transition-colors"
                      >
                        اختر الصنف
                      </button>
                    ) : inStock ? (
                      <span className="text-xs font-bold text-teal bg-teal/10 px-2.5 py-1 rounded-xl">
                        مدرج بالفعل ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenQuickAdd(drug)}
                        className="bg-primary text-white text-xs font-bold px-3.5 py-1.5 rounded-xl hover:bg-teal transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>إضافة للمخزون</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Add Form Modal */}
      {quickDrug && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-mint-line text-ink">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-teal bg-teal/10 px-2.5 py-0.5 rounded-full mb-1 inline-block">
                  إدراج صنف جديد من الدليل الافتراضي
                </span>
                <h3 className="text-lg font-bold text-ink">{quickDrug.name}</h3>
                <p className="text-xs text-ink-soft font-mono">{quickDrug.scientificName}</p>
              </div>
              <button
                onClick={() => setQuickDrug(null)}
                className="w-8 h-8 rounded-xl border border-mint-line flex items-center justify-center text-ink-soft hover:bg-bg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">سعر البيع (₪) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickForm.price_sell}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="مثال: 25"
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">سعر التكلفة (₪)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickForm.price_buy}
                    onChange={(e) => setQuickForm({ ...quickForm, price_buy: e.target.value })}
                    placeholder="مثال: 18"
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
              </div>

              {/* Sub-unit prices preview */}
              {quickDrug.hasSubUnit && (
                <div className="bg-bg/60 p-3 rounded-2xl border border-mint-line text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">سعر {quickDrug.sub1Name || "الشريط"}:</span>
                    <span className="font-bold text-teal">{quickForm.sub1Price ? `${quickForm.sub1Price} ₪` : "--"}</span>
                  </div>
                  {quickDrug.hasSubUnit2 && (
                    <div className="flex justify-between">
                      <span className="text-ink-soft">سعر {quickDrug.sub2Name || "الحبة"}:</span>
                      <span className="font-bold text-teal">{quickForm.sub2Price ? `${quickForm.sub2Price} ₪` : "--"}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">الكمية الأولية (بالعلب)</label>
                  <input
                    type="number"
                    value={quickForm.qty}
                    onChange={(e) => setQuickForm({ ...quickForm, qty: e.target.value })}
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">الحد الأدنى للتنبيه</label>
                  <input
                    type="number"
                    value={quickForm.minQty}
                    onChange={(e) => setQuickForm({ ...quickForm, minQty: e.target.value })}
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">رقم التشغيلة (Batch)</label>
                  <input
                    type="text"
                    value={quickForm.batch_number}
                    onChange={(e) => setQuickForm({ ...quickForm, batch_number: e.target.value })}
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-primary text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">تاريخ الصلاحية</label>
                  <input
                    type="date"
                    value={quickForm.expiry_date}
                    onChange={(e) => setQuickForm({ ...quickForm, expiry_date: e.target.value })}
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-primary text-ink"
                  />
                </div>
              </div>

              {branches.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">الفرع المورد له</label>
                  <select
                    value={quickForm.branch_id}
                    onChange={(e) => setQuickForm({ ...quickForm, branch_id: e.target.value })}
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  >
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickDrug(null)}
                  className="flex-1 bg-bg border border-mint-line rounded-xl py-2.5 text-sm font-bold text-ink-soft hover:bg-card"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-teal transition-all shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ وإدراج بالمخزون"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
