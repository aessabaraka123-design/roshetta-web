"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function parsePharmaceuticalExpiry(
  dateStr: string | null | undefined,
): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!s) return null;

  // Standard ISO or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // MM-YYYY or MM/YYYY (e.g. 11-2026 or 11/2026) -> end of month
  const mmyyyy = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (mmyyyy) {
    const month = parseInt(mmyyyy[1], 10);
    const year = parseInt(mmyyyy[2], 10);
    if (month >= 1 && month <= 12) {
      return new Date(year, month, 0, 23, 59, 59);
    }
  }

  // YYYY-MM or YYYY/MM (e.g. 2026-11 or 2026/11) -> end of month
  const yyyymm = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (yyyymm) {
    const year = parseInt(yyyymm[1], 10);
    const month = parseInt(yyyymm[2], 10);
    if (month >= 1 && month <= 12) {
      return new Date(year, month, 0, 23, 59, 59);
    }
  }

  // MM/YY or MM-YY (e.g. 12/26 or 11-26) -> end of month
  const mmyy = s.match(/^(\d{1,2})[-/](\d{2})$/);
  if (mmyy) {
    const month = parseInt(mmyy[1], 10);
    let year = parseInt(mmyy[2], 10);
    year += year < 70 ? 2000 : 1900;
    if (month >= 1 && month <= 12) {
      return new Date(year, month, 0, 23, 59, 59);
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY (e.g. 15/11/2026)
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day, 23, 59, 59);
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

const getDaysUntilExpiry = (expiryDate: string | null | undefined): number | null => {
  const expiry = parsePharmaceuticalExpiry(expiryDate);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getExpiryStyle = (days: number | null) => {
  if (days === null || isNaN(days))
    return {
      row: "bg-white",
      badge: "bg-gray-100 text-gray-500",
      labelAr: "غير محدد",
      labelEn: "Not Set",
    };
  if (days < 0)
    return {
      row: "bg-red-50",
      badge: "bg-red-200 text-red-800 font-bold",
      labelAr: "منتهي الصلاحية",
      labelEn: "Expired",
    };
  if (days <= 30)
    return {
      row: "bg-coral-pale/20",
      badge: "bg-coral-pale text-coral font-bold",
      labelAr: days === 0 ? "ينتهي اليوم" : `${days} يوم`,
      labelEn: days === 0 ? "Expires today" : `${days} days`,
    };
  if (days <= 60)
    return {
      row: "bg-amber-pale/20",
      badge: "bg-amber-pale text-[#B9791C] font-bold",
      labelAr: `${days} يوم`,
      labelEn: `${days} days`,
    };
  return {
    row: "bg-white",
    badge: "bg-teal-pale text-teal font-bold",
    labelAr: `${days} يوم`,
    labelEn: `${days} days`,
  };
};

export default function BatchesPage() {
  const user = useStore((s: any) => s.user);
  const language = useStore((s: any) => s.language);
  const router = useRouter();
  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterExpiring, setFilterExpiring] = useState<
    "all" | "expiring" | "expired" | "no_expiry"
  >("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<any[]>([]);
  const [newBatchBranchId, setNewBatchBranchId] = useState("");
  const [newBatch, setNewBatch] = useState({
    drug_id: "",
    drug_name: "",
    batch_number: "",
    expiry_date: "",
    qty: "",
    purchase_price: "",
  });
  const [inventorySearch, setInventorySearch] = useState("");
  const [showInvDropdown, setShowInvDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch branches for this pharmacy
  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/branches`,
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
          setBranches(data.branches);
        } else {
          // Fallback to dashboard
          const res2 = await fetch(
            `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`,
          );
          const data2 = await res2.json();
          if (data2.success && Array.isArray(data2.branches)) {
            setBranches(data2.branches);
          }
        }
      } catch (err) {}
    }
    fetchBranches();
  }, [user?.pharmacy_id]);

  // If user is locked to a specific branch (pharmacist / branch manager), default to that branch
  useEffect(() => {
    if (
      branches.length > 0 &&
      user?.branch &&
      user.branch !== "all" &&
      user.branch !== "كل الفروع"
    ) {
      const match = branches.find(
        (b: any) =>
          b.name?.trim() === user.branch?.trim() || b.id === user.branch,
      );
      if (match && branchFilter === "all") {
        setBranchFilter(match.id);
      }
    }
  }, [branches, user?.branch]);

  const branchMap = useMemo(() => {
    const map: Record<string, string> = {};
    branches.forEach((b: any) => {
      if (b.id) map[b.id] = b.name;
    });
    return map;
  }, [branches]);

  const activeBranchParam =
    branchFilter !== "all" ? `?branch_id=${branchFilter}` : "";

  const { data: batchData, mutate: mutateBatches } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/batches${activeBranchParam}`
      : null,
    fetcher,
  );
  const { data: inventoryData, mutate: mutateInventory } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory${activeBranchParam}`
      : null,
    fetcher,
  );

  const rawBatches = Array.isArray(batchData?.batches) ? batchData.batches : [];
  const inventoryList: any[] = useMemo(() => {
    if (Array.isArray(inventoryData?.inventory)) return inventoryData.inventory.filter((i: any) => !i.archived_at);
    if (Array.isArray(inventoryData?.drugs)) return inventoryData.drugs.filter((i: any) => !i.archived_at);
    return [];
  }, [inventoryData]);

  // Aggregate explicit batches with pharmacy inventory items having expiry/stock
  const batches = useMemo(() => {
    const list: any[] = [];
    const explicitDrugIds = new Set(
      rawBatches.map((b: any) => String(b.drug_id || "")),
    );

    // 1. Explicit batches from batches table
    rawBatches.forEach((b: any) => {
      const matchedInv = inventoryList.find(
        (inv: any) => String(inv.id) === String(b.drug_id),
      );
      const itemBranchId = b.branch_id || matchedInv?.branch_id || "";
      if (
        branchFilter !== "all" &&
        itemBranchId &&
        String(itemBranchId) !== String(branchFilter)
      ) {
        return;
      }
      list.push({
        ...b,
        isInventory: false,
        branch_id: itemBranchId,
        branch_name: branchMap[itemBranchId] || b.branch_name || "",
        hasNoExpiry: false,
      });
    });

    // 2. Inventory items
    inventoryList.forEach((inv: any) => {
      if (!inv || !inv.id) return;
      if (explicitDrugIds.has(String(inv.id))) return;

      // Filter by branch if specific branch selected
      if (
        branchFilter !== "all" &&
        inv.branch_id &&
        String(inv.branch_id) !== String(branchFilter)
      ) {
        return;
      }

      const hasExpiry = Boolean(inv.expiry && String(inv.expiry).trim());
      const hasBatchNo = Boolean(
        inv.batch_number && String(inv.batch_number).trim(),
      );

      if (hasExpiry || hasBatchNo) {
        list.push({
          id: `inv-${inv.id}`,
          pharmacy_id: inv.pharmacy_id,
          branch_id: inv.branch_id || "",
          branch_name: branchMap[inv.branch_id] || "",
          drug_id: inv.id,
          drug_name: inv.name || "—",
          batch_number: inv.batch_number || inv.barcode || "—",
          expiry_date: inv.expiry || "",
          qty: inv.qty ?? 0,
          purchase_price: Number(inv.cost || inv.price_buy || 0),
          isInventory: true,
          barcode: inv.barcode || "",
          hasNoExpiry: false,
        });
      } else if (Number(inv.qty) > 0) {
        // Items with physical stock but no expiry date recorded yet
        list.push({
          id: `inv-${inv.id}`,
          pharmacy_id: inv.pharmacy_id,
          branch_id: inv.branch_id || "",
          branch_name: branchMap[inv.branch_id] || "",
          drug_id: inv.id,
          drug_name: inv.name || "—",
          batch_number: inv.batch_number || inv.barcode || "—",
          expiry_date: "",
          qty: inv.qty ?? 0,
          purchase_price: Number(inv.cost || inv.price_buy || 0),
          isInventory: true,
          barcode: inv.barcode || "",
          hasNoExpiry: true,
        });
      }
    });

    // Sort: earliest expiring first, then items with no expiry
    list.sort((a, b) => {
      const daysA = getDaysUntilExpiry(a.expiry_date);
      const daysB = getDaysUntilExpiry(b.expiry_date);
      if (daysA === null && daysB === null) return 0;
      if (daysA === null) return 1;
      if (daysB === null) return -1;
      return daysA - daysB;
    });

    return list;
  }, [rawBatches, inventoryList, branchFilter, branchMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b: any) => {
      const days = getDaysUntilExpiry(b.expiry_date);
      const matchSearch =
        !q ||
        b.drug_name?.toLowerCase().includes(q) ||
        b.batch_number?.toLowerCase().includes(q) ||
        b.barcode?.toLowerCase().includes(q);

      let matchFilter = true;
      if (filterExpiring === "all") {
        matchFilter = !b.hasNoExpiry;
      } else if (filterExpiring === "expiring") {
        matchFilter =
          !b.hasNoExpiry && days !== null && days >= 0 && days <= 60;
      } else if (filterExpiring === "expired") {
        matchFilter = !b.hasNoExpiry && days !== null && days < 0;
      } else if (filterExpiring === "no_expiry") {
        matchFilter = b.hasNoExpiry === true;
      }

      return matchSearch && matchFilter;
    });
  }, [batches, search, filterExpiring]);

  const totalBatchesCount = useMemo(() => {
    return batches.filter((b: any) => !b.hasNoExpiry).length;
  }, [batches]);

  const expiredCount = useMemo(() => {
    return batches.filter((b: any) => {
      if (b.hasNoExpiry) return false;
      const days = getDaysUntilExpiry(b.expiry_date);
      return days !== null && days < 0;
    }).length;
  }, [batches]);

  const expiringCount = useMemo(() => {
    return batches.filter((b: any) => {
      if (b.hasNoExpiry) return false;
      const d = getDaysUntilExpiry(b.expiry_date);
      return d !== null && d >= 0 && d <= 60;
    }).length;
  }, [batches]);

  const noExpiryCount = useMemo(() => {
    return batches.filter((b: any) => b.hasNoExpiry).length;
  }, [batches]);

  const handleAddBatch = async () => {
    if (!newBatch.drug_id || !newBatch.expiry_date || !newBatch.qty) {
      toast.error(
        language === "en"
          ? "Please enter mandatory batch data"
          : "يرجى إدخال بيانات الدفعة الإلزامية",
      );
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/batches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newBatch,
            qty: parseInt(newBatch.qty, 10),
            purchase_price: parseFloat(newBatch.purchase_price) || 0,
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(
          language === "en"
            ? "Batch added and inventory updated!"
            : "تمت إضافة الدفعة وتحديث المخزون!",
        );
        setShowAddModal(false);
        setNewBatch({
          drug_id: "",
          drug_name: "",
          batch_number: "",
          expiry_date: "",
          qty: "",
          purchase_price: "",
        });
        setInventorySearch("");
        mutateBatches();
        mutateInventory();
      } else {
        toast.error(
          result.error || (language === "en" ? "Add failed" : "فشل الإضافة"),
        );
      }
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const [batchToDelete, setBatchToDelete] = useState<any | null>(null);

  const handleDelete = async () => {
    if (!batchToDelete) return;
    setIsLoading(true);
    try {
      if (batchToDelete.isInventory) {
        const res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/inventory/${batchToDelete.drug_id}`,
          { method: "DELETE" },
        );
        const result = await res.json();
        if (result.success) {
          toast.success(
            language === "en"
              ? "Item removed from inventory"
              : "تم حذف الصنف من المخزون",
          );
          mutateInventory();
          mutateBatches();
        } else {
          toast.error(
            result.error || (language === "en" ? "Delete failed" : "فشل الحذف"),
          );
        }
      } else {
        const res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/batches/${batchToDelete.id}`,
          { method: "DELETE" },
        );
        const result = await res.json();
        if (result.success) {
          toast.success(language === "en" ? "Deleted" : "تم الحذف");
          mutateBatches();
          mutateInventory();
        } else {
          toast.error(
            result.error || (language === "en" ? "Delete failed" : "فشل الحذف"),
          );
        }
      }
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
      setBatchToDelete(null);
    }
  };

  const targetBranch =
    newBatchBranchId ||
    (branchFilter !== "all" ? branchFilter : branches[0]?.id || "");

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    let list = inventoryList;
    if (targetBranch && targetBranch !== "all") {
      list = list.filter(
        (d: any) =>
          !d.branch_id || String(d.branch_id) === String(targetBranch),
      );
    }
    if (!q) return list.slice(0, 10);
    return list
      .filter((d: any) =>
        d.name?.toLowerCase().includes(q) || d.barcode?.includes(q),
      )
      .slice(0, 10);
  }, [inventoryList, inventorySearch, targetBranch]);

  return (
    <>
      <AppBar title={language === "en" ? "Expiry Batches" : "دفعات الصلاحيات"} />
      <div className="p-2 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div
            className="bg-white rounded-xl sm:rounded-2xl border border-mint-line p-2.5 sm:p-5 text-center shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setFilterExpiring("all")}
          >
            <div className="text-[10px] sm:text-[12px] font-bold text-ink-soft mb-1 truncate">
              {language === "en" ? "Total Batches" : "إجمالي الدفعات"}
            </div>
            <div className="text-[20px] sm:text-[32px] font-mono font-black text-primary">
              {totalBatchesCount}
            </div>
          </div>
          <div
            className="bg-amber-pale/30 rounded-xl sm:rounded-2xl border border-amber-pale p-2.5 sm:p-5 text-center shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setFilterExpiring("expiring")}
          >
            <div className="text-[10px] sm:text-[12px] font-bold text-[#B9791C] mb-1 truncate">
              {language === "en" ? "⚠️ Expiring (60d)" : "⚠️ تنتهي خلال 60 يوم"}
            </div>
            <div className="text-[20px] sm:text-[32px] font-mono font-black text-[#B9791C]">
              {expiringCount}
            </div>
          </div>
          <div
            className="bg-red-50 rounded-xl sm:rounded-2xl border border-red-200 p-2.5 sm:p-5 text-center shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setFilterExpiring("expired")}
          >
            <div className="text-[10px] sm:text-[12px] font-bold text-red-600 mb-1 truncate">
              {language === "en" ? "🚫 Expired" : "🚫 منتهية الصلاحية"}
            </div>
            <div className="text-[20px] sm:text-[32px] font-mono font-black text-red-600">
              {expiredCount}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center">
          <input
            type="text"
            placeholder={
              language === "en"
                ? "Search by drug name or batch..."
                : "ابحث باسم الدواء أو رقم الدفعة..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-mint-line rounded-xl px-4 py-2.5 sm:py-3 text-[14px] outline-none focus:border-teal shadow-sm"
          />

          <div className="flex items-center justify-between lg:justify-end gap-2 flex-wrap sm:flex-nowrap">
            {/* Branch Filter Dropdown */}
            {branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-mint-line px-3 py-2 sm:py-2.5 rounded-xl text-[13px] font-bold text-ink shadow-sm shrink-0">
                <span className="text-primary text-[14px]">🏢</span>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="bg-transparent font-bold text-[13px] text-ink outline-none cursor-pointer"
                >
                  <option value="all">
                    {language === "en" ? "All Branches" : "كل الفروع"}
                  </option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-mint-line shrink-0 overflow-x-auto">
              {[
                { id: "all", ar: "الكل", en: "All", count: totalBatchesCount },
                {
                  id: "expiring",
                  ar: "تنتهي قريباً",
                  en: "Expiring",
                  count: expiringCount,
                },
                {
                  id: "expired",
                  ar: "منتهية",
                  en: "Expired",
                  count: expiredCount,
                },
                {
                  id: "no_expiry",
                  ar: "بدون تاريخ",
                  en: "No Expiry",
                  count: noExpiryCount,
                },
              ].map((f: any) => (
                <button
                  key={f.id}
                  onClick={() => setFilterExpiring(f.id)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    filterExpiring === f.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-ink-soft hover:text-primary"
                  }`}
                >
                  <span>{language === "en" ? f.en : f.ar}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      filterExpiring === f.id
                        ? "bg-white/20 text-white"
                        : "bg-mint-line/60 text-ink-soft"
                    }`}
                  >
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setNewBatchBranchId(
                  branchFilter !== "all" ? branchFilter : branches[0]?.id || "",
                );
                setShowAddModal(true);
              }}
              className="bg-primary text-white px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl font-bold text-[13px] sm:text-[14px] shadow-md shadow-primary/20 hover:opacity-90 whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{language === "en" ? "Add Batch" : "إضافة دفعة"}</span>
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center shadow-sm">
            <div className="text-[40px] mb-3">📦</div>
            <div className="text-ink-soft font-bold">{language === "en" ? "No matching batches" : "لا توجد دفعات مطابقة"}</div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filtered.map((batch: any) => {
                const days = getDaysUntilExpiry(batch.expiry_date);
                const s = getExpiryStyle(days);
                return (
                  <div
                    key={batch.id}
                    className={`bg-white rounded-2xl border border-mint-line p-3.5 shadow-sm transition-all ${s.row}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="font-bold text-[14px] text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{batch.drug_name}</span>
                        {batch.branch_name && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                            🏢 {batch.branch_name}
                          </span>
                        )}
                        {batch.isInventory ? (
                          <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                            {language === "en" ? "Inventory" : "مخزون أساسي"}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                            {language === "en" ? "Batch" : "دفعة واردة"}
                          </span>
                        )}
                        {batch.hasNoExpiry && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                            {language === "en" ? "No Expiry" : "بدون صلاحية"}
                          </span>
                        )}
                        {batch.drug_name?.includes("(القديم)") && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                            {language === "en" ? "Old" : "القديم"}
                          </span>
                        )}
                        {batch.drug_name?.includes("(الجديد)") && (
                          <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold border border-teal-300">
                            {language === "en" ? "New" : "الجديد"}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 ${s.badge}`}>
                        {language === "en" ? s.labelEn : s.labelAr}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-mint-line/40 text-[12px]">
                      <div>
                        <span className="text-ink-soft block text-[10px]">{language === "en" ? "Batch No" : "رقم الدفعة"}</span>
                        <span className="font-mono font-bold text-ink">{batch.batch_number || "—"}</span>
                      </div>
                      <div>
                        <span className="text-ink-soft block text-[10px]">{language === "en" ? "Quantity" : "الكمية"}</span>
                        <span className="font-mono font-black text-primary text-[13px]">{batch.qty}</span>
                      </div>
                      <div>
                        <span className="text-ink-soft block text-[10px]">{language === "en" ? "Purchase Price" : "سعر الشراء"}</span>
                        <span className="font-mono font-bold text-ink">₪{(batch.purchase_price || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-[11px] text-ink-soft">
                      <div>
                        <span>{language === "en" ? "Expiry: " : "الصلاحية: "}</span>
                        <span className="font-mono font-bold text-ink">{batch.expiry_date || "—"}</span>
                      </div>
                      <button
                        onClick={() => setBatchToDelete(batch)}
                        className="text-coral hover:text-red-600 p-1 rounded-lg hover:bg-coral/10 transition-colors flex items-center gap-1 text-[12px] font-bold"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>{language === "en" ? "Delete" : "حذف"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-mint-line overflow-x-auto shadow-sm">
              <table className="w-full text-start min-w-[650px]">
                <thead className="bg-bg border-b border-mint-line">
                  <tr>
                    {[
                      language === "en" ? "Drug" : "الدواء",
                      language === "en" ? "Batch Number" : "رقم الدفعة",
                      language === "en" ? "Quantity" : "الكمية",
                      language === "en" ? "Expiry Date" : "تاريخ الصلاحية",
                      language === "en" ? "Time Left" : "الوقت المتبقي",
                      language === "en" ? "Purchase Price" : "سعر الشراء",
                      "",
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-[13px] font-bold text-ink-soft text-start"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line">
                  {filtered.map((batch: any) => {
                    const days = getDaysUntilExpiry(batch.expiry_date);
                    const s = getExpiryStyle(days);
                    return (
                      <tr
                        key={batch.id}
                        className={`${s.row} hover:brightness-95 transition-all`}
                      >
                        <td className="px-4 py-3 font-bold text-[14px] text-ink">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{batch.drug_name}</span>
                            {batch.branch_name && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                                🏢 {batch.branch_name}
                              </span>
                            )}
                            {batch.isInventory ? (
                              <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-bold border border-sky-200">
                                {language === "en" ? "Inventory" : "مخزون أساسي"}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200">
                                {language === "en" ? "Batch" : "دفعة واردة"}
                              </span>
                            )}
                            {batch.hasNoExpiry && (
                              <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                {language === "en" ? "No Expiry" : "بدون صلاحية"}
                              </span>
                            )}
                            {batch.drug_name?.includes("(القديم)") && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                {language === "en" ? "Old" : "القديم"}
                              </span>
                            )}
                            {batch.drug_name?.includes("(الجديد)") && (
                              <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold border border-teal-300">
                                {language === "en" ? "New" : "الجديد"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-ink-soft">
                          {batch.batch_number || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-[14px] text-primary">
                          {batch.qty}
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-ink">
                          {batch.expiry_date || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-lg text-[12px] font-bold ${s.badge}`}
                          >
                            {language === "en" ? s.labelEn : s.labelAr}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-ink-soft">
                          ₪{(batch.purchase_price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setBatchToDelete(batch)}
                            className="text-coral hover:text-red-600 p-1 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                {language === "en" ? "Add New Batch" : "إضافة دفعة جديدة"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-bg rounded-full text-ink-soft hover:text-coral transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {branches.length > 0 && (
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Branch *" : "الفرع المستهدف *"}
                  </label>
                  <select
                    value={targetBranch}
                    onChange={(e) => {
                      setNewBatchBranchId(e.target.value);
                      setNewBatch((p) => ({ ...p, drug_id: "", drug_name: "" }));
                      setInventorySearch("");
                    }}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary font-bold text-ink"
                  >
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="relative">
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === "en" ? "Drug *" : "الدواء *"}
                </label>
                <input
                  type="text"
                  placeholder={language === "en" ? "Search for drug..." : "ابحث عن الدواء..."}
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setShowInvDropdown(true);
                  }}
                  onFocus={() => setShowInvDropdown(true)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
                {newBatch.drug_name && (
                  <div className="mt-1 text-[12px] text-teal font-bold">
                    ✓ {newBatch.drug_name}
                  </div>
                )}
                {showInvDropdown && inventorySearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mint-line rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                    {filteredInventory.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setNewBatch((p) => ({
                            ...p,
                            drug_id: d.id,
                            drug_name: d.name,
                            purchase_price:
                              d.cost !== undefined && d.cost !== null
                                ? String(d.cost)
                                : p.purchase_price,
                            expiry_date: d.expiry || p.expiry_date,
                          }));
                          setInventorySearch(d.name);
                          setShowInvDropdown(false);
                        }}
                        className="p-3 hover:bg-bg cursor-pointer border-b border-mint-line last:border-0 text-[14px] flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-ink">{d.name}</div>
                          {d.barcode && (
                            <div className="text-[11px] font-mono text-ink-soft">
                              {d.barcode}
                            </div>
                          )}
                        </div>
                        <div className="text-end text-[12px] text-ink-soft">
                          <div>
                            {language === "en" ? "Stock: " : "المخزون: "}
                            <span className="font-bold text-primary">
                              {d.qty ?? 0}
                            </span>
                          </div>
                          {d.cost !== undefined && (
                            <div>₪{Number(d.cost).toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredInventory.length === 0 && (
                      <div className="p-3 text-ink-soft text-[13px] text-center">
                        {language === "en" ? "No results" : "لا توجد نتائج"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Batch Number" : "رقم الدفعة"}
                  </label>
                  <input
                    type="text"
                    value={newBatch.batch_number}
                    onChange={(e) =>
                      setNewBatch((p) => ({
                        ...p,
                        batch_number: e.target.value,
                      }))
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                    placeholder={language === "en" ? "Optional" : "اختياري"}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Quantity *" : "الكمية *"}
                  </label>
                  <input
                    type="number"
                    value={newBatch.qty}
                    onChange={(e) =>
                      setNewBatch((p) => ({ ...p, qty: e.target.value }))
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Expiry Date *" : "تاريخ الصلاحية *"}
                  </label>
                  <input
                    type="date"
                    value={newBatch.expiry_date}
                    onChange={(e) =>
                      setNewBatch((p) => ({
                        ...p,
                        expiry_date: e.target.value,
                      }))
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Purchase Price (₪)" : "سعر الشراء (₪)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatch.purchase_price}
                    onChange={(e) =>
                      setNewBatch((p) => ({
                        ...p,
                        purchase_price: e.target.value,
                      }))
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddBatch}
                disabled={isLoading}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (language === "en" ? "Adding..." : "جاري الإضافة...") : (language === "en" ? "Add Batch" : "إضافة الدفعة")}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
          {showInvDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowInvDropdown(false)}
            />
          )}
        </div>
      )}

      {batchToDelete && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line text-center">
            <div className="w-16 h-16 bg-coral/10 text-coral rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-[20px] font-black text-ink mb-1">
              {language === "en" ? "Confirm Deletion" : "تأكيد الحذف"}
            </h3>
            <p className="text-[15px] font-bold text-primary mb-2">
              {batchToDelete.drug_name}
            </p>
            <p className="text-[13px] text-ink-soft font-medium mb-6">
              {batchToDelete.isInventory
                ? language === "en"
                  ? "Are you sure you want to delete this medicine and its batch from inventory?"
                  : "هل أنت متأكد من حذف هذا الصنف ودفعة صلاحيته من المخزون نهائياً؟"
                : language === "en"
                  ? "Are you sure? This batch will be deleted and its quantity deducted from inventory immediately."
                  : "هل أنت متأكد؟ سيتم حذف هذه الدفعة وخصم كميتها من المخزون فوراً."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 bg-coral text-white font-bold py-3 rounded-xl shadow-md shadow-coral/20 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading
                  ? language === "en"
                    ? "Deleting..."
                    : "جاري الحذف..."
                  : language === "en"
                    ? "Yes, delete"
                    : "نعم، احذف"}
              </button>
              <button
                onClick={() => setBatchToDelete(null)}
                className="flex-1 bg-bg text-ink font-bold py-3 rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "تراجع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
