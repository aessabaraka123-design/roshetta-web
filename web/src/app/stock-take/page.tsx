"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { WasteAdjustmentModal } from "@/components/inventory/InventoryActionModals";
import {
  canManageInventory,
  canViewCosts,
  composeBaseQty,
  decomposeBaseQty,
  extractBoxMultiplier,
  formatQtyWithUnits,
  normalizeSearchText,
  parseUnitsArray,
  round2,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import {
  submitStockTakeItems,
  useInventoryData,
  useStockAdjustmentsData,
} from "@/lib/inventory/api";
import { useStore } from "@/store";

interface CountDraft {
  boxes: number;
  strips: number;
  pills: number;
  dirty: boolean;
}

export default function StockTakePage() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const canEdit = canManageInventory(user?.role);
  const showCosts = canViewCosts(user?.role);
  const { inventory, isLoading, mutate } = useInventoryData(user?.pharmacy_id);
  const { adjustments, mutate: mutateAdj } = useStockAdjustmentsData(user?.pharmacy_id);

  const [tab, setTab] = useState<"count" | "history">("count");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, CountDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [wasteItem, setWasteItem] = useState<InventoryItemRecord | null>(null);

  const activeItems = useMemo(() => inventory.filter((i) => !i.archived_at), [inventory]);

  const filteredItems = useMemo(() => {
    const q = normalizeSearchText(search);
    return activeItems.filter((item) => {
      if (!q) return true;
      return (
        normalizeSearchText(item.name).includes(q) ||
        normalizeSearchText(item.scientificName).includes(q) ||
        String(item.barcode || "").includes(search.trim())
      );
    });
  }, [activeItems, search]);

  const getDraftFor = (item: InventoryItemRecord): CountDraft => {
    if (counts[item.id]) return counts[item.id];
    const decomp = decomposeBaseQty(Number(item.qty) || 0, item.units);
    return { boxes: decomp.boxes, strips: decomp.strips, pills: decomp.pills, dirty: false };
  };

  const updateDraft = (item: InventoryItemRecord, patch: Partial<CountDraft>) => {
    setCounts((prev) => {
      const cur = prev[item.id] || getDraftFor(item);
      return { ...prev, [item.id]: { ...cur, ...patch, dirty: true } };
    });
  };

  const changedPayload = useMemo(() => {
    const rows: Array<{ item: InventoryItemRecord; expectedQty: number; actualBaseQty: number; delta: number; lossValue: number }> = [];
    for (const item of activeItems) {
      const draft = counts[item.id];
      if (!draft?.dirty) continue;
      const units = parseUnitsArray(item.units);
      const actualBase = composeBaseQty({ boxes: draft.boxes, strips: draft.strips, pills: draft.pills }, units);
      const expected = round2(item.qty);
      const delta = round2(actualBase - expected);
      if (Math.abs(delta) > 0.0001) {
        const mult = extractBoxMultiplier(units);
        const lossValue = delta < 0 ? round2((Math.abs(delta) / mult) * (Number(item.cost) || 0)) : 0;
        rows.push({ item, expectedQty: expected, actualBaseQty: actualBase, delta, lossValue });
      }
    }
    return rows;
  }, [activeItems, counts]);

  const handleSubmitCount = async () => {
    if (!user?.pharmacy_id || changedPayload.length === 0) return;
    setSubmitting(true);
    try {
      await submitStockTakeItems(
        user.pharmacy_id,
        changedPayload.map((r) => ({ id: r.item.id, actual: r.actualBaseQty, expectedQty: r.expectedQty })),
        language
      );
      toast.success(
        isEn
          ? `Stock take applied (${changedPayload.length} items adjusted)`
          : `تم اعتماد الجرد الفعلي وتحديث (${changedPayload.length}) صنف بنجاح`
      );
      setCounts({});
      mutate();
      mutateAdj();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Stock take failed" : "تعذر اعتماد الجرد"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (!canEdit) {
    return (
      <main className="w-full pb-20">
        <AppBar title={isEn ? "Stock Take & Waste" : "الجرد والتوالف"} backHref="/inventory" />
        <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-3xl border border-mint-line text-center font-bold text-coral">
          {isEn ? "Manager or Branch Manager permissions are required." : "صلاحيات مدير الصيدلية أو مدير الفرع مطلوبة لإجراء الجرد."}
        </div>
      </main>
    );
  }

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Physical Stock Take & Waste Register" : "الجرد الفعلي وسجل التوالف"} backHref="/inventory" />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-white rounded-2xl p-1 border border-mint-line shadow-sm">
            <button
              onClick={() => setTab("count")}
              className={`px-5 py-2 rounded-xl text-[13px] font-black ${tab === "count" ? "bg-primary text-white" : "text-ink-soft"}`}
            >
              📋 {isEn ? "Physical Count" : "الجرد الفعلي (علب + مفرد)"}
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-5 py-2 rounded-xl text-[13px] font-black ${tab === "history" ? "bg-primary text-white" : "text-ink-soft"}`}
            >
              📜 {isEn ? `Adjustments History (${adjustments.length})` : `سجل التوالف والتسويات (${adjustments.length})`}
            </button>
          </div>

          {tab === "count" && changedPayload.length > 0 && (
            <button
              disabled={submitting}
              onClick={handleSubmitCount}
              className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-[14px] shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting
                ? "..."
                : isEn
                  ? `Apply Stock Take (${changedPayload.length})`
                  : `اعتماد فروقات الجرد (${changedPayload.length} صنف)`}
            </button>
          )}
        </div>

        {tab === "count" ? (
          <>
            <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm flex flex-wrap gap-3 items-center justify-between">
              <div className="flex-1 min-w-[240px] [&>div]:mb-0">
                <SearchBar value={search} onChange={setSearch} placeholder={isEn ? "Scan barcode or search item name..." : "امسح الباركود أو ابحث باسم الصنف للجرد..."} />
              </div>
              {showCosts && changedPayload.length > 0 && (
                <div className="px-4 py-2.5 rounded-xl bg-amber-pale text-ink text-[13.5px] font-bold">
                  {isEn ? "Est. Shortage Loss:" : "قيمة عجز الجرد:"}{" "}
                  {changedPayload.reduce((s, r) => s + r.lossValue, 0).toFixed(2)} ₪
                </div>
              )}
            </div>

            <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-x-auto">
              {isLoading ? (
                <div className="p-12 text-center font-bold text-[15px] text-ink-soft">{isEn ? "Loading..." : "جاري التحميل..."}</div>
              ) : (
                <table className="w-full text-[14px] border-collapse">
                  <thead>
                    <tr className="bg-bg/80 text-ink-soft text-[13.5px] font-bold border-b border-mint-line">
                      <th className="p-4 text-start">{isEn ? "Item" : "الصنف"}</th>
                      <th className="p-4 text-center">{isEn ? "Expected Stock" : "الرصيد الدفتري"}</th>
                      <th className="p-4 text-center">{isEn ? "Actual Count (Boxes / Loose)" : "العد الفعلي (علب / شريط / حبة)"}</th>
                      <th className="p-4 text-center">{isEn ? "Variance" : "الفرق"}</th>
                      <th className="p-4 text-end">{isEn ? "Quick Waste" : "إتلاف مباشر"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const units = parseUnitsArray(item.units);
                      const draft = getDraftFor(item);
                      const actualBase = composeBaseQty({ boxes: draft.boxes, strips: draft.strips, pills: draft.pills }, units);
                      const delta = round2(actualBase - (Number(item.qty) || 0));

                      return (
                        <tr key={item.id} className={`border-b border-mint-line ${delta !== 0 ? "bg-amber-pale/30" : "hover:bg-primary-pale/20"}`}>
                          <td className="p-4">
                            <div className="font-bold text-ink text-[15.5px]">{item.name}</div>
                            {item.barcode && <div className="text-[12.5px] font-mono text-ink-soft mt-0.5">#{item.barcode}</div>}
                          </td>
                          <td className="p-4 text-center font-bold text-[14px] text-ink-soft">
                            {formatQtyWithUnits(item, units, language)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2.5">
                              <div>
                                <span className="block text-[12px] font-bold text-ink-soft text-center mb-1">{units[0]?.name || "علبة"}</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={draft.boxes}
                                  onChange={(e) => updateDraft(item, { boxes: Math.max(0, Number(e.target.value) || 0) })}
                                  className="w-22 bg-white border border-mint-line rounded-xl px-2.5 py-2 text-center font-mono text-[15px] font-bold"
                                />
                              </div>
                              {units.length >= 3 && (
                                <div>
                                  <span className="block text-[12px] font-bold text-ink-soft text-center mb-1">{units[1]?.name}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={draft.strips}
                                    onChange={(e) => updateDraft(item, { strips: Math.max(0, Number(e.target.value) || 0) })}
                                    className="w-18 bg-white border border-mint-line rounded-xl px-2.5 py-2 text-center font-mono text-[15px] font-bold"
                                  />
                                </div>
                              )}
                              {units.length >= 2 && (
                                <div>
                                  <span className="block text-[12px] font-bold text-ink-soft text-center mb-1">{units[units.length - 1]?.name}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={draft.pills}
                                    onChange={(e) => updateDraft(item, { pills: Math.max(0, Number(e.target.value) || 0) })}
                                    className="w-18 bg-white border border-mint-line rounded-xl px-2.5 py-2 text-center font-mono text-[15px] font-bold"
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-[15px]">
                            {delta === 0 ? (
                              <span className="text-ink-soft">—</span>
                            ) : delta < 0 ? (
                              <span className="text-coral">{delta}</span>
                            ) : (
                              <span className="text-emerald-700">+{delta}</span>
                            )}
                          </td>
                          <td className="p-4 text-end">
                            <button onClick={() => setWasteItem(item)} className="px-3.5 py-2 rounded-xl bg-coral-pale text-coral text-[13px] font-bold">
                              {isEn ? "Record Waste" : "خصم تالف"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-x-auto">
            {adjustments.length === 0 ? (
              <div className="p-12 text-center font-bold text-[15px] text-ink-soft">{isEn ? "No adjustments recorded yet." : "لا توجد تسويات أو توالف مسجلة حتى الآن."}</div>
            ) : (
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="bg-bg/80 text-ink-soft text-[13.5px] font-bold border-b border-mint-line">
                    <th className="p-4 text-start">{isEn ? "Date" : "التاريخ"}</th>
                    <th className="p-4 text-start">{isEn ? "Drug" : "الصنف"}</th>
                    <th className="p-4 text-start">{isEn ? "Reason" : "السبب"}</th>
                    <th className="p-4 text-center">{isEn ? "Qty" : "الكمية (بالوحدة الصغرى)"}</th>
                    {showCosts && <th className="p-4 text-center">{isEn ? "Loss Value" : "قيمة الخسارة"}</th>}
                    <th className="p-4 text-start">{isEn ? "By" : "بواسطة"}</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((adj: any) => (
                    <tr key={adj.id} className="border-b border-mint-line">
                      <td className="p-4 font-mono text-[13px] text-ink-soft">{String(adj.created_at || "").slice(0, 16).replace("T", " ")}</td>
                      <td className="p-4 font-bold text-[15px] text-ink">{adj.drug_name}</td>
                      <td className="p-4 font-bold text-[13.5px] text-coral">{adj.reason}</td>
                      <td className="p-4 text-center font-mono font-bold text-[14px]">{Math.abs(Number(adj.qty || 0))}</td>
                      {showCosts && <td className="p-4 text-center font-mono font-bold text-[14.5px] text-coral">{Number(adj.loss_value || 0).toFixed(2)} ₪</td>}
                      <td className="p-4 text-[13.5px] text-ink">{adj.recorded_by || "System"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <WasteAdjustmentModal
        item={wasteItem}
        pharmacyId={user.pharmacy_id}
        userName={user.managerName || user.name}
        userRole={user.role}
        language={language}
        onClose={() => {
          setWasteItem(null);
          mutate();
          mutateAdj();
        }}
      />
    </main>
  );
}
