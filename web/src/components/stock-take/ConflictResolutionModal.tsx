"use client";

import React, { useState } from "react";
import { formatQtyWithUnits } from "@/lib/inventory/domain";
import { type StockTakeConflictItem } from "@/lib/stock-take/transport";

export type ConflictStrategy = "keep_actual" | "adopt_current" | "shift_by_sale";

export function ConflictResolutionModal({
  conflicts,
  inventoryMap,
  language = "ar",
  submitting = false,
  onResolve,
  onClose,
}: {
  conflicts: StockTakeConflictItem[];
  inventoryMap: Map<string, any>;
  language?: "ar" | "en";
  submitting?: boolean;
  onResolve: (strategies: Record<string, ConflictStrategy>) => Promise<void> | void;
  onClose: () => void;
}) {
  const isEn = language === "en";
  const [strategies, setStrategies] = useState<Record<string, ConflictStrategy>>(() => {
    const init: Record<string, ConflictStrategy> = {};
    for (const c of conflicts) init[String(c.id)] = "shift_by_sale";
    return init;
  });

  const applyAll = (s: ConflictStrategy) => {
    const next: Record<string, ConflictStrategy> = {};
    for (const c of conflicts) next[String(c.id)] = s;
    setStrategies(next);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[24px] w-full max-w-2xl border border-coral/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-coral/20 bg-coral/5 flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-black text-coral">
              {isEn ? "Stock Moved During Count (409 Conflict)" : "تعارض حركة مخزون أثناء الجرد (409)"}
            </h3>
            <p className="text-[12px] text-ink-soft mt-0.5">
              {isEn
                ? "Sales or purchases occurred for these items while counting. Choose how to reconcile without losing your work:"
                : "حدثت عمليات بيع أو توريد على هذه الأصناف أثناء العدّ. اختر معالجة كل صنف دون فقدان الجلسة:"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-mint-line text-ink-soft font-black"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-2.5 bg-bg border-b border-mint-line flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-bold text-ink-soft">{isEn ? "Apply to all:" : "تطبيق على الكل:"}</span>
          <button
            type="button"
            onClick={() => applyAll("shift_by_sale")}
            className="px-2.5 py-1 rounded-[8px] bg-primary/10 text-primary font-bold hover:bg-primary/20"
          >
            {isEn ? "Shift by interim sales/purchases" : "إزاحة العدّ بمقدار الحركة"}
          </button>
          <button
            type="button"
            onClick={() => applyAll("keep_actual")}
            className="px-2.5 py-1 rounded-[8px] bg-white border border-mint-line text-ink font-bold hover:bg-bg"
          >
            {isEn ? "Keep my physical count" : "إبقاء العدّ الفعلي كما هو"}
          </button>
          <button
            type="button"
            onClick={() => applyAll("adopt_current")}
            className="px-2.5 py-1 rounded-[8px] bg-white border border-mint-line text-ink font-bold hover:bg-bg"
          >
            {isEn ? "Accept new system qty" : "اعتماد الرصيد الحالي الجديد"}
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3">
          {conflicts.map((c) => {
            const item = inventoryMap.get(String(c.id));
            const units = item?.units;
            const strategy = strategies[String(c.id)] || "shift_by_sale";
            const deltaText =
              c.deltaDuringCount > 0
                ? `+${c.deltaDuringCount}`
                : String(c.deltaDuringCount);

            return (
              <div key={c.id} className="p-3.5 rounded-[16px] border border-mint-line bg-bg/40 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-black text-ink">{c.name || item?.name || c.id}</div>
                    <div className="text-[11px] font-mono text-ink-soft">
                      {isEn ? "Snapshot:" : "عند البدء:"}{" "}
                      <strong>{formatQtyWithUnits({ qty: c.expectedQty, units }, units, language)}</strong>{" "}
                      → {isEn ? "Current:" : "الحالي:"}{" "}
                      <strong className="text-primary">{formatQtyWithUnits({ qty: c.currentQty, units }, units, language)}</strong>{" "}
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        Δ {deltaText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  {(
                    [
                      {
                        key: "shift_by_sale",
                        labelAr: "إزاحة العدّ بمقدار الحركة (موصى به)",
                        labelEn: "Shift count by movement (Recommended)",
                      },
                      {
                        key: "keep_actual",
                        labelAr: "اعتماد العدّ الفعلي أمامي على الرف",
                        labelEn: "Keep my counted shelf qty",
                      },
                      {
                        key: "adopt_current",
                        labelAr: "مساواة بالرصيد الحالي (صفر فرق)",
                        labelEn: "Adopt current system qty",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() =>
                        setStrategies((prev) => ({ ...prev, [String(c.id)]: opt.key }))
                      }
                      className={`px-3 py-2 rounded-[10px] border font-bold text-start ${
                        strategy === opt.key
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white border-mint-line text-ink-soft hover:text-ink"
                      }`}
                    >
                      {isEn ? opt.labelEn : opt.labelAr}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3.5 border-t border-mint-line bg-bg/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-ink-soft hover:bg-bg"
          >
            {isEn ? "Back to Edit" : "العودة للتعديل"}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onResolve(strategies)}
            className="px-5 py-2 rounded-[12px] bg-primary text-white text-[13px] font-black hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting
              ? isEn
                ? "Reconciling & Posting..."
                : "جارٍ المطابقة والاعتماد..."
              : isEn
                ? "Apply Resolution & Retry Post"
                : "تطبيق الحل وإعادة الاعتماد"}
          </button>
        </div>
      </div>
    </div>
  );
}
