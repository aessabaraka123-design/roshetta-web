"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import Link from "next/link";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Customers() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    branch_id: "",
  });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerSales, setCustomerSales] = useState<any[]>([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [salesFilter, setSalesFilter] = useState<
    "cash" | "credit" | "payments"
  >("cash");

  const [branchFilter, setBranchFilter] = useState("all");
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

  const userBranchObj = branches.find((b: any) => b.name === user?.branch);
  let activeBranchId = branchFilter;
  if (user?.role === "صيدلي" || user?.role === "مدير فرع") {
    activeBranchId = userBranchObj ? userBranchObj.id : "PENDING";
  }

  const { data, mutate } = useSWR(
    user && activeBranchId !== "PENDING"
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/customers?branch_id=${activeBranchId}`
      : null,
    fetcher,
  );
  const customers = data?.customers || [];

  const fetchCustomerSales = async (customerId: string) => {
    try {
      const [resSales, resPayments] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/customers/${customerId}/sales`,
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/customers/${customerId}/debt-payments`,
        ),
      ]);
      const dataSales = await resSales.json();
      const dataPayments = await resPayments.json();

      if (dataSales.success) setCustomerSales(dataSales.sales);
      if (dataPayments.success) setCustomerPayments(dataPayments.payments);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/customers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newCustomer,
            branch_id: newCustomer.branch_id
              ? newCustomer.branch_id
              : activeBranchId !== "all" && activeBranchId !== "PENDING"
                ? activeBranchId
                : null,
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success("تم إضافة العميل بنجاح!");
        setShowAddModal(false);
        setNewCustomer({ name: "", phone: "", branch_id: "" });
        mutate();
      } else {
        toast.error(result.error || "فشل الإضافة");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (
      !paymentAmount ||
      isNaN(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    )
      return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/customers/${selectedCustomer.id}/debt`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payment: Number(paymentAmount) }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success("تم تسجيل الدفعة بنجاح!");
        setShowPayModal(false);
        setPaymentAmount("");
        setSelectedCustomer(null);
        mutate();
      } else {
        toast.error(result.error || "فشل التسجيل");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AppBar />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-bold text-primary flex items-center gap-2">
            العملاء والمرضى
          </h1>
          <p className="text-[15px] text-ink-soft mt-1">
            قاعدة بيانات الزبائن المترددين وإدارة حساباتهم
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-teal transition-all"
        >
          + إضافة عميل جديد
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden">
        <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="ابحث باسم العميل أو رقم الجوال..."
            />
          </div>
          {user?.role === "manager" && branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="p-2.5 border border-mint-line bg-white rounded-xl text-[14px] focus:outline-none focus:border-primary shadow-sm font-bold text-primary min-w-[150px]"
            >
              <option value="all">كل الفروع</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-mint-line text-ink-soft text-[14px]">
              <th className="py-3 px-5 font-semibold">اسم العميل</th>
              <th className="py-3 px-5 font-semibold">رقم التواصل</th>
              <th className="py-3 px-5 font-semibold">آخر زيارة</th>
              <th className="py-3 px-5 font-semibold">الرصيد / الديون</th>
              <th className="py-3 px-5 font-semibold text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers
              .filter(
                (c: any) => c.name.includes(search) || c.phone.includes(search),
              )
              .map((customer: any) => (
                <tr
                  key={customer.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-5 font-bold text-primary text-[14px]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-pale text-primary flex items-center justify-center text-[12px]">
                        {customer.name.substring(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-[11px] font-mono text-ink-soft">
                          {customer.id}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 font-mono text-[14px] text-ink-soft">
                    {customer.phone}
                  </td>
                  <td className="py-4 px-5 text-[14px] text-ink-soft">
                    {customer.lastVisit || "لا يوجد زيارات"}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`font-bold text-[14px] ${customer.debt > 0 ? "text-coral" : "text-teal"}`}
                    >
                      {customer.debt > 0
                        ? `-$${customer.debt.toFixed(2)}`
                        : "$0.00"}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSales([]);
                          setShowProfileModal(true);
                          fetchCustomerSales(customer.id);
                        }}
                        className="px-3 py-1.5 text-[12px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary-pale/80 transition-all shadow-sm"
                      >
                        تفاصيل الملف
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowPayModal(true);
                        }}
                        className="bg-coral-pale/20 text-coral text-[12px] font-bold px-3 py-1.5 rounded-lg border border-coral/30 hover:bg-coral hover:text-white transition-all flex items-center gap-1"
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
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        إيداع / تسديد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-ink-soft text-[15px]"
                >
                  لا يوجد عملاء مسجلين
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-[20px] font-bold text-ink mb-6">
              إضافة عميل جديد
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  اسم العميل بالكامل
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors"
                  placeholder="مثال: يوسف أحمد"
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  رقم الهاتف / الجوال
                </label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal text-left font-mono transition-colors"
                  placeholder="059XXXXXXX"
                  dir="ltr"
                />
              </div>
              {user?.role === "manager" && branches.length > 0 && (
                <div>
                  <label className="block text-[14px] font-bold text-ink-soft mb-2">
                    الفرع
                  </label>
                  <select
                    value={newCustomer.branch_id || ""}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        branch_id: e.target.value,
                      })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors text-[14px] font-bold text-primary"
                  >
                    <option value="">الفرع الرئيسي (لكل الفروع)</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={isLoading || !newCustomer.name || !newCustomer.phone}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {isLoading ? "جاري الإضافة..." : "حفظ العميل"}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayModal && selectedCustomer && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                تسديد دفعة مالية
              </h3>
              <button
                onClick={() => setShowPayModal(false)}
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
              <div
                className={`border rounded-xl p-4 flex justify-between items-center ${selectedCustomer.debt < 0 ? "bg-teal-pale/30 border-teal-pale" : "bg-coral-pale/30 border-coral-pale"}`}
              >
                <span className="font-bold text-ink-soft text-[14px]">
                  {selectedCustomer.debt < 0
                    ? "الرصيد المتاح للعميل:"
                    : "الديون المتبقية:"}
                </span>
                <span
                  className={`font-black text-[18px] ${selectedCustomer.debt < 0 ? "text-teal" : "text-coral"}`}
                >
                  ₪{Math.abs(selectedCustomer.debt).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  المبلغ المدفوع ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal text-left font-mono transition-colors text-[18px]"
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePayment}
                disabled={isLoading || !paymentAmount}
                className="flex-1 bg-teal text-white font-bold py-3.5 rounded-xl shadow-md shadow-teal/20 hover:bg-[#259775] transition-all disabled:opacity-50"
              >
                {isLoading ? "جاري التسجيل..." : "تأكيد الدفع"}
              </button>
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Profile Modal */}
      {showProfileModal && selectedCustomer && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-mint-line animate-fade-in-up">
            {/* Header */}
            <div className="p-6 border-b border-mint-line bg-bg flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-[20px] font-black shadow-sm">
                  {selectedCustomer.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-[24px] font-black text-primary leading-none mb-1">
                    {selectedCustomer.name}
                  </h3>
                  <div className="flex gap-3 text-[14px] font-mono font-bold text-ink-soft">
                    <span>{selectedCustomer.phone}</span>
                    <span>•</span>
                    <span>{selectedCustomer.id}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-white rounded-full shadow-sm border border-mint-line"
              >
                <svg
                  className="w-6 h-6"
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

            {/* Content */}
            <div className="p-6 overflow-y-auto bg-[#F8FAFC]">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div
                  className={`flex flex-col items-center justify-center p-6 border rounded-xl shadow-sm ${selectedCustomer.debt < 0 ? "border-teal/30 bg-teal-pale/10" : "border-mint-line bg-white"}`}
                >
                  <span className="text-[13px] font-bold text-ink-soft mb-2">
                    {selectedCustomer.debt < 0
                      ? "رصيد العميل المتاح"
                      : "إجمالي الديون المتبقية"}
                  </span>
                  <span
                    className={`text-[28px] font-mono font-black ${selectedCustomer.debt < 0 ? "text-teal" : "text-coral"}`}
                  >
                    ₪{Math.abs(selectedCustomer.debt).toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm flex flex-col items-center justify-center">
                  <div className="text-[14px] font-bold text-ink-soft mb-2">
                    تاريخ آخر زيارة
                  </div>
                  <div className="text-[22px] font-mono font-black text-primary">
                    {selectedCustomer.lastVisit || "لا يوجد"}
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h4 className="text-[18px] font-black text-primary mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-teal"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  سجل المشتريات (الفواتير)
                </h4>
                <div className="flex items-center gap-2 mb-4 bg-[#F8FAFC] p-1.5 rounded-xl border border-mint-line w-full">
                  <button
                    onClick={() => setSalesFilter("cash")}
                    className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${salesFilter === "cash" ? "bg-white shadow-sm text-teal" : "text-ink-soft hover:text-primary"}`}
                  >
                    المبيعات المدفوعة
                  </button>
                  <button
                    onClick={() => setSalesFilter("credit")}
                    className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${salesFilter === "credit" ? "bg-white shadow-sm text-amber-dark" : "text-ink-soft hover:text-primary"}`}
                  >
                    مبيعات الأجل
                  </button>
                  <button
                    onClick={() => setSalesFilter("payments")}
                    className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${salesFilter === "payments" ? "bg-white shadow-sm text-coral" : "text-ink-soft hover:text-primary"}`}
                  >
                    سجل الدفعات
                  </button>
                  <button
                    onClick={() => setShowPayModal(true)}
                    className="flex-1 py-2 rounded-lg text-[14px] font-bold transition-all bg-coral-pale/20 text-coral hover:bg-coral hover:text-white border border-coral/30"
                  >
                    إيداع / تسديد
                  </button>
                </div>

                {salesFilter === "payments" ? (
                  customerPayments.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-mint-line text-center">
                      <div className="text-ink-soft font-bold text-[15px]">
                        لا توجد دفعات مالية مسجلة لهذا العميل.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customerPayments.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="bg-white rounded-2xl border border-mint-line p-5 shadow-sm flex justify-between items-center"
                        >
                          <div>
                            <div className="text-[14px] font-mono font-bold text-ink-soft mb-1">
                              {payment.id}
                            </div>
                            <div className="text-[15px] font-bold text-primary flex gap-2 items-center">
                              {new Date(payment.date).toLocaleString("ar-EG")}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-[13px] font-bold text-ink-soft mb-1">
                              المبلغ المدفوع
                            </div>
                            <div className="text-[20px] font-mono font-black text-coral">
                              ₪{payment.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : customerSales.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-mint-line text-center">
                    <div className="text-ink-soft font-bold text-[15px]">
                      لا يوجد سجل مشتريات حتى الآن.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerSales.filter((sale: any) => {
                      if (salesFilter === "cash")
                        return (
                          sale.paymentMethod !== "credit" &&
                          sale.paymentMethod !== "آجل"
                        );
                      if (salesFilter === "credit")
                        return (
                          sale.paymentMethod === "credit" ||
                          sale.paymentMethod === "آجل"
                        );
                      return true;
                    }).length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 border border-mint-line text-center">
                        <div className="text-ink-soft font-bold text-[15px]">
                          لا توجد فواتير مطابقة للفلتر المحدد.
                        </div>
                      </div>
                    ) : (
                      customerSales
                        .filter((sale: any) => {
                          if (salesFilter === "cash")
                            return (
                              sale.paymentMethod !== "credit" &&
                              sale.paymentMethod !== "آجل"
                            );
                          if (salesFilter === "credit")
                            return (
                              sale.paymentMethod === "credit" ||
                              sale.paymentMethod === "آجل"
                            );
                          return true;
                        })
                        .map((sale: any) => (
                          <div
                            key={sale.id}
                            className="bg-white rounded-2xl border border-mint-line p-5 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex justify-between items-start mb-4 border-b border-mint-line pb-4">
                              <div>
                                <div className="text-[14px] font-mono font-bold text-ink-soft mb-1">
                                  {sale.id}
                                </div>
                                <div className="text-[15px] font-bold text-primary flex gap-2 items-center">
                                  {new Date(sale.date).toLocaleString("ar-EG")}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      sale.paymentMethod === "credit" ||
                                      sale.paymentMethod === "آجل"
                                        ? "bg-amber-pale text-[#B9791C]"
                                        : "bg-teal-pale text-teal"
                                    }`}
                                  >
                                    {sale.paymentMethod === "credit" ||
                                    sale.paymentMethod === "آجل"
                                      ? "آجل (دين)"
                                      : sale.paymentMethod}
                                  </span>
                                </div>
                              </div>
                              <div className="text-left">
                                <div className="text-[13px] font-bold text-ink-soft mb-1">
                                  الإجمالي
                                </div>
                                <div className="text-[20px] font-mono font-black text-teal">
                                  ₪{sale.total.toFixed(2)}
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#F8FAFC] rounded-xl p-3 border border-mint-line/50">
                              <div className="text-[12px] font-bold text-ink-soft mb-2">
                                الأصناف المشتراة:
                              </div>
                              <div className="space-y-2">
                                {sale.items.map((item: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center text-[14px]"
                                  >
                                    <span className="font-bold text-ink">
                                      <span className="text-teal ml-2">
                                        {item.cartQty || item.qty}x
                                      </span>
                                      {item.name}
                                    </span>
                                    <span className="font-mono font-bold text-ink-soft">
                                      ₪
                                      {(
                                        item.price * (item.cartQty || item.qty)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
