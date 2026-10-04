"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";

import toast from "react-hot-toast";

import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SalesLog() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [refunding, setRefunding] = useState(false);
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const queryBranch =
    user?.role === "صيدلي" || user?.role === "مدير فرع"
      ? user?.branch || "all"
      : branchFilter;

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/sales?branchName=${queryBranch}`
      : null,
    fetcher,
  );
  const sales = data?.sales || [];

  const handleRefund = async (id: string) => {
    if (refunding) return;
    setRefunding(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/sales/${id}/refund`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(`تم استرجاع الفاتورة ${id} بنجاح`);
        mutate();
        if (selectedInvoice && selectedInvoice.id === id) {
          setSelectedInvoice({ ...selectedInvoice, status: "refunded" });
        }
      } else {
        toast.error(result.error || "فشل الاسترجاع");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="w-full pb-10">
      <AppBar />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-bold text-primary">سجل المبيعات</h1>
          <p className="text-[15px] text-ink-soft mt-1">
            تتبع الفواتير اليومية والإيرادات السابقة
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden">
        <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="ابحث برقم الفاتورة..."
          />
          <div className="flex gap-2">
            {user?.role !== "صيدلي" && user?.role !== "مدير فرع" && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="p-2 border border-ink-soft/30 bg-white rounded-lg text-[14px] focus:outline-none focus:border-primary shadow-sm"
              >
                <option value="all">كل الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="p-2 border border-ink-soft/30 bg-white rounded-lg text-[14px] focus:outline-none focus:border-primary shadow-sm"
              />
              <button
                onClick={() => {
                  if (dateFilter) {
                    setDateFilter(""); // Show all
                  } else {
                    const d = new Date();
                    setDateFilter(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                    );
                  }
                }}
                className={`text-[12px] px-3 py-1.5 rounded-lg transition-colors font-bold ${
                  dateFilter
                    ? "text-coral hover:bg-coral/10 bg-coral/5"
                    : "text-primary hover:bg-primary/10 bg-primary/5"
                }`}
              >
                {dateFilter ? "الكل" : "اليوم"}
              </button>
            </div>
          </div>
        </div>

        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-mint-line text-ink-soft text-[14px]">
              <th className="py-3 px-5 font-semibold">رقم الفاتورة</th>
              <th className="py-3 px-5 font-semibold">التاريخ والوقت</th>
              <th className="py-3 px-5 font-semibold">العدد</th>
              <th className="py-3 px-5 font-semibold">طريقة الدفع</th>
              <th className="py-3 px-5 font-semibold">الإجمالي</th>
              <th className="py-3 px-5 font-semibold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {sales
              .filter((s: any) =>
                s.id.toLowerCase().includes(search.toLowerCase()),
              )
              .filter((s: any) => {
                if (!dateFilter) return true;
                const localDateStr = new Date(s.date).toLocaleDateString(
                  "en-CA",
                ); // Gets YYYY-MM-DD in local timezone
                return localDateStr === dateFilter;
              })
              .map((sale: any) => (
                <tr
                  key={sale.id}
                  className={`border-b border-mint-line/50 transition-all ${sale.status === "refunded" ? "opacity-50 bg-bg" : "hover:bg-bg/50"}`}
                >
                  <td
                    className="py-4 px-5 font-mono text-[15px] font-bold text-ink"
                    dir="ltr"
                  >
                    {sale.id}
                    {sale.status === "refunded" && (
                      <span
                        className="ml-2 text-[10px] bg-coral text-white px-2 py-0.5 rounded-full"
                        dir="rtl"
                      >
                        مسترجعة
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-5 text-[14px] text-ink-soft">
                    {new Date(sale.date).toLocaleString("ar-EG")}
                  </td>
                  <td className="py-4 px-5 text-[14px]">
                    {Array.isArray(sale.items) ? sale.items.length : 0} أصناف
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`px-2 py-1 rounded-md text-[12px] font-bold ${
                        sale.paymentMethod === "cash"
                          ? "bg-teal-pale text-teal"
                          : "bg-primary-pale text-primary"
                      }`}
                    >
                      {sale.paymentMethod === "cash"
                        ? "نقدي"
                        : sale.paymentMethod === "bank"
                          ? "بنكي"
                          : sale.paymentMethod === "jawwal"
                            ? "جوال باي"
                            : sale.paymentMethod === "palpay"
                              ? "بال باي"
                              : sale.paymentMethod === "maalchat"
                                ? "مالتشات"
                                : sale.paymentMethod === "credit"
                                  ? "ذمم" + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                                  : sale.paymentMethod}
                    </span>
                  </td>
                  <td
                    className={`py-4 px-5 font-bold text-[15px] ${sale.status === "refunded" ? "text-ink-soft line-through" : "text-primary"}`}
                  >
                    {sale.total} ₪
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedInvoice(sale)}
                        className="px-3 py-1.5 text-[13px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        عرض
                      </button>
                      {sale.status !== "refunded" && (
                        <button
                          onClick={() => handleRefund(sale.id)}
                          className="px-3 py-1.5 text-[13px] font-bold text-coral border border-coral-pale rounded-lg hover:bg-coral hover:text-white transition-all"
                        >
                          استرجاع
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-mint-line dashed">
              <div>
                <h3 className="text-[20px] font-black text-primary">
                  تفاصيل الفاتورة
                </h3>
                <div className="font-mono text-[14px] text-ink-soft font-bold mt-1">
                  {selectedInvoice.id.substring(0, 13)}...
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">التاريخ والوقت:</span>
                <span className="text-ink font-semibold">
                  {new Date(selectedInvoice.date).toLocaleString("ar-EG")}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">طريقة الدفع:</span>
                <span className="text-ink font-semibold">
                  {selectedInvoice.paymentMethod === "cash"
                    ? "نقدي"
                    : selectedInvoice.paymentMethod === "bank"
                      ? "بنكي"
                      : selectedInvoice.paymentMethod === "jawwal"
                        ? "جوال باي"
                        : selectedInvoice.paymentMethod === "palpay"
                          ? "بال باي"
                          : selectedInvoice.paymentMethod === "maalchat"
                            ? "مالتشات"
                            : selectedInvoice.paymentMethod === "credit"
                              ? "ذمم" + (selectedInvoice.customer?.name ? " (باسم: " + selectedInvoice.customer.name + ")" : "")
                              : selectedInvoice.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">عدد الأصناف:</span>
                <span className="text-ink font-semibold">
                  {Array.isArray(selectedInvoice.items)
                    ? selectedInvoice.items.length
                    : 0}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">حالة الفاتورة:</span>
                <span
                  className={`font-bold ${selectedInvoice.status === "refunded" ? "text-coral" : "text-teal"}`}
                >
                  {selectedInvoice.status === "refunded" ? "مسترجعة" : "مكتملة"}
                </span>
              </div>
            </div>

            {Array.isArray(selectedInvoice.items) &&
              selectedInvoice.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-[15px] mb-3">
                    الأصناف المباعة
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-mint-line rounded-xl">
                    <table className="w-full text-[13px] text-right">
                      <thead className="bg-bg text-ink-soft border-b border-mint-line">
                        <tr>
                          <th className="py-2 px-3 font-semibold">الصنف</th>
                          <th className="py-2 px-3 font-semibold text-center">
                            الكمية
                          </th>
                          <th className="py-2 px-3 font-semibold text-left">
                            السعر
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item: any, i: number) => (
                          <tr
                            key={i}
                            className="border-b border-mint-line/50 last:border-0"
                          >
                            <td className="py-2 px-3 font-bold">{item.name}</td>
                            <td className="py-2 px-3 text-center">
                              {item.cartQty || item.qty}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-left">
                              {item.price || 0} ₪
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="bg-bg rounded-xl p-4 flex justify-between items-center">
              <span className="font-black text-ink">الإجمالي الكلي</span>
              <span
                className={`font-mono text-[22px] font-black ${selectedInvoice.status === "refunded" ? "text-coral line-through" : "text-primary"}`}
              >
                {selectedInvoice.total} ₪
              </span>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  router.push(`/pos?edit=${selectedInvoice.id}`);
                }}
                className="flex-1 bg-white text-primary border-2 border-primary font-bold py-3.5 rounded-xl hover:bg-primary-pale transition-all"
              >
                تعديل الفاتورة
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
