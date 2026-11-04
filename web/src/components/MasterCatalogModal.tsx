"use client";

import React, { useState, useMemo, useEffect } from "react";
import masterDrugsData from "@/data/masterDrugs.json";
import { API_BASE_URL } from "@/lib/config";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import { normalizeSearchText } from "@/utils/textUtils";

export const MASTER_DRUGS_COUNT = (masterDrugsData as MasterDrug[]).length;

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
  currentBranchId?: string;
  onItemAdded?: () => void;
  onSelectDrug?: (drug: MasterDrug) => void;
}

export default function MasterCatalogModal({
  isOpen,
  onClose,
  inventory = [],
  pharmacyId,
  branches = [],
  currentBranchId,
  onItemAdded,
  onSelectDrug,
}: Props) {
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language) || "ar";

  // Smartly determine the active branch based on current filter or assigned branch
  const getSmartDefaultBranch = () => {
    if (currentBranchId && currentBranchId !== "all" && currentBranchId !== "PENDING") {
      const match = branches.find((b: any) => b.id === currentBranchId || b.name === currentBranchId);
      if (match) return match.id;
    }
    if (user?.branch && user.branch !== "all") {
      const match = branches.find((b: any) => b.id === user.branch || b.name === user.branch);
      if (match) return match.id;
    }
    return branches && branches.length > 0 ? branches[0].id : "";
  };

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_stock" | "not_in_stock" | "controlled">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

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
    const counts: Record<string, number> = {};
    (masterDrugsData as MasterDrug[]).forEach((d) => {
      if (d.category) {
        counts[d.category] = (counts[d.category] || 0) + 1;
      }
    });
    // Sort categories by frequency
    const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return ["الكل", ...sorted];
  }, []);

  // Total controlled count
  const controlledCount = useMemo(() => {
    return (masterDrugsData as MasterDrug[]).filter((d) => Boolean(d.isControlled)).length;
  }, []);

  // Stock lookup map for O(1) matching
  const stockLookup = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of inventory) {
      if (item.batch_number || item.id) {
        if (item.barcode) {
          map.set(item.barcode.trim(), item);
        }
        if (item.name) {
          const clean = item.name.replace(/\s*\(القديم\)|\s*\(الجديد\)/g, "").trim().toLowerCase();
          map.set(clean, item);
        }
      }
    }
    return map;
  }, [inventory]);

  const getInStockItem = (drug: MasterDrug) => {
    if (!drug) return null;
    if (drug.barcode && stockLookup.has(drug.barcode.trim())) {
      return stockLookup.get(drug.barcode.trim());
    }
    if (drug.name) {
      const clean = drug.name.trim().toLowerCase();
      if (stockLookup.has(clean)) return stockLookup.get(clean);
    }
    return null;
  };

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setPage(1);
  }, [search, selectedCategory, statusFilter]);

  // Filter drugs
  const filteredDrugs = useMemo(() => {
    const rawQuery = search.trim().toLowerCase();
    const normQuery = normalizeSearchText(search);

    return (masterDrugsData as MasterDrug[]).filter((drug) => {
      // Category match
      if (selectedCategory !== "الكل" && drug.category !== selectedCategory) {
        return false;
      }

      // Status filter
      const inStock = Boolean(getInStockItem(drug));
      if (statusFilter === "in_stock" && !inStock) return false;
      if (statusFilter === "not_in_stock" && inStock) return false;
      if (statusFilter === "controlled" && !drug.isControlled) return false;

      // Search match
      if (!normQuery) return true;

      const normName = normalizeSearchText(drug.name);
      const normSci = normalizeSearchText(drug.scientificName);
      const normDesc = normalizeSearchText(drug.description);
      const barcode = (drug.barcode || "").toLowerCase();

      return (
        normName.includes(normQuery) ||
        normSci.includes(normQuery) ||
        normDesc.includes(normQuery) ||
        barcode.startsWith(rawQuery) ||
        (drug.name && drug.name.toLowerCase().includes(rawQuery)) ||
        (drug.scientificName && drug.scientificName.toLowerCase().includes(rawQuery))
      );
    });
  }, [search, selectedCategory, statusFilter, stockLookup]);

  // Paginated drugs slice for instant rendering
  const totalPages = Math.max(1, Math.ceil(filteredDrugs.length / PAGE_SIZE));
  const paginatedDrugs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDrugs.slice(start, start + PAGE_SIZE);
  }, [filteredDrugs, page]);

  // Open Quick Add
  const handleOpenQuickAdd = (drug: MasterDrug) => {
    const defaultBranch = getSmartDefaultBranch();
    setQuickDrug(drug);
    setQuickForm({
      price_sell: "",
      price_buy: "",
      qty: "10",
      minQty: "5",
      branch_id: defaultBranch,
      batch_number: `B-${Math.floor(1000 + Math.random() * 9000)}`,
      expiry_date: "",
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
      if (quickDrug.hasSubUnit && (quickDrug.sub1Count || 1) > 0) {
        s1 = (mainPrice / (quickDrug.sub1Count || 1)).toFixed(2);
      }
      if (quickDrug.hasSubUnit2 && (quickDrug.sub2Count || 1) > 0) {
        const s1Price = parseFloat(s1) || mainPrice;
        s2 = (s1Price / (quickDrug.sub2Count || 1)).toFixed(2);
      }
    }
    setQuickForm((p) => ({
      ...p,
      price_sell: val,
      sub1Price: s1,
      sub2Price: s2,
    }));
  };

  // Submit Quick Add to backend inventory
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
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
        branch_id: quickForm.branch_id || getSmartDefaultBranch(),
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
        return;
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

  // Extract manufacturer or agency tag from description
  const getManufacturerBadge = (drug: MasterDrug) => {
    if (!drug.description) return null;
    const desc = drug.description;
    const match = desc.match(/(شركة\s+[^\-]+|بيرزيت\s*BPC|فارماكير\s*PCP|القدس\s*Jepharm|بيت جالا\s*BJP|ميغافارم\s*Megapharm|سجا\s*Saja|غاما\s*Gama|تيفا\s*Teva|نوفارتس\s*Novartis|سانوفي\s*Sanofi|فايزر\s*Pfizer|GSK|جلاكسو|أسترازينيكا\s*AstraZeneca|باير\s*Bayer|أبوت\s*Abbott|ديكسيل\s*Dexcel|حكمة\s*Hikma)/i);
    if (match) return match[0].trim();
    if (desc.includes("-")) {
      return desc.split("-").pop()?.trim();
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-6xl max-h-[94vh] rounded-3xl shadow-2xl border border-mint-line flex flex-col overflow-hidden text-ink">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-mint-line flex items-center justify-between bg-gradient-to-r from-primary/10 via-card to-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md text-2xl">
              🇵🇸
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-black text-ink">
                  {language === "en" ? "Palestine National Master Drug Formulary" : "دليل الأدوية الوطني الفلسطيني الموحد"}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                  {masterDrugsData.length.toLocaleString()} {language === "en" ? "Approved Products" : "صنف دوائي معتمد ⚡"}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                {language === "en"
                  ? "Official Palestinian MoH drug directory covering all national factories and imported brands with verified GS1 barcodes"
                  : "القائمة الدوائية الوطنية الشاملة لكافة المصانع الوطنية الفلسطينية والوكالات المستوردة مع باركودات دولية GS1 EAN-13 معتمدة"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-mint-line flex items-center justify-center text-ink-soft hover:bg-bg hover:text-ink transition-colors font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 md:p-4 bg-bg/50 border-b border-mint-line flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم التجاري، الاسم العلمي، الباركود (EAN-13)، أو المصنع (بيرزيت، تيفا، بيت جالا...)"
              className="w-full bg-card border-2 border-mint-line rounded-2xl px-4 py-2.5 pl-12 text-sm font-medium outline-none focus:border-primary transition-colors text-ink"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-coral hover:underline"
              >
                مسح
              </button>
            ) : (
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft text-sm">
                🔍
              </span>
            )}
          </div>

          {/* Status Filters */}
          <div className="flex gap-1 bg-card p-1 rounded-2xl border border-mint-line flex-wrap self-start">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all" ? "bg-primary text-white shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              الكل ({filteredDrugs.length.toLocaleString()})
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
            <button
              onClick={() => setStatusFilter("controlled")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "controlled" ? "bg-coral text-white shadow-sm" : "text-ink-soft hover:text-coral"
              }`}
            >
              🚨 مراقب ({controlledCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 py-2 border-b border-mint-line overflow-x-auto flex gap-1.5 no-scrollbar bg-card">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-bg text-ink-soft border-mint-line hover:text-ink hover:bg-card"
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
              <span className="text-5xl block mb-2">🔍</span>
              <p className="font-bold text-base text-ink">لم يتم العثور على أدوية مطابقة للبحث</p>
              <p className="text-xs mt-1 text-ink-soft">جرب البحث بكلمة ثانية أو التأكد من الباركود أو اختيار تصنيف آخر</p>
            </div>
          ) : (
            paginatedDrugs.map((drug) => {
              const inStock = getInStockItem(drug);
              const mfgBadge = getManufacturerBadge(drug);

              return (
                <div
                  key={drug.barcode || drug.name}
                  className={`bg-card rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                    inStock ? "border-teal/50 bg-teal/5" : "border-mint-line"
                  }`}
                >
                  <div>
                    {/* Header Tags */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inStock ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                            ✓ متوفر بالصيدلية
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                            غير مضاف
                          </span>
                        )}
                        {drug.isControlled ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-coral-pale text-coral border border-coral/30 animate-pulse">
                            🚨 مراقب قانونياً
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-ink-soft font-mono bg-bg px-2 py-0.5 rounded-lg border border-mint-line">
                        {drug.defaultUnit || "علبة"}
                      </span>
                    </div>

                    {/* Drug Names */}
                    <h3 className="font-black text-sm text-ink leading-snug mb-1" dir="auto">
                      {drug.name}
                    </h3>
                    <p className="text-xs text-ink-soft font-mono truncate mb-2" dir="ltr" title={drug.scientificName}>
                      {drug.scientificName}
                    </p>

                    {/* Manufacturer & Category */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {mfgBadge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          🏭 {mfgBadge}
                        </span>
                      )}
                      <span className="text-[10px] text-ink-soft bg-bg px-1.5 py-0.5 rounded border border-mint-line">
                        {drug.category}
                      </span>
                    </div>

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

                    {/* Barcode Tag */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-soft bg-bg px-2.5 py-1 rounded-lg border border-mint-line mb-3">
                      <span>🏷️ {drug.barcode}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(drug.barcode);
                          toast.success(language === "en" ? "Barcode copied!" : "تم نسخ الباركود!");
                        }}
                        className="text-[10px] text-primary hover:underline font-sans"
                        title="نسخ الباركود"
                      >
                        نسخ
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-mint-line/60 flex items-center gap-2">
                    {onSelectDrug ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDrug(drug);
                          onClose();
                        }}
                        className="w-full bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-teal transition-all shadow-sm flex items-center justify-center gap-1"
                      >
                        <span>تعبئة الصنف في النموذج</span>
                        <span>←</span>
                      </button>
                    ) : (
                      <>
                        {inStock ? (
                          <div className="flex-1 flex items-center justify-between bg-teal/10 border border-teal/20 rounded-xl px-2.5 py-1.5">
                            <span className="text-xs font-bold text-teal">
                              الكمية: {inStock.qty || 0}
                            </span>
                            <span className="text-xs font-mono font-bold text-ink">
                              ₪{Number(inStock.price || 0).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickAdd(drug)}
                            className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-teal transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <span>+ إضافة سريعة للصيدلية</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredDrugs.length > 0 && (
          <div className="p-3 border-t border-mint-line bg-card flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <span className="text-ink-soft font-mono">
              عرض {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, filteredDrugs.length)} من أصل {filteredDrugs.length.toLocaleString()} دواء
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 rounded-xl border border-mint-line bg-bg hover:bg-card disabled:opacity-30 transition-colors"
                title="الصفحة الأولى"
              >
                ««
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-xl border border-mint-line bg-bg hover:bg-card disabled:opacity-30 transition-colors"
              >
                السابق
              </button>
              <span className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-mono">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-xl border border-mint-line bg-bg hover:bg-card disabled:opacity-30 transition-colors"
              >
                التالي
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-xl border border-mint-line bg-bg hover:bg-card disabled:opacity-30 transition-colors"
                title="الصفحة الأخيرة"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Sub-Modal */}
      {quickDrug && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-mint-line p-5 text-ink animate-scale-up">
            <div className="flex items-start justify-between mb-3 border-b border-mint-line pb-3">
              <div>
                <h3 className="font-bold text-base text-ink">إدراج سريع بالمخزون</h3>
                <p className="text-xs text-primary font-bold mt-0.5">{quickDrug.name}</p>
                <p className="text-[11px] text-ink-soft font-mono mt-0.5">🏷️ باركود: {quickDrug.barcode}</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickDrug(null)}
                className="text-ink-soft hover:text-ink font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">سعر البيع (للعلبة) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={quickForm.price_sell}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">سعر الشراء (التكلفة)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickForm.price_buy}
                    onChange={(e) => setQuickForm({ ...quickForm, price_buy: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-card border-2 border-mint-line rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary text-ink"
                  />
                </div>
              </div>

              {/* Sub-unit Prices Preview */}
              {quickDrug.hasSubUnit && (
                <div className="bg-teal/5 border border-teal/20 rounded-xl p-2.5 space-y-1">
                  <div className="flex justify-between text-xs text-ink">
                    <span>سعر {quickDrug.sub1Name}:</span>
                    <span className="font-bold font-mono text-teal">₪{quickForm.sub1Price || "0.00"}</span>
                  </div>
                  {quickDrug.hasSubUnit2 && (
                    <div className="flex justify-between text-xs text-ink">
                      <span>سعر {quickDrug.sub2Name}:</span>
                      <span className="font-bold font-mono text-teal">₪{quickForm.sub2Price || "0.00"}</span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-ink">
                      {language === "en" ? "Expiry Date" : "تاريخ الصلاحية"}
                      <span className="text-[11px] font-normal text-ink-soft ms-1">
                        ({language === "en" ? "Optional" : "اختياري"})
                      </span>
                    </label>
                    {quickForm.expiry_date && (
                      <button
                        type="button"
                        onClick={() => setQuickForm({ ...quickForm, expiry_date: "" })}
                        className="text-[10px] text-red-500 hover:text-red-700 font-bold hover:underline transition-colors"
                        title={language === "en" ? "Clear date" : "مسح التاريخ"}
                      >
                        {language === "en" ? "Clear" : "مسح"}
                      </button>
                    )}
                  </div>
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
                  <label className="text-xs font-bold text-ink block mb-1">
                    {language === "en" ? "Target Branch" : "الفرع المورد له"}
                  </label>
                  <select
                    value={quickForm.branch_id || getSmartDefaultBranch()}
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
