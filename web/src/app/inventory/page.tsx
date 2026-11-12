"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import MasterCatalogModal, { MASTER_DRUGS_COUNT } from "@/components/MasterCatalogModal";
import InventoryFormModal from "@/components/inventory/InventoryFormModal";
import {
  BarcodeLabelModal,
  ControlledRegisterModal,
  SplitBatchModal,
  StockMovementsModal,
  WasteAdjustmentModal,
} from "@/components/inventory/InventoryActionModals";
import {
  canManageInventory,
  canViewCosts,
  computeInventoryKpis,
  computeStockStatus,
  findUnitByBarcode,
  formatQtyWithUnits,
  getActiveBranches,
  itemMatchesBranchFilter,
  normalizeSearchText,
  parseMedicineName,
  resolveBranchName,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import {
  deleteOrArchiveInventoryItem,
  restoreInventoryItem,
  useInventoryData,
  usePharmacyBranches,
} from "@/lib/inventory/api";
import { exportInventoryValuationExcel } from "@/lib/inventory/export";
import { useStore } from "@/store";

type FilterTab = "all" | "low" | "out" | "expiring" | "expired" | "controlled" | "stagnant" | "archived";

export default function InventoryPage() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Action Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemRecord | null>(null);
  const [splitItem, setSplitItem] = useState<InventoryItemRecord | null>(null);
  const [wasteItem, setWasteItem] = useState<InventoryItemRecord | null>(null);
  const [movementsItem, setMovementsItem] = useState<InventoryItemRecord | null>(null);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItemRecord | null>(null);
  const [controlledOpen, setControlledOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("catalog") === "open" || p.get("catalog") === "true") setCatalogOpen(true);
      const qFilter = p.get("filter") as FilterTab | null;
      if (qFilter) setFilterTab(qFilter);
    }
  }, []);

  const canEdit = canManageInventory(user?.role);
  const showCosts = canViewCosts(user?.role);
  const { branches } = usePharmacyBranches(user?.pharmacy_id);
  const activeBranches = useMemo(() => getActiveBranches(branches), [branches]);
  const { inventory: allItems, isLoading, mutate } = useInventoryData(user?.pharmacy_id, {
    includeArchived: filterTab === "archived",
  });

  const branchScopedItems = useMemo(() => {
    if (!user?.branch || ["manager", "owner"].includes(String(user?.role || "").toLowerCase())) {
      return allItems.filter((item) => itemMatchesBranchFilter(item, branchFilter, branches));
    }
    return allItems.filter((item) => itemMatchesBranchFilter(item, user.branch, branches));
  }, [allItems, branchFilter, branches, user?.branch, user?.role]);

  const kpis = useMemo(() => computeInventoryKpis(branchScopedItems), [branchScopedItems]);

  const filteredItems = useMemo(() => {
    const qNorm = normalizeSearchText(search);
    return branchScopedItems
      .filter((item) => {
        const st = computeStockStatus(item);
        if (filterTab === "archived") return st.isArchived;
        if (st.isArchived) return false;
        if (filterTab === "low") return st.isLowStock;
        if (filterTab === "out") return st.isOutOfStock;
        if (filterTab === "expired") return !st.isOutOfStock && st.expiryStatus.isExpired;
        if (filterTab === "expiring") return !st.isOutOfStock && (st.expiryStatus.isExpiringSoon || st.expiryStatus.isCritical);
        if (filterTab === "controlled") return [true, 1, "1"].includes(item.isControlled as any);
        if (filterTab === "stagnant") return st.isStagnant;
        return true;
      })
      .filter((item) => {
        if (!qNorm) return true;
        const fields = [item.name, item.scientificName, item.manufacturer, item.category, item.barcode, item.batch_number];
        if (fields.some((f) => normalizeSearchText(f).includes(qNorm))) return true;
        return Boolean(findUnitByBarcode(item, search.trim()));
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [branchScopedItems, filterTab, search]);

  const handleDeleteOrArchive = async (item: InventoryItemRecord) => {
    if (!user?.pharmacy_id) return;
    const msg = isEn
      ? `Delete or archive "${item.name}"? (Items linked to sales/purchases are safely archived.)`
      : `هل تريد حذف أو أرشفة الصنف "${item.name}"؟ (الأصناف المرتبطة بفواتير ستُنقل للأرشيف مع تصفير الرصيد)`;
    if (!window.confirm(msg)) return;
    try {
      const res = await deleteOrArchiveInventoryItem(user.pharmacy_id, item.id, false, language);
      toast.success(
        res.data?.archived
          ? (isEn ? "Item moved to archive cleanly" : "تمت أرشفة الصنف مع حفظ سجلاته السابقة")
          : (isEn ? "Item permanently deleted" : "تم حذف الصنف نهائياً")
      );
      mutate();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Action failed" : "تعذر تنفيذ العملية"));
    }
  };

  const handleRestore = async (item: InventoryItemRecord) => {
    if (!user?.pharmacy_id) return;
    try {
      await restoreInventoryItem(user.pharmacy_id, item.id, language);
      toast.success(isEn ? "Item restored from archive" : "تمت استعادة الصنف بنجاح");
      mutate();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Restore failed" : "تعذر الاستعادة"));
    }
  };

  if (!user) return null;

  const filterTabs: Array<{ id: FilterTab; label: string; count?: number; tone?: string }> = [
    { id: "all", label: isEn ? "Active" : "الكل", count: kpis.totalSkus },
    { id: "low", label: isEn ? "Low Stock" : "نواقص", count: kpis.lowStockCount, tone: "amber" },
    { id: "out", label: isEn ? "Out of Stock" : "نافد", count: kpis.outOfStockCount, tone: "coral" },
    { id: "expiring", label: isEn ? "Expiring (<=60d)" : "قريب الانتهاء", count: kpis.expiringWarningCount, tone: "amber" },
    { id: "expired", label: isEn ? "Expired" : "منتهي", count: kpis.expiredCount, tone: "coral" },
    { id: "controlled", label: isEn ? "Controlled" : "مراقب", count: kpis.controlledCount },
    { id: "stagnant", label: isEn ? "Stagnant (>90d)" : "راكد (+90د)", count: kpis.stagnantCount },
    { id: "archived", label: isEn ? "Archived" : "الأرشيف" },
  ];

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Inventory & Stock" : "المخزون والأدوية"} backHref="/" />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        {/* Top Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                <Link
                  href="/add-item"
                  className="px-4 py-2.5 rounded-2xl bg-primary text-white font-bold text-[14px] shadow-md hover:bg-primary-light transition-colors"
                >
                  + {isEn ? "Add Item" : "إضافة صنف جديد"}
                </Link>
                <button
                  onClick={() => setCatalogOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-mint-line text-primary font-bold text-[14px] hover:bg-primary-pale transition-colors"
                >
                  📚 {isEn ? `Drug Catalog (${MASTER_DRUGS_COUNT})` : `الكتالوج (${MASTER_DRUGS_COUNT})`}
                </button>
                <Link
                  href="/stock-take"
                  className="px-4 py-2.5 rounded-2xl bg-white border border-mint-line text-ink font-bold text-[14px] hover:bg-primary-pale transition-colors"
                >
                  📋 {isEn ? "Stock Take & Waste" : "الجرد والتوالف"}
                </Link>
              </>
            )}
            <Link
              href="/batches"
              className="px-4 py-2.5 rounded-2xl bg-white border border-mint-line text-ink font-bold text-[14px] hover:bg-primary-pale transition-colors"
            >
              ⏱ {isEn ? "FEFO Batches" : "الدفعات والصلاحيات"}
            </Link>
            <button
              onClick={() => setControlledOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-pale border border-amber text-ink font-bold text-[14px] hover:bg-amber/30 transition-colors"
            >
              🛡 {isEn ? "Controlled Log" : "دفتر الأدوية المراقبة"}
            </button>
          </div>

          <button
            onClick={() =>
              exportInventoryValuationExcel({
                items: filteredItems,
                branches,
                pharmacyName: user?.pharmacyName || "Roshetta",
                showCosts,
                language,
              })
            }
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-[14px] shadow-sm hover:bg-emerald-700 transition-colors"
          >
            ⬇ {isEn ? "Export Excel Valuation" : "تصدير Excel وتقييم المخزون"}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[13px] font-bold text-ink-soft">{isEn ? "Active SKUs" : "الأصناف الفعالة"}</div>
            <div className="text-[24px] font-bold text-primary mt-1">{kpis.totalSkus}</div>
            <div className="text-[12.5px] text-ink-soft font-semibold mt-0.5">{kpis.totalBoxesTotal} {isEn ? "Total Boxes" : "علبة متوفرة"}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[13px] font-bold text-ink-soft">{isEn ? "Low / Out of Stock" : "نواقص / نافد"}</div>
            <div className="text-[24px] font-bold text-coral mt-1">
              {kpis.lowStockCount} <span className="text-[14px] font-bold text-ink-soft">/ {kpis.outOfStockCount}</span>
            </div>
            <div className="text-[12.5px] text-ink-soft font-semibold mt-0.5">{isEn ? "Alert in Boxes" : "تنبيه بالحد الأدنى للعلب"}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[13px] font-bold text-ink-soft">{isEn ? "Expiring (<=60d) / Expired" : "قريب الانتهاء / منتهي"}</div>
            <div className="text-[24px] font-bold text-amber mt-1">
              {kpis.expiringWarningCount} <span className="text-[14px] font-bold text-coral">/ {kpis.expiredCount}</span>
            </div>
            <div className="text-[12.5px] text-ink-soft font-semibold mt-0.5">{kpis.expiringCriticalCount} {isEn ? "Critical (<=30d)" : "حرج (<=30 يوم)"}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[13px] font-bold text-ink-soft">{isEn ? "Retail Value" : "القيمة البيعية للمخزون"}</div>
            <div className="text-[22px] font-bold text-primary font-mono mt-1">{kpis.totalRetailValue.toFixed(2)} ₪</div>
            <div className="text-[12.5px] text-ink-soft font-semibold mt-0.5">{isEn ? "Active FEFO Stock" : "مخزون قابل للبيع"}</div>
          </div>
          {showCosts && (
            <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
              <div className="text-[13px] font-bold text-ink-soft">{isEn ? "Cost Value & Margin" : "قيمة التكلفة والربح المتوقع"}</div>
              <div className="text-[22px] font-bold text-emerald-700 font-mono mt-1">{kpis.totalCostValue.toFixed(2)} ₪</div>
              <div className="text-[12.5px] font-bold text-emerald-700 mt-0.5">+{kpis.potentialProfit.toFixed(2)} ₪</div>
            </div>
          )}
        </div>

        {/* Search + Branch Filter */}
        <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[240px] [&>div]:mb-0">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={isEn ? "Search trade name, scientific name, barcode, sub-unit..." : "ابحث بالاسم التجاري، العلمي، المصنع، أو باركود العلبة/الشريط..."}
              />
            </div>
            {(!user?.branch || ["manager", "owner"].includes(String(user?.role || "").toLowerCase())) && activeBranches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-bg/70 border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-ink outline-none"
              >
                <option value="all">{isEn ? "All Branches" : "كافة الفروع"}</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg/70 text-ink-soft hover:bg-primary-pale hover:text-primary"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${active ? "bg-white/20 text-white" : "bg-white text-ink"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center font-bold text-[15px] text-ink-soft">{isEn ? "Loading inventory..." : "جاري تحميل المخزون..."}</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center font-bold text-[15px] text-ink-soft">
              {isEn ? "No matching items found." : "لا توجد أصناف مطابقة للفلتر أو البحث الحالي."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] border-collapse">
                <thead>
                  <tr className="bg-bg/80 text-ink-soft text-[13.5px] font-bold border-b border-mint-line">
                    <th className="p-4 text-start">{isEn ? "Medicine" : "الصنف الدوائي"}</th>
                    <th className="p-4 text-center">{isEn ? "Stock" : "الرصيد (FEFO)"}</th>
                    <th className="p-4 text-center">{isEn ? "Sell / Cost" : showCosts ? "السعر / التكلفة" : "سعر البيع"}</th>
                    <th className="p-4 text-center">{isEn ? "Nearest Expiry" : "أقرب صلاحية"}</th>
                    <th className="p-4 text-center">{isEn ? "Branch" : "الفرع"}</th>
                    <th className="p-4 text-end">{isEn ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const st = computeStockStatus(item);
                    const { primary, secondary } = parseMedicineName(item.name, isEn);
                    const expSt = st.expiryStatus;
                    const expiryBadge =
                      expSt.status === "expired"
                        ? "bg-coral-pale text-coral"
                        : expSt.status === "critical"
                          ? "bg-coral-pale text-coral"
                          : expSt.status === "warning"
                            ? "bg-amber-pale text-amber"
                            : "bg-bg text-ink-soft";

                    return (
                      <tr key={item.id} className="border-b border-mint-line hover:bg-primary-pale/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink text-[16px] leading-snug">{primary || item.name}</span>
                            {[true, 1, "1"].includes(item.isControlled as any) && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-pale text-amber text-[12px] font-bold">
                                {isEn ? "Controlled" : "مراقب"}
                              </span>
                            )}
                          </div>
                          {(secondary || item.scientificName) && (
                            <div className="text-[13px] text-ink-soft font-medium mt-0.5 leading-snug">
                              {secondary} {secondary && item.scientificName ? "·" : ""} {item.scientificName}
                            </div>
                          )}
                          <div className="text-[12.5px] text-ink-soft font-mono mt-1 flex gap-2 flex-wrap">
                            {item.barcode && <span>#{item.barcode}</span>}
                            {item.category && <span className="font-sans font-medium">· {item.category}</span>}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <div
                            className={`inline-block px-3.5 py-1.5 rounded-xl font-bold text-[13.5px] ${
                              st.isOutOfStock
                                ? "bg-coral-pale text-coral"
                                : st.isLowStock
                                  ? "bg-amber-pale text-amber"
                                  : "bg-primary-pale text-primary"
                            }`}
                          >
                            {formatQtyWithUnits(item, item.units, language)}
                          </div>
                          <div className="text-[12px] text-ink-soft font-semibold mt-1.5">
                            {isEn ? `Min: ${st.minQtyBoxes} Box` : `حد التنبيه: ${st.minQtyBoxes} علبة`}
                            {st.batchCount > 1 ? ` · ${st.batchCount} ${isEn ? "batches" : "دفعات"}` : ""}
                          </div>
                        </td>

                        <td className="p-4 text-center font-mono">
                          <div className="font-bold text-primary text-[16px]">{Number(item.price || 0).toFixed(2)} ₪</div>
                          {showCosts && (
                            <div className="text-[13px] text-ink-soft font-semibold mt-0.5">
                              {isEn ? "Cost:" : "تكلفة:"} {Number(item.cost || 0).toFixed(2)} ₪
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {st.nearestExpiry ? (
                            <span className={`inline-block px-3 py-1 rounded-lg font-mono text-[13px] font-bold ${expiryBadge}`}>
                              {st.nearestExpiry}
                              {expSt.daysLeft !== null && expSt.daysLeft <= 60 ? ` (${expSt.daysLeft}d)` : ""}
                            </span>
                          ) : (
                            <span className="text-ink-soft text-[14px]">—</span>
                          )}
                        </td>

                        <td className="p-4 text-center text-[13.5px] font-bold text-ink">
                          {resolveBranchName(branches, item.branch_id, item.branchName, language)}
                        </td>

                        <td className="p-4 text-end">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              onClick={() => setMovementsItem(item)}
                              title={isEn ? "Stock Card Ledger" : "كارت الصنف"}
                              className="px-3 py-2 rounded-xl bg-bg text-primary text-[13px] font-bold hover:bg-primary hover:text-white transition-colors"
                            >
                              📒 {isEn ? "Card" : "كارت"}
                            </button>
                            <button
                              onClick={() => setBarcodeItem(item)}
                              title={isEn ? "Print Barcode Labels" : "طباعة باركود"}
                              className="px-3 py-2 rounded-xl bg-bg text-ink text-[13px] font-bold hover:bg-mint-line"
                            >
                              🏷
                            </button>
                            {canEdit && filterTab !== "archived" && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingItem(item);
                                    setFormModalOpen(true);
                                  }}
                                  className="px-3 py-2 rounded-xl bg-primary-pale text-primary text-[13px] font-bold hover:bg-primary hover:text-white"
                                >
                                  ✏ {isEn ? "Edit" : "تعديل"}
                                </button>
                                <button
                                  onClick={() => setSplitItem(item)}
                                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-bold hover:bg-emerald-600 hover:text-white"
                                >
                                  + {isEn ? "Batch" : "دفعة"}
                                </button>
                                <button
                                  onClick={() => setWasteItem(item)}
                                  className="px-3 py-2 rounded-xl bg-amber-pale/70 text-ink text-[13px] font-bold hover:bg-amber hover:text-white"
                                >
                                  {isEn ? "Waste" : "تالف"}
                                </button>
                                <button
                                  onClick={() => handleDeleteOrArchive(item)}
                                  className="px-3 py-2 rounded-xl bg-coral-pale text-coral text-[13px] font-bold hover:bg-coral hover:text-white"
                                >
                                  🗑
                                </button>
                              </>
                            )}
                            {canEdit && filterTab === "archived" && (
                              <button
                                onClick={() => handleRestore(item)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-[13px] font-bold"
                              >
                                ↩ {isEn ? "Restore" : "استعادة"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unified Modals */}
      <InventoryFormModal
        mode="modal"
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingItem(null);
        }}
        onSaved={() => mutate()}
        editingItem={editingItem}
        pharmacyId={user.pharmacy_id}
        userRole={user.role}
        userBranch={user.branch}
        branches={branches}
        defaultBranchFilter={branchFilter}
        language={language}
      />

      <SplitBatchModal
        item={splitItem}
        pharmacyId={user.pharmacy_id}
        userRole={user.role}
        language={language}
        onClose={() => setSplitItem(null)}
      />

      <WasteAdjustmentModal
        item={wasteItem}
        pharmacyId={user.pharmacy_id}
        userName={user.managerName || user.name}
        userRole={user.role}
        language={language}
        onClose={() => setWasteItem(null)}
      />

      <StockMovementsModal
        item={movementsItem}
        pharmacyId={user.pharmacy_id}
        language={language}
        onClose={() => setMovementsItem(null)}
      />

      <BarcodeLabelModal
        item={barcodeItem}
        language={language}
        onClose={() => setBarcodeItem(null)}
      />

      <ControlledRegisterModal
        isOpen={controlledOpen}
        pharmacyId={user.pharmacy_id}
        language={language}
        onClose={() => setControlledOpen(false)}
      />

      <MasterCatalogModal
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        inventory={allItems}
        pharmacyId={user.pharmacy_id}
        branches={activeBranches}
        currentBranchId={branchFilter}
        onItemAdded={() => mutate()}
      />
    </main>
  );
}
