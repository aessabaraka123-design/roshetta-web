"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const getDaysUntilExpiry = (expiryDate: string | null | undefined) => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getExpiryStyle = (days: number | null) => {
  if (days === null || isNaN(days)) return { row: "bg-white", badge: "bg-gray-100 text-gray-500", labelAr: "غير محدد", labelEn: "Not Set" };
  if (days !== null && days !== null && days < 0)
    return {
      row: "bg-red-50",
      badge: "bg-red-200 text-red-800",
      labelAr: "منتهي الصلاحية",
      labelEn: "Expired",
    };
  if (days <= 30)
    return {
      row: "bg-coral-pale/20",
      badge: "bg-coral-pale text-coral",
      labelAr: `${days} يوم`,
      labelEn: `${days} days`,
    };
  if (days <= 60)
    return {
      row: "bg-amber-pale/20",
      badge: "bg-amber-pale text-[#B9791C]",
      labelAr: `${days} يوم`,
      labelEn: `${days} days`,
    };
  return {
    row: "bg-white",
    badge: "bg-teal-pale text-teal",
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
    "all" | "expiring" | "expired"
  >("all");
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

  const { data: batchData, mutate } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/batches`
      : null,
    fetcher,
  );
  const { data: inventoryData } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory`
      : null,
    fetcher,
  );

  const batches = batchData?.batches || [];
  const inventory = inventoryData?.drugs || [];

  const filtered = batches.filter((b: any) => {
    const days = getDaysUntilExpiry(b.expiry_date);
    const matchSearch =
      !search ||
      b.drug_name?.includes(search) ||
      b.batch_number?.includes(search);
    const matchFilter =
      filterExpiring === "all"
        ? true
        : filterExpiring === "expired"
          ? days !== null && days < 0
          : days !== null && days !== null && days >= 0 && days <= 60;
    return matchSearch && matchFilter;
  });

  const expiredCount = batches.filter(
    (b: any) => getDaysUntilExpiry(b.expiry_date) < 0,
  ).length;
  const expiringCount = batches.filter((b: any) => {
    const d = getDaysUntilExpiry(b.expiry_date);
    return d >= 0 && d <= 60;
  }).length;

  const handleAddBatch = async () => {
    if (!newBatch.drug_id || !newBatch.expiry_date || !newBatch.qty) {
      toast.error(language === "en" ? "Please enter mandatory batch data" : "يرجى إدخال بيانات الدفعة الإلزامية");
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
            qty: parseInt(newBatch.qty),
            purchase_price: parseFloat(newBatch.purchase_price) || 0,
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(language === "en" ? "Batch added and inventory updated!" : "تمت إضافة الدفعة وتحديث المخزون!");
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
        mutate();
      } else toast.error(result.error || (language === "en" ? "Add failed" : "فشل الإضافة"));
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!batchToDelete) return;
    const res = await fetch(
      `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/batches/${batchToDelete}`,
      { method: "DELETE" },
    );
    const result = await res.json();
    if (result.success) {
      toast.success(language === "en" ? "Deleted" : "تم الحذف");
      mutate();
    } else toast.error(result.error);
    setBatchToDelete(null);
  };

  const filteredInventory = inventory
    .filter((d: any) => d.name?.includes(inventorySearch))
    .slice(0, 8);

  return (
    <>
      <AppBar title={language === "en" ? "Expiry Batches" : "دفعات الصلاحيات"} />
      <div className="p-2 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-mint-line p-2.5 sm:p-5 text-center shadow-sm">
            <div className="text-[10px] sm:text-[12px] font-bold text-ink-soft mb-1 truncate">
              {language === "en" ? "Total Batches" : "إجمالي الدفعات"}
            </div>
            <div className="text-[20px] sm:text-[32px] font-mono font-black text-primary">
              {batches.length}
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

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
          <input
            type="text"
            placeholder={language === "en" ? "Search by drug name or batch..." : "ابحث باسم الدواء أو رقم الدفعة..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-mint-line rounded-xl px-4 py-2.5 sm:py-3 text-[14px] outline-none focus:border-teal shadow-sm"
          />
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 bg-bg p-1 rounded-xl border border-mint-line shrink-0">
              {(["all", "expiring", "expired"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterExpiring(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    filterExpiring === f
                      ? "bg-primary text-white shadow-sm"
                      : "text-ink-soft hover:text-primary"
                  }`}
                >
                  {f === "all"
                    ? language === "en" ? "All" : "الكل"
                    : f === "expiring"
                      ? language === "en" ? "Expiring" : "تنتهي قريباً"
                      : language === "en" ? "Expired" : "منتهية"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
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
                        onClick={() => setBatchToDelete(batch.id)}
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
                            onClick={() => setBatchToDelete(batch.id)}
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mint-line rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredInventory.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setNewBatch((p) => ({
                            ...p,
                            drug_id: d.id,
                            drug_name: d.name,
                          }));
                          setInventorySearch(d.name);
                          setShowInvDropdown(false);
                        }}
                        className="p-3 hover:bg-bg cursor-pointer border-b border-mint-line last:border-0 text-[14px] font-semibold"
                      >
                        {d.name}
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
            <h3 className="text-[20px] font-black text-ink mb-2">
              {language === "en" ? "Confirm Deletion" : "تأكيد الحذف"}
            </h3>
            <p className="text-[14px] text-ink-soft font-bold mb-6">
              {language === "en" ? "Are you sure? This batch will be deleted and its quantity deducted from inventory immediately." : "هل أنت متأكد؟ سيتم حذف هذه الدفعة وخصم كميتها من المخزون فوراً."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-coral text-white font-bold py-3 rounded-xl shadow-md shadow-coral/20 hover:opacity-90 transition-all"
              >
                {language === "en" ? "Yes, delete" : "نعم، احذف"}
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
