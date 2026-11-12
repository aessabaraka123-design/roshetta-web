"use client";

import React, { useMemo, useState } from "react";
import { resolveBranchName, type BranchRecord } from "@/lib/inventory/domain";
import { STOCK_TAKE_SCOPES, filterItemsByScope, type StockTakeScopeType } from "@/lib/stock-take/domain";

export function SessionSetupModal({
  inventory,
  branches,
  categories,
  userRole,
  userBranch,
  language = "ar",
  submitting = false,
  onConfirm,
  onClose,
}: {
  inventory: any[];
  branches: BranchRecord[];
  categories: string[];
  userRole?: string;
  userBranch?: string;
  language?: "ar" | "en";
  submitting?: boolean;
  onConfirm: (opts: {
    title: string;
    scopeType: StockTakeScopeType;
    scopeValue: string;
    branchId: string;
    blindMode: boolean;
    notes: string;
    items: any[];
  }) => Promise<void> | void;
  onClose: () => void;
}) {
  const isEn = language === "en";
  const isBranchManager = userRole === "branchManager";
  const [scopeType, setScopeType] = useState<StockTakeScopeType>("full");
  const [scopeValue, setScopeValue] = useState<string>(categories[0] || "");
  const [branchId, setBranchId] = useState<string>(isBranchManager ? userBranch || "" : "all");
  const [blindMode, setBlindMode] = useState<boolean>(true);
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const scopedItems = useMemo(
    () => filterItemsByScope(inventory, scopeType, scopeValue, branchId || "all", branches),
    [inventory, scopeType, scopeValue, branchId, branches]
  );

  const defaultTitle = useMemo(() => {
    const scopeMeta = STOCK_TAKE_SCOPES.find((s) => s.code === scopeType);
    const base = isEn ? scopeMeta?.labelEn || "Stock Take" : scopeMeta?.labelAr || "جلسة جرد";
    if (scopeType === "cycle_category" && scopeValue) return `${base}: ${scopeValue}`;
    if (branchId && branchId !== "all") {
      return `${base} — ${resolveBranchName(branches, branchId, "", language)}`;
    }
    return base;
  }, [scopeType, scopeValue, branchId, branches, language, isEn]);

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-[24px] w-full max-w-lg border border-mint-line shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-mint-line flex items-center justify-between bg-bg/60">
          <h3 className="text-[16px] font-black text-ink">
            {isEn ? "New Stock Take Session" : "إنشاء جلسة جرد جديدة"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-mint-line text-ink-soft hover:text-ink font-black"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-black text-ink-soft mb-1.5">
              {isEn ? "Session Scope" : "نطاق الجرد"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STOCK_TAKE_SCOPES.filter((s) => s.code !== "custom").map((sc) => (
                <button
                  key={sc.code}
                  type="button"
                  onClick={() => setScopeType(sc.code)}
                  className={`px-3 py-2 rounded-[12px] text-[12px] font-bold border text-start transition-colors ${
                    scopeType === sc.code
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-bg border-mint-line text-ink hover:bg-bg/80"
                  }`}
                >
                  {isEn ? sc.labelEn : sc.labelAr}
                </button>
              ))}
            </div>
          </div>

          {scopeType === "cycle_category" && (
            <div>
              <label className="block text-[12px] font-black text-ink-soft mb-1">
                {isEn ? "Target Category" : "الفئة المستهدفة"}
              </label>
              <select
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[12px] bg-bg border border-mint-line text-[13px] font-bold outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isBranchManager && branches.length > 0 && (
            <div>
              <label className="block text-[12px] font-black text-ink-soft mb-1">
                {isEn ? "Branch Scope" : "نطاق الفرع"}
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-[12px] bg-bg border border-mint-line text-[13px] font-bold outline-none"
              >
                <option value="all">{isEn ? "All Branches" : "جميع الفروع"}</option>
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-black text-ink-soft mb-1">
              {isEn ? "Session Title (Optional)" : "عنوان الجلسة (اختياري)"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="w-full px-3.5 py-2 rounded-[12px] bg-bg border border-mint-line text-[13px] font-bold outline-none"
            />
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-[14px] bg-amber-50/70 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
              className="mt-1 w-4 h-4 accent-amber-600"
            />
            <div>
              <div className="text-[13px] font-black text-ink">
                {isEn ? "Blind Count Mode (ERP Standard)" : "وضع الجرد الأعمى (معيار ERP عالمي)"}
              </div>
              <div className="text-[11px] font-medium text-ink-soft mt-0.5">
                {isEn
                  ? "Hides book quantities during physical counting so staff count accurately without bias."
                  : "يخفي الرصيد الدفتري أثناء العدّ الفعلي لضمان دقة الجرد ومنع الاعتماد على الأرقام المسجلة."}
              </div>
            </div>
          </label>

          <div>
            <label className="block text-[12px] font-black text-ink-soft mb-1">
              {isEn ? "Notes" : "ملاحظات"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "Optional session notes..." : "ملاحظات حول الجرد..."}
              className="w-full px-3.5 py-2 rounded-[12px] bg-bg border border-mint-line text-[13px] outline-none"
            />
          </div>

          <div className="rounded-[12px] bg-primary/5 border border-primary/20 px-4 py-2.5 flex items-center justify-between text-[12px]">
            <span className="font-bold text-ink-soft">
              {isEn ? "Matching active items:" : "الأصناف المشمولة في النطاق:"}
            </span>
            <span className="font-black text-primary font-mono text-[14px]">
              {scopedItems.length} {isEn ? "item(s)" : "صنف"}
            </span>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-mint-line bg-bg/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[13px] font-bold text-ink-soft hover:bg-bg"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
          <button
            type="button"
            disabled={submitting || scopedItems.length === 0}
            onClick={() =>
              onConfirm({
                title: title.trim() || defaultTitle,
                scopeType,
                scopeValue: scopeType === "cycle_category" ? scopeValue : "",
                branchId: branchId === "all" ? "" : branchId,
                blindMode,
                notes: notes.trim(),
                items: scopedItems,
              })
            }
            className="px-5 py-2 rounded-[12px] bg-primary text-white text-[13px] font-black hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting
              ? isEn
                ? "Creating..."
                : "جارٍ الإنشاء..."
              : isEn
                ? "Start Draft Session"
                : "بدء جلسة الجرد"}
          </button>
        </div>
      </div>
    </div>
  );
}
