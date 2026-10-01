"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PharmacyManager() {
  const router = useRouter();
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user) router.push("/login");
    else if ((user as any)?.role !== "manager") {
      toast.error("ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<
    "branches" | "staff" | "reports" | "settings" | "subscription"
  >("branches");
  const [search, setSearch] = useState("");
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseData, setExpenseData] = useState({
    title: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "نثريات",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [staffToFire, setStaffToFire] = useState<any>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    manager: "",
    status: "preparing",
  });
  const [showAdminPasswords, setShowAdminPasswords] = useState(false);

  const { data: bData, mutate: mutateBranches } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const branches = bData?.branches || [];

  const { data: sData, mutate: mutateStaff } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff`
      : null,
    fetcher,
  );
  const staff = sData?.staff || [];

  const { data: dashboardData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/dashboard`
      : null,
    fetcher,
  );
  const totalDebt = dashboardData?.stats?.suppliersDebt || 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: reportResp } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/reports?from=${todayStr}&to=${todayStr}`
      : null,
    fetcher,
  );

  const finances = {
    dailyRevenue: reportResp?.data?.totalRevenue || 0,
    dailyCogs:
      (reportResp?.data?.totalRevenue || 0) -
      (reportResp?.data?.totalProfit || 0),
    dailyExpenses: dashboardData?.stats?.expensesToday || 0,
  };

  const [includeSalaries, setIncludeSalaries] = useState(true);

  const totalMonthlySalaries = staff.reduce((total: number, employee: any) => {
    const salaryStr = employee?.salary ? String(employee.salary) : "0";
    const salaryValue = parseInt(salaryStr.replace(/\D/g, ""), 10) || 0;
    return total + salaryValue;
  }, 0);

  const dailySalaries = Math.round(totalMonthlySalaries / 30);
  const grossProfit =
    finances.dailyRevenue - finances.dailyCogs - finances.dailyExpenses;
  const netProfit = includeSalaries ? grossProfit - dailySalaries : grossProfit;

  return (
    <>
      <AppBar />

      <div className="mb-8 flex justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-mint-line relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute left-0 top-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute right-10 bottom-0 w-24 h-24 bg-teal/5 rounded-full blur-2xl"></div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary to-teal text-white rounded-2xl flex items-center justify-center text-[24px] font-bold shadow-md shadow-primary/20 rotate-3">
            س
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[24px] font-bold text-ink">
                أهلاً بك، {(user as any)?.name || user?.username || "المدير العام"} 👋
              </h1>
              <span className="bg-primary-pale text-primary text-[12px] font-bold px-3 py-1 rounded-full">
                المدير العام
              </span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[15px] text-ink-soft">
                إدارة الفروع، الموظفين، والصلاحيات الخاصة بشبكة الصيدليات
              </p>
              <span className="text-mint-line">|</span>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="text-[13px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
                تعديل الملف الشخصي
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          {activeTab === "branches" ? (
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-teal transition-all"
            >
              + فرع جديد
            </button>
          ) : (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-teal transition-all"
            >
              + موظف جديد
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Branches */}
        <div className="bg-gradient-to-bl from-white to-mint-line/30 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="text-[16px] text-ink-soft font-bold">
              إجمالي الفروع
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          <div className="font-mono text-[38px] font-bold text-primary flex items-baseline gap-2 relative z-10">
            {branches.length}
            <span className="text-[15px] font-sans font-bold text-ink-soft">
              فروع نشطة
            </span>
          </div>
        </div>

        {/* Card 2: Staff */}
        <div className="bg-gradient-to-bl from-white to-teal-pale/50 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-teal/5 rounded-full blur-2xl group-hover:bg-teal/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="text-[16px] text-ink-soft font-bold">
              إجمالي الموظفين
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-pale flex items-center justify-center">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <div className="font-mono text-[38px] font-bold text-teal flex items-baseline gap-2 relative z-10">
            {staff.length}
            <span className="text-[15px] font-sans font-bold text-ink-soft">
              صيادلة
            </span>
          </div>
        </div>

        {/* Card 3: Debt */}
        <div className="bg-gradient-to-bl from-white to-coral-pale/40 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-coral/5 rounded-full blur-2xl group-hover:bg-coral/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="text-[16px] text-ink-soft font-bold">
              الحسابات والديون
            </div>
            <div className="w-10 h-10 rounded-full bg-coral-pale flex items-center justify-center">
              <svg
                className="w-5 h-5 text-coral"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="font-mono text-[38px] font-bold text-coral flex items-baseline gap-2 relative z-10">
            {totalDebt}
            <span className="text-[15px] font-sans font-bold text-ink-soft">
              ₪ للموردين
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden flex flex-col h-[500px] mb-8">
        <div className="flex border-b border-mint-line overflow-x-auto">
          <button
            onClick={() => setActiveTab("branches")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "branches"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            إدارة الفروع
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`min-w-[150px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "staff"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            الموظفون
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "reports"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            التقارير المالية 📊
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            إعدادات النظام ⚙️
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "subscription"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            الاشتراك والفواتير 💳
          </button>
        </div>

        {["branches", "staff"].includes(activeTab) && (
          <div className="p-4 bg-bg border-b border-mint-line">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === "branches" ? "ابحث عن فرع..." : "ابحث عن موظف..."
              }
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTab === "branches" && (
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-mint-line text-ink-soft text-[14px] bg-card">
                  <th className="py-3 px-5 font-semibold">رقم الفرع</th>
                  <th className="py-3 px-5 font-semibold">اسم الفرع</th>
                  <th className="py-3 px-5 font-semibold">المدير المسؤول</th>
                  <th className="py-3 px-5 font-semibold">عدد الموظفين</th>
                  <th className="py-3 px-5 font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((br: any, index: number) => (
                  <tr
                    key={br.id}
                    className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                  >
                    <td className="py-4 px-5 font-mono text-[14px] font-bold text-ink">
                      BR-{String(index + 1).padStart(3, "0")}
                    </td>
                    <td className="py-4 px-5 text-[15px] font-bold text-primary">
                      {br.name}
                    </td>
                    <td className="py-4 px-5 text-[14px] text-ink-soft">
                      {br.manager}
                    </td>
                    <td className="py-4 px-5 text-[14px]">
                      {br.staffCount} صيادلة
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2 py-1 rounded-md text-[12px] font-bold ${
                          br.status === "active"
                            ? "bg-teal-pale text-teal"
                            : "bg-amber-pale text-amber"
                        }`}
                      >
                        {br.status === "active" ? "يعمل" : "قيد التجهيز"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "staff" && (
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-mint-line text-ink-soft text-[14px] bg-card">
                  <th className="py-3 px-5 font-semibold">الرقم الوظيفي</th>
                  <th className="py-3 px-5 font-semibold">اسم الموظف</th>
                  <th className="py-3 px-5 font-semibold">المسمى الوظيفي</th>
                  <th className="py-3 px-5 font-semibold">الفرع التابع له</th>
                  <th className="py-3 px-5 font-semibold">الراتب الأساسي</th>
                  <th className="py-3 px-5 font-semibold">الحالة</th>
                  <th className="py-3 px-5 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((st: any, index: number) => (
                  <tr
                    key={st.id}
                    className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                  >
                    <td className="py-4 px-5 font-mono text-[14px] font-bold text-ink">
                      EMP-{String(index + 1).padStart(3, "0")}
                    </td>
                    <td className="py-4 px-5 text-[15px] font-bold text-primary">
                      {st.name}
                    </td>
                    <td className="py-4 px-5 text-[14px] text-ink-soft">
                      {st.role}
                    </td>
                    <td className="py-4 px-5 text-[14px]">{st.branch}</td>
                    <td className="py-4 px-5 text-[14px] font-bold text-coral">
                      {st.salary}
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2 py-1 rounded-md text-[12px] font-bold ${
                          st.status === "active"
                            ? "bg-teal-pale text-teal"
                            : st.status === "suspended"
                              ? "bg-coral-pale text-coral"
                              : "bg-amber-pale text-amber"
                        }`}
                      >
                        {st.status === "active"
                          ? "على رأس العمل"
                          : st.status === "suspended"
                            ? "موقوف"
                            : "إجازة"}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            setEditingStaff(st);
                            setShowAddStaffModal(true);
                          }}
                          className="text-[13px] font-bold text-primary hover:underline hover:text-teal transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const newStatus =
                                st.status === "active" ? "suspended" : "active";
                              const res = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${st.id}`,
                                {
                                  method: "PUT",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    ...st,
                                    status: newStatus,
                                  }),
                                },
                              );
                              if ((await res.json()).success) {
                                mutateStaff();
                                toast.success(
                                  newStatus === "suspended"
                                    ? "تم إيقاف الموظف مؤقتاً"
                                    : "تم إعادة الموظف للعمل",
                                );
                              }
                            } catch (e) {}
                          }}
                          className={`text-[13px] font-bold hover:underline transition-colors ${st.status === "active" ? "text-amber" : "text-teal"}`}
                        >
                          {st.status === "active" ? "توقيف" : "تفعيل"}
                        </button>
                        <button
                          onClick={() => setStaffToFire(st)}
                          className="text-[13px] font-bold text-coral hover:underline transition-colors"
                        >
                          فصل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "reports" && (
            <div className="p-6 bg-bg h-full flex flex-col gap-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                <div>
                  <h3 className="font-bold text-[18px] text-primary mb-1">
                    التقارير المالية والأرباح
                  </h3>
                  <p className="text-[13px] text-ink-soft">
                    تحكم في المعادلات المالية واطّلع على صافي الأرباح اليومية.
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-mint-bg p-2 px-4 rounded-xl border border-mint-line">
                  <span className="text-[14px] font-bold text-ink">
                    تضمين رواتب الموظفين في حساب المصروفات؟
                  </span>
                  <button
                    onClick={() => setIncludeSalaries(!includeSalaries)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${includeSalaries ? "bg-primary" : "bg-[#E1E9E3]"}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${includeSalaries ? "right-1" : "right-7"}`}
                    ></div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                  <div className="text-[13px] text-ink-soft font-bold mb-2">
                    المبيعات اليومية 🟢
                  </div>
                  <div className="text-[24px] font-black font-mono text-teal">
                    {finances.dailyRevenue.toLocaleString()} ₪
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                  <div className="text-[13px] text-ink-soft font-bold mb-2">
                    تكلفة البضاعة المباعة 🔴
                  </div>
                  <div className="text-[24px] font-black font-mono text-coral">
                    {finances.dailyCogs.toLocaleString()} ₪
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm relative">
                  <div className="text-[13px] text-ink-soft font-bold mb-2">
                    مصروفات أخرى 🔴
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[24px] font-black font-mono text-coral">
                      {finances.dailyExpenses.toLocaleString()} ₪
                    </div>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="text-[12px] font-bold text-coral bg-coral-pale px-3 py-1 rounded-lg hover:bg-coral hover:text-white transition-colors"
                    >
                      + إضافة مصروف
                    </button>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] text-ink-soft font-bold">
                      الرواتب (يومي) {includeSalaries ? "🔴" : "⚪"}
                    </span>
                  </div>
                  <div
                    className={`text-[24px] font-black font-mono ${includeSalaries ? "text-coral" : "text-ink-soft opacity-50 line-through"}`}
                  >
                    {dailySalaries.toLocaleString()} ₪
                  </div>
                </div>
              </div>

              <div
                className={`mt-2 p-6 rounded-2xl border flex justify-between items-center transition-all ${netProfit >= 0 ? "bg-teal-pale border-teal/20" : "bg-coral-pale border-coral/20"}`}
              >
                <div>
                  <div
                    className={`text-[16px] font-black mb-1 ${netProfit >= 0 ? "text-teal" : "text-coral"}`}
                  >
                    {includeSalaries
                      ? "الربح الصافي (Net Profit)"
                      : "الربح التشغيلي (Gross Profit)"}
                  </div>
                  <div className="text-[13px] text-ink-soft font-bold">
                    معادلة الحساب: المبيعات - تكلفة البضاعة - المصروفات{" "}
                    {includeSalaries ? "- الرواتب" : ""}
                  </div>
                </div>
                <div
                  className={`text-[42px] font-black font-mono ${netProfit >= 0 ? "text-teal" : "text-coral"}`}
                >
                  {netProfit > 0 ? "+" : ""}
                  {netProfit.toLocaleString()} ₪
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="p-6 bg-bg h-full flex flex-col gap-6 overflow-y-auto">
              <div className="bg-white p-6 rounded-2xl border border-mint-line shadow-sm">
                <h3 className="font-bold text-[18px] text-primary mb-4 border-b border-mint-line pb-3">
                  السياسات المالية والصلاحيات (تطبق على جميع الفروع)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        الحد الأقصى للخصم للكاشير (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="3"
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        الحد الأقصى للخصم لمدير الفرع (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="15"
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        المدة المسموحة للإرجاع (بالأيام)
                      </label>
                      <input
                        type="number"
                        defaultValue="14"
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-mint-bg rounded-xl border border-mint-line mt-2">
                      <span className="text-[14px] font-bold text-ink">
                        تفعيل تنبيهات نواقص المخزون المركزية
                      </span>
                      <button className="w-12 h-6 rounded-full relative transition-colors bg-primary">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 transition-all"></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-teal transition-colors">
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="p-6 bg-bg h-full flex flex-col gap-6 overflow-y-auto">
              <div className="bg-gradient-to-r from-primary to-teal p-6 rounded-3xl shadow-md text-white relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="font-black text-[22px] mb-1">
                      الاشتراك السنوي (Premium)
                    </h3>
                    <p className="text-white/80 font-bold mb-4">
                      يسمح لك بإدارة حتى 5 فروع مع تقارير متقدمة.
                    </p>

                    <div className="flex gap-4">
                      <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-[12px] text-white/80">
                          الفروع المستخدمة
                        </div>
                        <div className="font-bold font-mono text-[18px]">
                          3 / 5
                        </div>
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-[12px] text-white/80">
                          تاريخ التجديد القادم
                        </div>
                        <div className="font-bold font-mono text-[18px]">
                          2027/05/10
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <a
                      href="/pricing"
                      className="bg-white text-primary text-center px-6 py-3 rounded-xl font-black shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                    >
                      ترقية الباقة (فروع أكثر)
                    </a>
                    <button className="bg-transparent border-2 border-white/30 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">
                      تحميل فواتير الاشتراك
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credentials Section */}
      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden mb-8">
        <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
          <h2 className="text-[18px] font-bold text-primary">
            بيانات الدخول للموظفين
          </h2>
          <span className="text-[13px] text-ink-soft bg-primary-pale px-3 py-1 rounded-lg">
            بيانات سرية 🔒
          </span>
        </div>
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-mint-line text-ink-soft text-[14px]">
              <th className="py-3 px-5 font-semibold">اسم الموظف</th>
              <th className="py-3 px-5 font-semibold">كلمة المرور</th>
              <th className="py-3 px-5 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((st: any, i: number) => (
              <tr
                key={st.id}
                className="border-b border-mint-line/30 hover:bg-bg/30 transition-all"
              >
                <td className="py-4 px-5 font-bold text-[14px] text-primary">
                  {st.name}
                </td>
                <td
                  className="py-4 px-5 font-mono text-[14px] text-ink bg-mint-line/20 rounded-md w-fit inline-block my-2 mx-5 px-3 py-1 border border-mint-line"
                  dir="ltr"
                >
                  ••••••••
                </td>
                <td className="py-4 px-5">
                  <button
                    onClick={async () => {
                      setEditingStaff(st);
                      setShowAddStaffModal(true);
                    }}
                    className="text-[13px] font-bold text-primary hover:underline hover:text-teal transition-colors"
                  >
                    تعديل البيانات
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-mint-line overflow-hidden">
            <div className="p-5 border-b border-mint-line flex justify-between items-center bg-bg">
              <h3 className="font-bold text-[18px] text-primary">
                إضافة مصروف جديد
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-mint-line flex items-center justify-center text-ink-soft hover:text-coral hover:border-coral transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  نوع المصروف
                </label>
                <select
                  value={expenseData.type}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, type: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px]"
                >
                  <option value="نثريات">نثريات (ضيافة، تنظيف...)</option>
                  <option value="فواتير">فواتير (كهرباء، ماء، إنترنت)</option>
                  <option value="صيانة">صيانة وإصلاحات</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  وصف المصروف
                </label>
                <input
                  type="text"
                  value={expenseData.title}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, title: e.target.value })
                  }
                  placeholder="مثال: فاتورة كهرباء شهر ٨"
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    المبلغ (₪)
                  </label>
                  <input
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) =>
                      setExpenseData({ ...expenseData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px] font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    التاريخ
                  </label>
                  <input
                    type="date"
                    value={expenseData.date}
                    onChange={(e) =>
                      setExpenseData({ ...expenseData, date: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px]"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-mint-line bg-bg flex justify-end gap-3">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-6 py-2 rounded-xl font-bold text-ink-soft hover:bg-white hover:text-coral transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!expenseData.title || !expenseData.amount) {
                    toast.error("يرجى تعبئة الحقول");
                    return;
                  }
                  try {
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/expenses`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: expenseData.title,
                          amount: parseFloat(expenseData.amount),
                          date: expenseData.date || new Date().toISOString(),
                          type: expenseData.type,
                          branch_id: null, // Admin level expense
                        }),
                      },
                    );
                    if ((await res.json()).success) {
                      toast.success("تم تسجيل المصروف بنجاح");
                      setShowExpenseModal(false);
                      setExpenseData({
                        title: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        type: "نثريات",
                      });
                    }
                  } catch (e) {}
                }}
                className="px-6 py-2 rounded-xl font-bold text-white bg-primary hover:bg-teal transition-colors shadow-md shadow-primary/20"
              >
                حفظ المصروف
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStaffModal && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-[20px] font-bold text-ink mb-6">
              {editingStaff ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  اسم الموظف
                </label>
                <input
                  type="text"
                  value={editingStaff?.name || ""}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, name: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder="الاسم الرباعي"
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  المسمى الوظيفي
                </label>
                <select
                  value={editingStaff?.role || "صيدلي / كاشير"}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option>صيدلي / كاشير</option>
                  <option>مدير فرع</option>
                  <option>مساعد صيدلي</option>
                  <option>مستودع</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  الفرع التابع له
                </label>
                <select
                  value={editingStaff?.branch || ""}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, branch: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">اختر الفرع...</option>
                  {branches.map((br: any) => (
                    <option key={br.id} value={br.name}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    الراتب الأساسي
                  </label>
                  <input
                    type="text"
                    value={editingStaff?.salary || ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        salary: e.target.value,
                      })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    placeholder="مثال: 1500"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    placeholder="059xxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    اسم المستخدم (للدخول)
                  </label>
                  <input
                    type="text"
                    value={editingStaff?.username || ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        username: e.target.value,
                      })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-left"
                    placeholder="user123"
                    dir="ltr"
                  />
                </div>
                <div className="relative">
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editingStaff?.password || ""}
                      onChange={(e) =>
                        setEditingStaff({
                          ...editingStaff,
                          password: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-left"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 text-ink-soft hover:text-primary transition-colors"
                      title={
                        showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                      }
                    >
                      {showPassword ? (
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
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  if (editingStaff?.id) {
                    try {
                      const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${editingStaff.id}`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...editingStaff }),
                        },
                      );
                      if ((await res.json()).success) {
                        mutateStaff();
                        toast.success("تم تحديث بيانات الموظف بنجاح!");
                      } else toast.error("حدث خطأ أثناء التحديث");
                    } catch (e) {
                      toast.error("تعذر الاتصال بالخادم");
                    }
                  } else {
                    try {
                      const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ...editingStaff }),
                        },
                      );
                      if ((await res.json()).success) {
                        mutateStaff();
                        toast.success("تم إضافة الموظف الجديد بنجاح!");
                      } else toast.error("حدث خطأ أثناء الإضافة");
                    } catch (e) {
                      toast.error("تعذر الاتصال بالخادم");
                    }
                  }
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                  setEditingStaff(null);
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all"
              >
                {editingStaff?.id ? "حفظ التعديلات" : "تعيين الموظف"}
              </button>
              <button
                onClick={async () => {
                  setShowAddStaffModal(false);
                  setEditingStaff(null);
                }}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fire Confirmation Modal */}
      {staffToFire && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-coral/20 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-coral-pale text-coral rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-ink mb-2">
              تأكيد فصل الموظف
            </h3>
            <p className="text-[15px] text-ink-soft mb-8">
              هل أنت متأكد من رغبتك في فصل الموظف{" "}
              <span className="font-bold text-ink">{staffToFire.name}</span>{" "}
              نهائياً من النظام؟
            </p>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${staffToFire.id}`,
                      {
                        method: "DELETE",
                      },
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateStaff();
                      setStaffToFire(null);
                      toast.success("تم!");
                    } else toast.error(data.error);
                  } catch (e) {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-coral text-white font-bold rounded-xl hover:bg-coral/90 transition-all shadow-[0_4px_12px_rgba(235,93,80,0.3)]"
              >
                نعم، تأكيد الفصل
              </button>
              <button
                onClick={() => setStaffToFire(null)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Profile Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8">
            <h3 className="text-[20px] font-bold text-ink mb-6 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              تعديل الملف الشخصي للإدارة
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    الاسم بالكامل
                  </label>
                  <input
                    type="text"
                    defaultValue="د. سامر سلمان"
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    defaultValue="0591234567"
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  البريد الإلكتروني (اسم المستخدم)
                </label>
                <input
                  type="email"
                  defaultValue="admin@roshetta.com"
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-left"
                  dir="ltr"
                />
              </div>

              <div className="pt-6 border-t border-mint-line/50 mt-6 relative">
                <h4 className="text-[16px] font-bold text-ink mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-amber"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  تغيير كلمة المرور
                </h4>
                <div className="relative mb-4">
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    كلمة المرور الحالية
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPasswords ? "text" : "password"}
                      className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-left"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasswords(!showAdminPasswords)}
                      className="absolute left-3 top-3.5 text-ink-soft hover:text-primary transition-colors z-10"
                    >
                      {showAdminPasswords ? (
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
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
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
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPasswords ? "text" : "password"}
                        className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-left"
                        placeholder="••••••••"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowAdminPasswords(!showAdminPasswords)
                        }
                        className="absolute left-3 top-3.5 text-ink-soft hover:text-primary transition-colors z-10"
                      >
                        {showAdminPasswords ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      تأكيد الكلمة الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPasswords ? "text" : "password"}
                        className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-left"
                        placeholder="••••••••"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowAdminPasswords(!showAdminPasswords)
                        }
                        className="absolute left-3 top-3.5 text-ink-soft hover:text-primary transition-colors z-10"
                      >
                        {showAdminPasswords ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        ) : (
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  toast.success("تم حفظ تعديلات الملف الشخصي بنجاح!");
                  setShowChangePasswordModal(false);
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all shadow-md shadow-primary/20"
              >
                حفظ التعديلات
              </button>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <h3 className="text-[20px] font-bold text-ink mb-6">
              إضافة فرع جديد
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  اسم الفرع / المنطقة
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, name: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder="مثال: فرع النصيرات"
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  المدير المسؤول عن الفرع
                </label>
                <input
                  type="text"
                  value={newBranch.manager}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, manager: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder="اسم الصيدلي"
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  حالة الفرع المبدئية
                </label>
                <select
                  value={newBranch.status}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, status: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="preparing">قيد التجهيز</option>
                  <option value="active">يعمل</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  if (!newBranch.name || !newBranch.manager) {
                    toast.error("يرجى تعبئة بيانات الفرع");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/branches`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: newBranch.name,
                          addr: newBranch.manager || "",
                        }),
                      },
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateBranches();
                      setNewBranch({
                        name: "",
                        manager: "",
                        status: "preparing",
                      });
                      setShowAddBranchModal(false);
                      toast.success("تم!");
                    } else toast.error(data.error);
                  } catch (e) {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all shadow-md shadow-primary/20"
              >
                حفظ وإضافة
              </button>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
