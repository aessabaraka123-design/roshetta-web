"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter } from "lucide-react";
import Link from "next/link";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { useStore } from "@/store";
import useSWR from "swr";
import toast from "react-hot-toast";
import { formatQty } from "@/utils/formatQty";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type MedCategory = "all" | "expiring" | "out" | "controlled";

interface Med {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  qty: number;
  minQty?: number;
  price: number;
  cost: number;
  batch_number: string;
  expiry_date?: string;
  expiry?: string;
  isControlled?: number | boolean;
  branch: { name: string };
  units?: string;
  // Temporary state for UI
  has_parts?: boolean;
  part1_name?: string;
  part1_qty?: number;
  part1_price?: number;
  has_subparts?: boolean;
  part2_name?: string;
  part2_qty?: number;
  part2_price?: number;
  stock_boxes?: number;
  stock_part1?: number;
  stock_part2?: number;
}

export default function Inventory() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [activeCat, setActiveCat] = useState<MedCategory>("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/dashboard`,
        );
        const data = await res.json();
        if (data.success && data.branches?.length > 0) {
          setBranches(data.branches);
        }
      } catch (err) {}
    }
    fetchBranches();
  }, [user?.pharmacy_id]);

  // Try to find the user's default branch ID based on their name if they have a fixed branch
  const userBranchObj = branches.find((b: any) => b.name === user?.branch);
  let activeBranchId = branchFilter;
  if (user?.role === "صيدلي" || user?.role === "مدير فرع") {
    activeBranchId = userBranchObj ? userBranchObj.id : "PENDING";
  }

  const shouldFetch = user && activeBranchId !== "PENDING";
  const { data, mutate, isLoading } = useSWR(
    shouldFetch
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory?branch_id=${activeBranchId}`
      : null,
    fetcher,
  );
  const meds = data?.inventory || [];
  const categories = [
    { id: "all", name: "الكل" },
    { id: "expiring", name: "قاربت تنتهي" },
    { id: "out", name: "نفدت الكمية" },
    { id: "controlled", name: "مراقبة" },
  ];

  // Helper logic for categories
  const getMedCategory = (med: Med): MedCategory[] => {
    const cats: MedCategory[] = ["all"];

    let boxes = med.qty || 0;
    if (med.units) {
      try {
        const arr = JSON.parse(med.units);
        if (arr && arr.length >= 1 && arr[0].count > 0) {
          boxes = Math.floor(med.qty / arr[0].count);
        }
      } catch (e) {}
    }

    if (med.qty === 0) {
      cats.push("out");
    } else {
      const threshold =
        med.minQty !== undefined && med.minQty !== null && med.minQty > 0
          ? med.minQty
          : 5;
      if (boxes < threshold) {
        cats.push("expiring"); // قاربت تنتهي (Low Stock)
      }
    }

    // Pseudo logic for expiring: if expiry is within 30 days
    const exp = med.expiry || med.expiry_date;
    if (
      exp &&
      new Date(exp) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
      !cats.includes("expiring")
    ) {
      cats.push("expiring"); // قاربت تنتهي (Nearing Expiry Date)
    }
    if (med.isControlled === 1 || med.isControlled === true) {
      cats.push("controlled");
    }
    return cats;
  };

  const [editingItem, setEditingItem] = useState<Med | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Med | null>(null);

  const filteredMeds = meds.filter((med: Med) => {
    const matchCat = getMedCategory(med).includes(activeCat);
    const matchSearch =
      med.name?.includes(search) ||
      med.manufacturer?.includes(search) ||
      med.category?.includes(search);
    return matchCat && matchSearch;
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/inventory/${editingItem.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editingItem.name,
            manufacturer: editingItem.manufacturer,
            category: editingItem.category,
            price_sell: editingItem.price,
            price_buy: editingItem.cost,
            qty: (() => {
              const sb = editingItem.stock_boxes || 0;
              const sp1 = editingItem.stock_part1 || 0;
              const sp2 = editingItem.stock_part2 || 0;
              if (!editingItem.has_parts) return sb;
              if (editingItem.has_parts && !editingItem.has_subparts) {
                const p1q = editingItem.part1_qty || 1;
                return sb * p1q + sp1;
              }
              if (editingItem.has_parts && editingItem.has_subparts) {
                const p1q = editingItem.part1_qty || 1;
                const p2q = editingItem.part2_qty || 1;
                return sb * p1q * p2q + sp1 * p2q + sp2;
              }
              return sb;
            })(),
            batch_number: editingItem.batch_number,
            expiry_date: editingItem.expiry_date,
            units: (() => {
              if (!editingItem.has_parts) return null;
              if (editingItem.has_parts && !editingItem.has_subparts) {
                return JSON.stringify([
                  { name: "علبة", count: editingItem.part1_qty || 1 },
                  { name: editingItem.part1_name || "شريط", count: 1 },
                ]);
              }
              if (editingItem.has_parts && editingItem.has_subparts) {
                const p1q = editingItem.part1_qty || 1;
                const p2q = editingItem.part2_qty || 1;
                return JSON.stringify([
                  { name: "علبة", count: p1q * p2q },
                  { name: editingItem.part1_name || "شريط", count: p2q },
                  { name: editingItem.part2_name || "حبة", count: 1 },
                ]);
              }
              return null;
            })(),
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success("تم التعديل بنجاح");
        setEditingItem(null);
        mutate();
      } else {
        toast.error(result.error || "حدث خطأ أثناء التعديل");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/inventory/${itemToDelete.id}`,
        {
          method: "DELETE",
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success("تم الحذف بنجاح");
        setItemToDelete(null);
        mutate();
      } else {
        toast.error("حدث خطأ أثناء الحذف");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  return (
    <div className="w-full pb-10">
      <AppBar title="المخزون" showLogo={false} showNotifs={false}>
        <div className="flex gap-2 items-center">
          {user?.role !== "صيدلي" && user?.role !== "مدير فرع" && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-card text-ink border-2 border-mint-line px-3 py-2 rounded-xl font-bold text-[14px] outline-none"
            >
              <option value="all">كل الفروع</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Link
            href="/stock-take"
            className="bg-card text-ink-soft border-2 border-mint-line px-4 py-2 rounded-xl font-bold text-[14px] hover:bg-bg transition-colors"
          >
            جرد المخزون
          </Link>
          <Link
            href="/add-item"
            className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-[14px] hover:bg-teal transition-colors flex items-center justify-center"
          >
            + إضافة صنف
          </Link>
        </div>
      </AppBar>

      <SearchBar
        placeholder="ابحث باسم الدواء أو الباركود…"
        value={search}
        onChange={setSearch}
      />

      <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar mt-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id as MedCategory)}
            className={`shrink-0 text-[15px] font-semibold px-4 py-2 rounded-full border transition-all ${
              activeCat === cat.id
                ? "bg-primary text-white border-primary"
                : "bg-card text-ink-soft border-mint-line"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {filteredMeds.map((med: any) => {
          const cats = getMedCategory(med);
          const isOut = cats.includes("out");
          const isExpiring = cats.includes("expiring");
          const isControlled = cats.includes("controlled");
          const tag = isOut
            ? "نفدت"
            : isExpiring
              ? "قاربت تنتهي"
              : isControlled
                ? "مراقبة"
                : "متوفر";
          const tagColorClass = isOut
            ? "bg-coral-pale text-coral"
            : isExpiring
              ? "bg-amber-pale text-[#B9791C]"
              : isControlled
                ? "bg-primary-pale text-primary"
                : "bg-teal-pale text-teal";

          return (
            <div
              key={med.id}
              className="bg-card rounded-2xl p-4 shadow-sm border border-mint-line"
            >
              <div className="flex justify-between items-start mb-2.5">
                <div className="max-w-[70%] flex flex-col items-start text-start">
                  <h3
                    className="text-[16px] font-bold text-ink truncate max-w-full"
                    dir="auto"
                  >
                    {med.name}
                  </h3>
                  <p
                    className="text-[14px] text-ink-soft mt-0.5 truncate max-w-full"
                    dir="auto"
                  >
                    {med.manufacturer} · {med.category}
                  </p>
                </div>
                <span
                  className={`text-[12px] font-bold px-3 py-1 rounded-full ${tagColorClass}`}
                >
                  {tag}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[14px] text-primary">
                  الكمية: {formatQty(med.qty, med.units)}
                </span>
                <span className="font-mono text-[16px] font-bold text-primary">
                  {med.price || 0} ₪
                </span>
              </div>
              <div className="flex items-center gap-2 border-t border-mint-line pt-3 mt-auto">
                <button
                  onClick={() => {
                    let hp = false;
                    let p1n = "شريط",
                      p1q = 1;
                    let hs = false;
                    let p2n = "حبة",
                      p2q = 1;
                    let s_boxes = med.qty || 0,
                      s_p1 = 0,
                      s_p2 = 0;

                    try {
                      if (med.units) {
                        const arr = JSON.parse(med.units);
                        if (arr && arr.length >= 2) {
                          hp = true;
                          p1n = arr[1].name;
                          const totalPerBox = arr[0].count;
                          s_boxes = Math.floor((med.qty || 0) / totalPerBox);
                          const rem = (med.qty || 0) % totalPerBox;

                          if (arr.length === 2) {
                            p1q = arr[0].count / arr[1].count;
                            s_p1 = Math.floor(rem / arr[1].count);
                          } else if (arr.length === 3) {
                            hs = true;
                            p2n = arr[2].name;
                            p2q = arr[1].count / arr[2].count;
                            p1q = arr[0].count / arr[1].count;
                            s_p1 = Math.floor(rem / arr[1].count);
                            s_p2 = rem % arr[1].count;
                          }
                        }
                      }
                    } catch (e) {}

                    setEditingItem({
                      ...med,
                      expiry_date: med.expiry_date || med.expiry || "",
                      batch_number: med.batch_number || "",
                      has_parts: hp,
                      part1_name: p1n,
                      part1_qty: p1q,
                      has_subparts: hs,
                      part2_name: p2n,
                      part2_qty: p2q,
                      stock_boxes: s_boxes,
                      stock_part1: s_p1,
                      stock_part2: s_p2,
                    });
                  }}
                  className="flex-1 text-[13px] font-bold text-teal bg-teal-pale/50 hover:bg-teal hover:text-white py-1.5 rounded-lg transition-colors"
                >
                  تعديل
                </button>
                <button
                  onClick={() => setItemToDelete(med)}
                  className="flex-1 text-[13px] font-bold text-coral bg-coral-pale/50 hover:bg-coral hover:text-white py-1.5 rounded-lg transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
        {filteredMeds.length === 0 && (
          <div className="text-center py-10 text-ink-soft text-[14px]">
            لا يوجد نتائج مطابقة للبحث.
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center shrink-0">
              <h3 className="font-bold text-primary">تعديل بيانات الصنف</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-ink-soft hover:text-coral font-bold text-[20px]"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={handleUpdate}
              className="flex flex-col flex-1 overflow-hidden min-h-0"
            >
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    اسم الصنف
                  </label>
                  <input
                    required
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                    dir="auto"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      الشركة المصنّعة
                    </label>
                    <input
                      value={editingItem.manufacturer || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                      dir="auto"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      الفئة العلاجية
                    </label>
                    <input
                      value={editingItem.category || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          category: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                      dir="auto"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      الكمية (علبة)
                    </label>
                    <input
                      type="number"
                      required
                      value={editingItem.stock_boxes ?? 0}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          stock_boxes: Number(e.target.value),
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      سعر الشراء (₪)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingItem.cost || 0}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          cost: Number(e.target.value),
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      سعر البيع (₪)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingItem.price}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      رقم الدفعة
                    </label>
                    <input
                      value={editingItem.batch_number || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          batch_number: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      تاريخ الصلاحية
                    </label>
                    <input
                      type="month"
                      value={editingItem.expiry_date || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          expiry_date: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                </div>
                {/* ── الوحدات والأجزاء (متزامن مع الموبايل) ── */}
                <div
                  className="border border-mint-line rounded-xl p-4 bg-bg"
                  dir="rtl"
                >
                  <label className="flex items-center justify-between cursor-pointer mb-3">
                    <span className="text-[13px] font-bold text-ink">
                      يُباع بالأجزاء (أشرطة / حبات)؟
                    </span>
                    <div
                      onClick={() =>
                        setEditingItem({
                          ...editingItem,
                          has_parts: !editingItem.has_parts,
                        })
                      }
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${editingItem.has_parts ? "bg-primary border-primary" : "bg-white border-mint-line"}`}
                    >
                      {editingItem.has_parts && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </label>

                  {editingItem.has_parts && (
                    <div className="space-y-3 pt-3 border-t border-mint-line">
                      <p className="text-[12px] font-bold text-ink-soft">
                        الجزء الأول (مثال: شريط)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">
                            اسم الجزء
                          </label>
                          <select
                            value={editingItem.part1_name || "شريط"}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                part1_name: e.target.value,
                              })
                            }
                            className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-right"
                          >
                            <option value="شريط">شريط</option>
                            <option value="أمبولة">أمبولة</option>
                            <option value="مغلف">مغلف</option>
                            <option value="قطرة">قطرة</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">
                            كم في العلبة؟
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingItem.part1_qty ?? 1}
                            onChange={(e) =>
                              setEditingItem({
                                ...editingItem,
                                part1_qty: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center"
                          />
                        </div>
                      </div>

                      <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-mint-line mt-3">
                        <span className="text-[12px] font-bold text-ink-soft">
                          هل يباع مجزأ؟ (مثال: حبة)
                        </span>
                        <div
                          onClick={() =>
                            setEditingItem({
                              ...editingItem,
                              has_subparts: !editingItem.has_subparts,
                            })
                          }
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${editingItem.has_subparts ? "bg-primary border-primary" : "bg-white border-mint-line"}`}
                        >
                          {editingItem.has_subparts && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </label>

                      {editingItem.has_subparts && (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="block text-[11px] font-bold text-ink-soft mb-1">
                              اسم الجزء
                            </label>
                            <select
                              value={editingItem.part2_name || "حبة"}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  part2_name: e.target.value,
                                })
                              }
                              className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-right"
                            >
                              <option value="حبة">حبة</option>
                              <option value="مل">مل</option>
                              <option value="غرام">غرام</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-ink-soft mb-1">
                              كم في الـ {editingItem.part1_name || "شريط"}؟
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editingItem.part2_qty ?? 1}
                              onChange={(e) =>
                                setEditingItem({
                                  ...editingItem,
                                  part2_qty: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-mint-line bg-white shrink-0">
                <button
                  type="submit"
                  className="w-full bg-primary text-white font-bold rounded-xl py-3 hover:bg-teal transition-colors shadow-md shadow-primary/20"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-100 transition-opacity">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform scale-100 transition-transform">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-coral"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
              <p className="text-[14px] text-ink-soft leading-relaxed">
                هل أنت متأكد من حذف الصنف{" "}
                <span className="font-bold text-primary">
                  {itemToDelete.name}
                </span>{" "}
                نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="flex border-t border-mint-line bg-bg/50">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-4 text-[15px] font-bold text-ink-soft hover:bg-black/5 hover:text-ink transition-colors"
              >
                تراجع
              </button>
              <div className="w-[1px] bg-mint-line"></div>
              <button
                onClick={executeDelete}
                className="flex-1 py-4 text-[15px] font-bold text-coral hover:bg-coral hover:text-white transition-colors"
              >
                نعم، احذف الصنف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
