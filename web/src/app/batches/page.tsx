"use client";

import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const getDaysUntilExpiry = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const getExpiryStyle = (days: number) => {
  if (days < 0)
    return {
      row: "bg-red-50",
      badge: "bg-red-200 text-red-800",
      label: "منتهي الصلاحية",
    };
  if (days <= 30)
    return {
      row: "bg-coral-pale/20",
      badge: "bg-coral-pale text-coral",
      label: `${days} يوم`,
    };
  if (days <= 60)
    return {
      row: "bg-amber-pale/20",
      badge: "bg-amber-pale text-[#B9791C]",
      label: `${days} يوم`,
    };
  return {
    row: "bg-white",
    badge: "bg-teal-pale text-teal",
    label: `${days} يوم`,
  };
};

export default function BatchesPage() {
  const user = useStore((s: any) => s.user);
  const router = useRouter();
  useEffect(() => {
    if (!user) router.push("/login");
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
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/batches`
      : null,
    fetcher,
  );
  const { data: inventoryData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`
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
          ? days < 0
          : days >= 0 && days <= 60;
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
      toast.error("يرجى إدخال بيانات الدفعة الإلزامية");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/batches`,
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
        toast.success("تمت إضافة الدفعة وتحديث المخزون!");
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
      } else toast.error(result.error || "فشل الإضافة");
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!batchToDelete) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/batches/${batchToDelete}`,
      { method: "DELETE" },
    );
    const result = await res.json();
    if (result.success) {
      toast.success("تم الحذف");
      mutate();
    } else toast.error(result.error);
    setBatchToDelete(null);
  };

  const filteredInventory = inventory
    .filter((d: any) => d.name?.includes(inventorySearch))
    .slice(0, 8);

  return (
    <>
      <AppBar title="دفعات الصلاحيات" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              إجمالي الدفعات
            </div>
            <div className="text-[32px] font-mono font-black text-primary">
              {batches.length}
            </div>
          </div>
          <div
            className="bg-amber-pale/30 rounded-2xl border border-amber-pale p-5 text-center shadow-sm cursor-pointer"
            onClick={() => setFilterExpiring("expiring")}
          >
            <div className="text-[12px] font-bold text-[#B9791C] mb-1">
              ⚠️ تنتهي خلال 60 يوم
            </div>
            <div className="text-[32px] font-mono font-black text-[#B9791C]">
              {expiringCount}
            </div>
          </div>
          <div
            className="bg-red-50 rounded-2xl border border-red-200 p-5 text-center shadow-sm cursor-pointer"
            onClick={() => setFilterExpiring("expired")}
          >
            <div className="text-[12px] font-bold text-red-600 mb-1">
              🚫 منتهية الصلاحية
            </div>
            <div className="text-[32px] font-mono font-black text-red-600">
              {expiredCount}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="ابحث باسم الدواء أو رقم الدفعة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-teal"
          />
          {(["all", "expiring", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterExpiring(f)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${filterExpiring === f ? "bg-primary text-white border-primary" : "bg-white text-ink-soft border-mint-line"}`}
            >
              {f === "all"
                ? "الكل"
                : f === "expiring"
                  ? "تنتهي قريباً"
                  : "منتهية"}
            </button>
          ))}
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-[14px] shadow-md shadow-primary/20 hover:opacity-90 whitespace-nowrap"
          >
            + إضافة دفعة
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center">
            <div className="text-[40px] mb-3">📦</div>
            <div className="text-ink-soft font-bold">لا توجد دفعات مطابقة</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-mint-line overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-bg border-b border-mint-line">
                <tr>
                  {[
                    "الدواء",
                    "رقم الدفعة",
                    "الكمية",
                    "تاريخ الصلاحية",
                    "الوقت المتبقي",
                    "سعر الشراء",
                    "",
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-[13px] font-bold text-ink-soft"
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
                        {batch.drug_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-ink-soft">
                        {batch.batch_number || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-[14px] text-primary">
                        {batch.qty}
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-ink">
                        {batch.expiry_date}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-[12px] font-bold ${s.badge}`}
                        >
                          {s.label}
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
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                إضافة دفعة جديدة
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
                  الدواء *
                </label>
                <input
                  type="text"
                  placeholder="ابحث عن الدواء..."
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
                        لا توجد نتائج
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    رقم الدفعة
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
                    placeholder="اختياري"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    الكمية *
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
                    تاريخ الصلاحية *
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
                    سعر الشراء (₪)
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
                {isLoading ? "جاري الإضافة..." : "إضافة الدفعة"}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
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
              تأكيد الحذف
            </h3>
            <p className="text-[14px] text-ink-soft font-bold mb-6">
              هل أنت متأكد؟ سيتم حذف هذه الدفعة وخصم كميتها من المخزون فوراً.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-coral text-white font-bold py-3 rounded-xl shadow-md shadow-coral/20 hover:opacity-90 transition-all"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setBatchToDelete(null)}
                className="flex-1 bg-bg text-ink font-bold py-3 rounded-xl hover:bg-mint-line transition-all"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
