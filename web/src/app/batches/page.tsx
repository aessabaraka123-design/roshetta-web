"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { SplitBatchModal } from "@/components/inventory/InventoryActionModals";
import {
  canManageInventory,
  canViewCosts,
  formatQtyWithUnits,
  getActiveBranches,
  normalizeSearchText,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import {
  deleteBatchItem,
  useBatchesData,
  useInventoryData,
  usePharmacyBranches,
} from "@/lib/inventory/api";
import { exportBatchesFefoExcel } from "@/lib/inventory/export";
import { useStore } from "@/store";

type BatchFilter = "all" | "expired" | "critical" | "expiring" | "ok";

export default function BatchesPage() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const [statusFilter, setStatusFilter] = useState<BatchFilter>("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pickItemForBatch, setPickItemForBatch] = useState<InventoryItemRecord | null>(null);
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  const canEdit = canManageInventory(user?.role);
  const showCosts = canViewCosts(user?.role);
  const { branches } = usePharmacyBranches(user?.pharmacy_id);
  const activeBranches = useMemo(() => getActiveBranches(branches), [branches]);
  const { inventory } = useInventoryData(user?.pharmacy_id);
  const { batches, isLoading, mutate } = useBatchesData(user?.pharmacy_id, { branchId: branchFilter });

  const stats = useMemo(() => {
    let total = 0;
    let expired = 0;
    let critical = 0;
    let warning = 0;
    for (const b of batches) {
      total += 1;
      if (b.expiryStatus?.isExpired) expired += 1;
      else if (b.expiryStatus?.isCritical) critical += 1;
      else if (b.expiryStatus?.isExpiringSoon) warning += 1;
    }
    return { total, expired, critical, warning };
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const q = normalizeSearchText(search);
    return batches.filter((b: any) => {
      if (statusFilter === "expired" && !b.expiryStatus?.isExpired) return false;
      if (statusFilter === "critical" && !b.expiryStatus?.isCritical) return false;
      if (statusFilter === "expiring" && !(b.expiryStatus?.isExpiringSoon || b.expiryStatus?.isCritical)) return false;
      if (statusFilter === "ok" && (b.expiryStatus?.isExpired || b.expiryStatus?.isExpiringSoon)) return false;
      if (!q) return true;
      return (
        normalizeSearchText(b.drug_name).includes(q) ||
        normalizeSearchText(b.scientificName).includes(q) ||
        normalizeSearchText(b.batch_number).includes(q) ||
        String(b.barcode || "").includes(search.trim())
      );
    });
  }, [batches, statusFilter, search]);

  const handleDeleteBatch = async (batch: any) => {
    if (!user?.pharmacy_id) return;
    const msg = isEn
      ? `Remove batch ${batch.batch_number || batch.id} (${formatQtyWithUnits({ qty: batch.qty, units: batch.units }, batch.units, language)})?`
      : `هل تريد حذف التشغيلة ${batch.batch_number || batch.id} وخصم كميتها من الرصيد؟`;
    if (!window.confirm(msg)) return;
    try {
      await deleteBatchItem(user.pharmacy_id, batch.id, language);
      toast.success(isEn ? "Batch removed cleanly" : "تم حذف الدفعة وتحديث الرصيد بنجاح");
      mutate();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed removing batch" : "تعذر حذف الدفعة"));
    }
  };

  if (!user) return null;

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "FEFO Batches & Expiry Monitor" : "التشغيلات والصلاحيات (FEFO)"} backHref="/inventory" />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canEdit && (
            <button
              onClick={() => setPickerModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-primary text-white font-black text-[13px] shadow-md hover:bg-primary-light"
            >
              + {isEn ? "Add Batch to Item" : "إضافة تشغيلة جديدة"}
            </button>
          )}
          <button
            onClick={() =>
              exportBatchesFefoExcel({
                batches: filteredBatches,
                pharmacyName: user?.pharmacyName || "Roshetta",
                showCosts,
                language,
              })
            }
            className="ms-auto px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-[13px] shadow-sm hover:bg-emerald-700"
          >
            ⬇ {isEn ? "Export Batches Excel" : "تصدير تقرير الصلاحيات Excel"}
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Active FEFO Batches" : "التشغيلات النشطة"}</div>
            <div className="text-[22px] font-black text-primary mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Expired" : "منتهية الصلاحية"}</div>
            <div className="text-[22px] font-black text-coral mt-0.5">{stats.expired}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Critical (<=30d)" : "حرجة (<=30 يوم)"}</div>
            <div className="text-[22px] font-black text-coral mt-0.5">{stats.critical}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-[11px] font-bold text-ink-soft">{isEn ? "Warning (<=60d)" : "تحذير (<=60 يوم)"}</div>
            <div className="text-[22px] font-black text-amber mt-0.5">{stats.warning}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[240px]">
              <SearchBar value={search} onChange={setSearch} placeholder={isEn ? "Search drug or batch #..." : "ابحث باسم الدواء، الباركود، أو رقم التشغيلة..."} />
            </div>
            {activeBranches.length > 0 && (
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="bg-bg/70 border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold">
                <option value="all">{isEn ? "All Branches" : "كافة الفروع"}</option>
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["all", isEn ? "All" : "الكل"],
              ["expired", isEn ? "Expired" : "منتهي"],
              ["critical", isEn ? "Critical (<=30d)" : "حرج (<=30 يوم)"],
              ["expiring", isEn ? "Expiring (<=60d)" : "قريب (<=60 يوم)"],
              ["ok", isEn ? "Valid" : "صالح"],
            ] as Array<[BatchFilter, string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-3.5 py-1.5 rounded-xl text-[12px] font-black ${
                  statusFilter === id ? "bg-primary text-white" : "bg-bg text-ink-soft hover:bg-primary-pale"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Batches Table */}
        <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center font-bold text-ink-soft">{isEn ? "Loading FEFO batches..." : "جاري تحميل التشغيلات..."}</div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-12 text-center font-bold text-ink-soft">{isEn ? "No matching batches found." : "لا توجد تشغيلات مطابقة."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-bg/80 text-ink-soft text-[12px] font-black border-b border-mint-line">
                    <th className="p-3.5 text-start">{isEn ? "Drug" : "الصنف الدوائي"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Batch #" : "التشغيلة"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Expiry (FEFO)" : "الصلاحية (FEFO)"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Remaining Stock" : "الرصيد المتاح"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Price" : showCosts ? "السعر / التكلفة" : "السعر"}</th>
                    {canEdit && <th className="p-3.5 text-end">{isEn ? "Action" : "إجراء"}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((b: any) => {
                    const est = b.expiryStatus || {};
                    const tone = est.isExpired || est.isCritical ? "bg-coral-pale text-coral" : est.isExpiringSoon ? "bg-amber-pale text-amber" : "bg-emerald-50 text-emerald-700";
                    return (
                      <tr key={`${b.drug_id}-${b.id}`} className="border-b border-mint-line hover:bg-primary-pale/30">
                        <td className="p-3.5">
                          <div className="font-black text-ink">{b.drug_name}</div>
                          {b.scientificName && <div className="text-[11px] text-ink-soft">{b.scientificName}</div>}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-ink-soft">{b.batch_number || "—"}</td>
                        <td className="p-3.5 text-center">
                          {b.expiry ? (
                            <span className={`inline-block px-2.5 py-1 rounded-lg font-mono text-[11px] font-black ${tone}`}>
                              {b.expiry} {est.daysLeft !== null ? `(${est.daysLeft}d)` : ""}
                            </span>
                          ) : (
                            <span className="text-ink-soft text-[11px]">{isEn ? "No expiry" : "بدون تاريخ"}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-primary">
                          {formatQtyWithUnits({ qty: b.qty, units: b.units }, b.units, language)}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          <div className="font-black text-primary">{Number(b.price || 0).toFixed(2)} ₪</div>
                          {showCosts && <div className="text-[11px] text-ink-soft">{Number(b.cost ?? b.purchase_price ?? 0).toFixed(2)} ₪</div>}
                        </td>
                        {canEdit && (
                          <td className="p-3.5 text-end">
                            <button onClick={() => handleDeleteBatch(b)} className="px-3 py-1.5 rounded-lg bg-coral-pale text-coral text-[11px] font-black hover:bg-coral hover:text-white">
                              🗑 {isEn ? "Remove" : "إزالة"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Item Picker for + Add Batch */}
      {pickerModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-lg max-h-[80vh] flex flex-col p-6 shadow-2xl border border-mint-line">
            <div className="flex items-center justify-between border-b border-mint-line pb-3 mb-3">
              <h3 className="text-[17px] font-black text-primary">{isEn ? "Select Item for New Batch" : "اختر الصنف لإضافة تشغيلة جديدة"}</h3>
              <button onClick={() => setPickerModalOpen(false)} className="w-8 h-8 rounded-full bg-bg font-bold">✕</button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {inventory.filter((i) => !i.archived_at).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPickerModalOpen(false);
                    setPickItemForBatch(item);
                  }}
                  className="w-full text-start p-3 rounded-xl border border-mint-line hover:bg-primary-pale flex justify-between items-center"
                >
                  <div>
                    <div className="font-black text-ink text-[13px]">{item.name}</div>
                    <div className="text-[11px] text-ink-soft">{formatQtyWithUnits(item, item.units, language)}</div>
                  </div>
                  <span className="text-primary font-black text-[12px]">+</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <SplitBatchModal
        item={pickItemForBatch}
        pharmacyId={user.pharmacy_id}
        userRole={user.role}
        language={language}
        onClose={() => {
          setPickItemForBatch(null);
          mutate();
        }}
      />
    </main>
  );
}
