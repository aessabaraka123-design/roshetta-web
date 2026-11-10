"use client";

import React from "react";

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "completed" | "draft";
  onStatusFilterChange: (val: "all" | "completed" | "draft") => void;
  supplierFilter: string;
  onSupplierFilterChange: (val: string) => void;
  branchFilter: string;
  onBranchFilterChange: (val: string) => void;
  canSwitchBranch: boolean;
  branches: any[];
  suppliers: any[];
  onNewInvoice: () => void;
  lang: "ar" | "en";
}

export default function PurchaseFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  supplierFilter,
  onSupplierFilterChange,
  branchFilter,
  onBranchFilterChange,
  canSwitchBranch,
  branches,
  suppliers,
  onNewInvoice,
  lang,
}: Props) {
  const isEn = lang === "en";

  return (
    <div className="bg-card border border-mint-line rounded-2xl p-4 mb-5 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isEn ? "Search invoice #, supplier, or drug name..." : "ابحث برقم الفاتورة، اسم المورد، أو اسم الدواء..."}
            className="w-full h-11 px-4 bg-bg border border-mint-line rounded-xl text-sm font-medium text-ink focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => onSupplierFilterChange(e.target.value)}
          className="h-11 px-3 bg-bg border border-mint-line rounded-xl text-sm font-bold text-ink focus:outline-none focus:border-primary"
        >
          <option value="all">{isEn ? "All Suppliers" : "كل الموردين"}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {branches.length > 0 && (
          <select
            value={branchFilter}
            disabled={!canSwitchBranch}
            onChange={(e) => onBranchFilterChange(e.target.value)}
            className="h-11 px-3 bg-bg border border-mint-line rounded-xl text-sm font-bold text-ink focus:outline-none focus:border-primary disabled:opacity-70"
          >
            {canSwitchBranch && <option value="all">{isEn ? "All Branches" : "كل الفروع"}</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={onNewInvoice}
          className="h-11 px-5 rounded-xl bg-primary text-white font-black text-sm hover:bg-teal transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
        >
          <span>+</span>
          <span>{isEn ? "New Purchase" : "فاتورة شراء جديدة"}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: isEn ? "All" : "الكل" },
          { id: "completed", label: isEn ? "Completed" : "معتمدة ومستلمة" },
          { id: "draft", label: isEn ? "Pending Receipt" : "بانتظار الاستلام (مسودة)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusFilterChange(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              statusFilter === tab.id
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-bg text-ink-soft border-mint-line hover:text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
