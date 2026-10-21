"use client";

import { API_BASE_URL } from "@/lib/config";
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
  const language = useStore((state: any) => state.language);
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
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`,
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
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales?branchName=${queryBranch}`
      : null,
    fetcher,
  );
  const sales = (data?.sales || []).filter((s: any) => s.status !== "refund_proxy");

  const handleRefund = async (id: string) => {
    if (refunding) return;
    setRefunding(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/sales/${id}/refund`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(language === 'en' ? `Invoice ${id} refunded successfully` : `تم استرجاع الفاتورة ${id} بنجاح`);
        mutate();
        if (selectedInvoice && selectedInvoice.id === id) {
          setSelectedInvoice({ ...selectedInvoice, status: "refunded" });
        }
      } else {
        toast.error(result.error || (language === 'en' ? 'Refund failed' : 'فشل الاسترجاع'));
      }
    } catch (e) {
      toast.error(language === 'en' ? 'Connection error' : 'خطأ في الاتصال');
    } finally {
      setRefunding(false);
    }
  };

  const filteredSales = sales
    .filter((s: any) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const idMatch = s.id && s.id.toLowerCase().includes(q);
      const custName = typeof s.customer === "object" ? s.customer?.name : typeof s.customer === "string" ? s.customer : "";
      const custMatch = custName && custName.toLowerCase().includes(q);
      const totalMatch = String(s.total || "").includes(q);
      return idMatch || custMatch || totalMatch;
    })
    .filter((s: any) => {
      if (!dateFilter) return true;
      const localDateStr = new Date(s.date).toLocaleDateString(
        "en-CA",
      ); // Gets YYYY-MM-DD in local timezone
      return localDateStr === dateFilter;
    });

  return (
    <div className="w-full pb-10 px-2 sm:px-4 md:px-0">
      <AppBar />
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-primary">{language === 'en' ? 'Sales Log' : 'سجل المبيعات'}</h1>
          <p className="text-[13px] sm:text-[15px] text-ink-soft mt-0.5 sm:mt-1">
            {language === 'en' ? 'Track daily invoices and past revenue' : 'تتبع الفواتير اليومية والإيرادات السابقة'}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden">
        {/* Search & Filters (Fully Responsive) */}
        <div className="p-3 sm:p-5 border-b border-mint-line bg-bg flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex-1 w-full">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={language === 'en' ? 'Search invoice number, customer...' : 'ابحث برقم الفاتورة أو العميل...'}
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center justify-between sm:justify-end">
            {user?.role !== "صيدلي" && user?.role !== "مدير فرع" && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="flex-1 sm:flex-none p-2 sm:p-2.5 border border-ink-soft/30 bg-white rounded-xl text-[13px] sm:text-[14px] focus:outline-none focus:border-primary shadow-sm"
              >
                <option value="all">{language === 'en' ? 'All Branches' : 'كل الفروع'}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 sm:flex-none p-2 sm:p-2.5 border border-ink-soft/30 bg-white rounded-xl text-[13px] sm:text-[14px] focus:outline-none focus:border-primary shadow-sm"
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
                className={`text-[12px] sm:text-[13px] px-3 py-2 sm:py-2.5 rounded-xl transition-colors font-bold whitespace-nowrap shadow-sm ${
                  dateFilter
                    ? "text-coral hover:bg-coral/10 bg-coral/5 border border-coral/20"
                    : "text-primary hover:bg-primary/10 bg-primary/5 border border-primary/20"
                }`}
              >
                {dateFilter ? (language === 'en' ? 'All' : 'الكل') : (language === 'en' ? 'Today' : 'اليوم')}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View: Cards Layout (Hidden on Desktop) */}
        <div className="block md:hidden divide-y divide-mint-line/50">
          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-ink-soft text-[14px]">
              {language === "en" ? "No invoices found" : "لا توجد فواتير مطابقة للبحث أو التاريخ المحدد"}
            </div>
          ) : (
            filteredSales.map((sale: any) => (
              <div
                key={sale.id}
                className={`p-3.5 sm:p-4 transition-all ${sale.status === "refunded" ? "opacity-60 bg-bg/60" : "hover:bg-bg/40 bg-white"}`}
              >
                {/* Top Row: Invoice ID Badge & Total Amount */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-mint-bg border border-mint-line rounded-lg text-primary font-mono font-bold text-[13px]">
                      <span className="text-primary/40 text-[11px]">#</span>
                      <span dir="ltr">{sale.id}</span>
                    </div>
                    {sale.status === "refunded" && (
                      <span className="text-[10px] bg-coral/10 text-coral border border-coral/20 px-1.5 py-0.5 rounded font-bold">
                        {language === 'en' ? 'Refunded' : 'مسترجعة'}
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-black text-[16px] text-teal">
                    <span className={sale.status === "refunded" ? "text-ink-soft line-through" : ""}>
                      {Number(sale.total || 0).toLocaleString()} ₪
                    </span>
                  </div>
                </div>

                {/* Middle Row: Payment Method Badge & Count Badge */}
                <div className="flex flex-wrap gap-1.5 items-center mb-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                      sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : sale.paymentMethod === "cash"
                          ? "bg-teal-pale text-teal border border-teal/20"
                          : "bg-primary-pale text-primary border border-primary/20"
                    }`}
                  >
                    {sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين"
                      ? (language === 'en' ? "Debt Collection" : "سداد دين") + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                      : sale.paymentMethod === "cash"
                        ? (language === 'en' ? "Cash" : "نقدي")
                        : sale.paymentMethod === "bank"
                          ? (language === 'en' ? "Bank" : "بنكي")
                          : sale.paymentMethod === "jawwal"
                            ? (language === 'en' ? "Jawwal Pay" : "جوال باي")
                            : sale.paymentMethod === "palpay"
                              ? (language === 'en' ? "PalPay" : "بال باي")
                              : sale.paymentMethod === "maalchat"
                                ? (language === 'en' ? "MaalChat" : "مالتشات")
                                : sale.paymentMethod === "credit"
                                  ? (language === 'en' ? "Credit" : "ذمم") + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                                  : sale.paymentMethod}
                  </span>

                  {sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين" || (!sale.items || sale.items.length === 0) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      💳 {language === 'en' ? 'Debt Receipt' : 'سند سداد'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-soft bg-bg px-2 py-0.5 rounded-md border border-mint-line">
                      {Array.isArray(sale.items) ? sale.items.length : 0} {language === 'en' ? 'Items' : 'أصناف'}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Date & Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-mint-line/30 text-[12px] text-ink-soft">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-bold text-ink">
                      {new Date(sale.date).toLocaleDateString(language === "en" ? "en-US" : "ar-EG")}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-ink-soft">
                      {new Date(sale.date).toLocaleTimeString(language === "en" ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedInvoice(sale)}
                      className="px-3 py-1 text-[12px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      {language === 'en' ? 'View' : 'عرض'}
                    </button>
                    {sale.status !== "refunded" && sale.status !== "debt_payment" && sale.paymentMethod !== "debt_payment" && sale.paymentMethod !== "تسديد دين" && (
                      <button
                        onClick={() => handleRefund(sale.id)}
                        className="px-3 py-1 text-[12px] font-bold text-coral border border-coral-pale rounded-lg hover:bg-coral hover:text-white transition-all"
                      >
                        {language === 'en' ? 'Refund' : 'استرجاع'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Responsive Table (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-start min-w-[700px]">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-3 px-5 font-semibold text-start">{language === 'en' ? 'Invoice Number' : 'رقم الفاتورة'}</th>
                <th className="py-3 px-5 font-semibold text-start">{language === 'en' ? 'Date & Time' : 'التاريخ والوقت'}</th>
                <th className="py-3 px-5 font-semibold text-start">{language === 'en' ? 'Count' : 'العدد'}</th>
                <th className="py-3 px-5 font-semibold text-start">{language === 'en' ? 'Payment Method' : 'طريقة الدفع'}</th>
                <th className="py-3 px-5 font-semibold text-start">{language === 'en' ? 'Total' : 'الإجمالي'}</th>
                <th className="py-3 px-5 font-semibold text-center">{language === 'en' ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-soft text-[15px]">
                    {language === "en" ? "No invoices found" : "لا توجد فواتير مطابقة للبحث أو التاريخ المحدد"}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale: any) => (
                  <tr
                    key={sale.id}
                    className={`border-b border-mint-line/50 transition-all ${sale.status === "refunded" ? "opacity-50 bg-bg" : "hover:bg-bg/50"}`}
                  >
                    <td className="py-4 px-5 text-start">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-mint-bg border border-mint-line rounded-xl text-primary font-mono font-bold text-[14px]">
                        <span className="text-primary/40 text-[12px]">#</span>
                        <span dir="ltr">{sale.id}</span>
                      </div>
                      {sale.status === "refunded" && (
                        <span
                          className="inline-block mr-2 text-[11px] bg-coral/10 text-coral border border-coral/20 px-2 py-0.5 rounded-md font-bold"
                        >
                          {language === 'en' ? 'Refunded' : 'مسترجعة'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-start">
                      <div className="text-[13px] font-bold text-ink">
                        {new Date(sale.date).toLocaleDateString(language === "en" ? "en-US" : "ar-EG")}
                      </div>
                      <div className="text-[12px] text-ink-soft font-mono mt-0.5">
                        {new Date(sale.date).toLocaleTimeString(language === "en" ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-start">
                      {sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين" || (!sale.items || sale.items.length === 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          💳 {language === 'en' ? 'Debt Receipt' : 'سند سداد'}
                        </span>
                      ) : (
                        <span className="text-[14px] font-medium text-ink">
                          {Array.isArray(sale.items) ? sale.items.length : 0} {language === 'en' ? 'Items' : 'أصناف'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-start">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold ${
                          sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين"
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : sale.paymentMethod === "cash"
                              ? "bg-teal-pale text-teal border border-teal/20"
                              : "bg-primary-pale text-primary border border-primary/20"
                        }`}
                      >
                        {sale.status === "debt_payment" || sale.paymentMethod === "debt_payment" || sale.paymentMethod === "تسديد دين"
                          ? (language === 'en' ? "Debt Collection" : "سداد دين") + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                          : sale.paymentMethod === "cash"
                            ? (language === 'en' ? "Cash" : "نقدي")
                            : sale.paymentMethod === "bank"
                              ? (language === 'en' ? "Bank" : "بنكي")
                              : sale.paymentMethod === "jawwal"
                                ? (language === 'en' ? "Jawwal Pay" : "جوال باي")
                                : sale.paymentMethod === "palpay"
                                  ? (language === 'en' ? "PalPay" : "بال باي")
                                  : sale.paymentMethod === "maalchat"
                                    ? (language === 'en' ? "MaalChat" : "مالتشات")
                                    : sale.paymentMethod === "credit"
                                      ? (language === 'en' ? "Credit" : "ذمم") + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                                      : sale.paymentMethod}
                      </span>
                    </td>
                    <td
                      className="py-4 px-5 text-start font-mono font-bold text-[15px]"
                    >
                      <span className={sale.status === "refunded" ? "text-ink-soft line-through" : "text-teal font-black"}>
                        {Number(sale.total || 0).toLocaleString()} ₪
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(sale)}
                          className="px-3 py-1.5 text-[13px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          {language === 'en' ? 'View' : 'عرض'}
                        </button>
                        {sale.status !== "refunded" && sale.status !== "debt_payment" && sale.paymentMethod !== "debt_payment" && sale.paymentMethod !== "تسديد دين" && (
                          <button
                            onClick={() => handleRefund(sale.id)}
                            className="px-3 py-1.5 text-[13px] font-bold text-coral border border-coral-pale rounded-lg hover:bg-coral hover:text-white transition-all"
                          >
                            {language === 'en' ? 'Refund' : 'استرجاع'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div id="invoice-modal-content" className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-mint-line dashed">
              <div>
                <h3 className="text-[20px] font-black text-primary">
                  {language === 'en' ? 'Invoice Details' : 'تفاصيل الفاتورة'}
                </h3>
                <div className="font-mono text-[14px] text-ink-soft font-bold mt-1">
                  {selectedInvoice.id.substring(0, 13)}...
                </div>
              </div>
              <button
                id="invoice-modal-close"
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
                <span className="text-ink-soft font-bold">{language === 'en' ? 'Date & Time:' : 'التاريخ والوقت:'}</span>
                <span className="text-ink font-semibold">
                  {new Date(selectedInvoice.date).toLocaleString(language === "en" ? "en-US" : "ar-EG")}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">{language === 'en' ? 'Payment Method:' : 'طريقة الدفع:'}</span>
                <span className="text-ink font-semibold">
                  {selectedInvoice.status === "debt_payment" || selectedInvoice.paymentMethod === "debt_payment" || selectedInvoice.paymentMethod === "تسديد دين"
                    ? (language === 'en' ? "Debt Collection" : "سداد دين") + (selectedInvoice.customer?.name ? ` (${selectedInvoice.customer.name})` : "")
                    : selectedInvoice.paymentMethod === "cash"
                    ? (language === 'en' ? "Cash" : "نقدي")
                    : selectedInvoice.paymentMethod === "bank"
                      ? (language === 'en' ? "Bank" : "بنكي")
                      : selectedInvoice.paymentMethod === "jawwal"
                        ? (language === 'en' ? "Jawwal Pay" : "جوال باي")
                        : selectedInvoice.paymentMethod === "palpay"
                          ? (language === 'en' ? "PalPay" : "بال باي")
                          : selectedInvoice.paymentMethod === "maalchat"
                            ? (language === 'en' ? "MaalChat" : "مالتشات")
                            : selectedInvoice.paymentMethod === "credit"
                              ? (language === 'en' ? "Credit" : "ذمم") + (selectedInvoice.customer?.name ? (language === 'en' ? " (Name: " : " (باسم: ") + selectedInvoice.customer.name + ")" : "")
                              : selectedInvoice.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">{language === 'en' ? 'Transaction Type:' : 'نوع الحركة:'}</span>
                <span className="text-ink font-semibold">
                  {selectedInvoice.status === "debt_payment" || selectedInvoice.paymentMethod === "debt_payment" || selectedInvoice.paymentMethod === "تسديد دين"
                    ? (language === 'en' ? "Debt Repayment Voucher" : "سند قبض / سداد دين")
                    : (language === 'en' ? "Sales Invoice" : "فاتورة مبيعات أدوية")}
                </span>
              </div>
              {selectedInvoice.status !== "debt_payment" && selectedInvoice.paymentMethod !== "debt_payment" && selectedInvoice.paymentMethod !== "تسديد دين" && (
                <div className="flex justify-between text-[14px]">
                  <span className="text-ink-soft font-bold">{language === 'en' ? 'Number of Items:' : 'عدد الأصناف:'}</span>
                  <span className="text-ink font-semibold">
                    {Array.isArray(selectedInvoice.items)
                      ? selectedInvoice.items.length
                      : 0}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft font-bold">{language === 'en' ? 'Invoice Status:' : 'حالة الفاتورة:'}</span>
                <span
                  className={`font-bold ${selectedInvoice.status === "refunded" ? "text-coral" : "text-teal"}`}
                >
                  {selectedInvoice.status === "refunded" ? (language === 'en' ? "Refunded" : "مسترجعة") : (language === 'en' ? "Completed" : "مكتملة")}
                </span>
              </div>
            </div>

            {Array.isArray(selectedInvoice.items) &&
              selectedInvoice.items.length > 0 ? (
                <div className="mb-6">
                  <h4 className="font-bold text-[15px] mb-3">
                    {language === 'en' ? 'Sold Items' : 'الأصناف المباعة'}
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-mint-line rounded-xl">
                    <table className="w-full text-[13px] text-start">
                      <thead className="bg-bg text-ink-soft border-b border-mint-line">
                        <tr>
                          <th className="py-2 px-3 font-semibold text-start">{language === 'en' ? 'Item' : 'الصنف'}</th>
                          <th className="py-2 px-3 font-semibold text-center">
                            {language === 'en' ? 'Quantity' : 'الكمية'}
                          </th>
                          <th className="py-2 px-3 font-semibold text-start">
                            {language === 'en' ? 'Price' : 'السعر'}
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
                            <td className="py-2 px-3 font-mono font-bold text-start">
                              {item.price || 0} ₪
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl text-center">
                  <div className="text-[14px] font-bold text-purple-900 mb-1">
                    {language === 'en' ? '💳 Debt Repayment Voucher' : '💳 سند قبض مالي (سداد دين)'}
                  </div>
                  <div className="text-[13px] text-purple-700">
                    {selectedInvoice.customer?.name
                      ? (language === 'en' ? `Customer: ${selectedInvoice.customer.name}` : `العميل: ${selectedInvoice.customer.name}`)
                      : (language === 'en' ? 'Financial collection (No dispensed items)' : 'حركة قبض مالي لا تتضمن صرف أدوية')}
                  </div>
                </div>
              )}

            <div className="bg-bg rounded-xl p-4 flex justify-between items-center">
              <span className="font-black text-ink">{language === 'en' ? 'Grand Total' : 'الإجمالي الكلي'}</span>
              <span
                className={`font-mono text-[22px] font-black ${selectedInvoice.status === "refunded" ? "text-coral line-through" : "text-primary"}`}
              >
                {selectedInvoice.total} ₪
              </span>
            </div>

            <div id="invoice-modal-actions" className="flex flex-col sm:flex-row gap-2 mt-6">
              <button
                onClick={async () => {
                  const element = document.getElementById("invoice-modal-content");
                  if (!element) return;
                  const actions = document.getElementById("invoice-modal-actions");
                  const closeBtn = document.getElementById("invoice-modal-close");
                  
                  if (actions) actions.style.display = "none";
                  if (closeBtn) closeBtn.style.display = "none";
                  
                  try {
                    const html2pdf = (await import("html2pdf.js")).default;
                    await html2pdf().set({
                      margin: 0.5,
                      filename: `invoice_${selectedInvoice.id}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    }).from(element).save();
                  } catch(e) {
                  } finally {
                    if (actions) actions.style.display = "flex";
                    if (closeBtn) closeBtn.style.display = "block";
                  }
                }}
                className="w-full sm:flex-1 bg-[#1C2733] text-white font-bold py-3 sm:py-3.5 rounded-xl hover:bg-[#5B6A78] transition-all text-[13px]"
              >
                {language === 'en' ? 'Export PDF' : 'تصدير PDF'}
              </button>
              {selectedInvoice.status !== "debt_payment" && selectedInvoice.paymentMethod !== "debt_payment" && selectedInvoice.paymentMethod !== "تسديد دين" && (
                <button
                  onClick={() => {
                    router.push(`/pos?edit=${selectedInvoice.id}`);
                  }}
                  className="w-full sm:flex-[1.2] bg-white text-primary border-2 border-primary font-bold py-3 sm:py-3.5 rounded-xl hover:bg-primary-pale transition-all text-[13px]"
                >
                  {language === 'en' ? 'Edit Invoice' : 'تعديل الفاتورة'}
                </button>
              )}
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full sm:flex-[1.2] bg-primary text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all text-[13px]"
              >
                {language === 'en' ? 'Close' : 'إغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
