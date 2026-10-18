"use client";

import { API_BASE_URL } from "@/lib/config";
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
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const login = useStore((state: any) => state.login);

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && (localStorage.getItem("roshetta_user") || localStorage.getItem("roshetta-web-storage"));
      if (!hasStored) {
        router.push("/login");
      }
    }
    else if ((user as any)?.role !== "manager" && (user as any)?.role !== "owner" && (user as any)?.role !== "admin") {
      toast.error(language === "en" ? "You do not have permission to access this page" : "ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router, language]);

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
    type: language === "en" ? "Sundries" : "نثريات",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [staffToFire, setStaffToFire] = useState<any>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    manager: "",
    status: "active",
  });
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [showAdminPasswords, setShowAdminPasswords] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    phone: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [systemSettings, setSystemSettings] = useState({
    cashierMaxDiscount: "3",
    managerMaxDiscount: "15",
    returnDays: "14",
    stockAlertsEnabled: true,
  });

  useEffect(() => {
    if (user) {
      setAdminForm((prev) => ({
        ...prev,
        name: (user as any)?.name || (user as any)?.managerName || "",
        phone: (user as any)?.phone || "",
        email: user?.email || "",
      }));
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`roshetta_settings_${user?.pharmacy_id}`);
        if (saved) {
          try {
            setSystemSettings(JSON.parse(saved));
          } catch (e) {}
        }
      }
    }
  }, [user]);

  const { data: bData, mutate: mutateBranches } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const branches = bData?.branches || [];

  const { data: sData, mutate: mutateStaff } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff`
      : null,
    fetcher,
  );
  const staff = sData?.staff || [];

  // Search filtering
  const filteredBranches = branches.filter((br: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (br.name && br.name.toLowerCase().includes(q)) ||
      (br.addr && br.addr.toLowerCase().includes(q))
    );
  });

  const filteredStaff = staff.filter((st: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.role && st.role.toLowerCase().includes(q)) ||
      (st.branch && st.branch.toLowerCase().includes(q)) ||
      (st.email && st.email.toLowerCase().includes(q)) ||
      (st.phone && st.phone.toLowerCase().includes(q))
    );
  });

  const { data: dashboardData } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/dashboard`
      : null,
    fetcher,
  );
  const totalDebt = dashboardData?.stats?.suppliersDebt || 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const { data: reportResp } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/reports?from=${todayStr}&to=${todayStr}`
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
            {language === "en" ? "A" : "س"}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[24px] font-bold text-ink">
                {language === "en" ? "Welcome, " : "أهلاً بك، "} {(user as any)?.name || user?.username || (language === "en" ? "General Manager" : "المدير العام")} 👋
              </h1>
              <span className="bg-primary-pale text-primary text-[12px] font-bold px-3 py-1 rounded-full">
                {language === "en" ? "General Manager" : "المدير العام"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[15px] text-ink-soft">
                {language === "en" ? "Manage branches, staff, and permissions for the pharmacy network" : "إدارة الفروع، الموظفين، والصلاحيات الخاصة بشبكة الصيدليات"}
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
                {language === "en" ? "Edit Profile" : "تعديل الملف الشخصي"}
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
              {language === "en" ? "+ New Branch" : "+ فرع جديد"}
            </button>
          ) : (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-teal transition-all"
            >
              {language === "en" ? "+ New Staff" : "+ موظف جديد"}
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
              {language === "en" ? "Total Branches" : "إجمالي الفروع"}
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
              {branches.filter((b: any) => b.status === "active" || b.status === "نشط").length}{" "}
              {language === "en" ? "Active Branches" : "فروع نشطة"}
            </span>
          </div>
        </div>

        {/* Card 2: Staff */}
        <div className="bg-gradient-to-bl from-white to-teal-pale/50 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-teal/5 rounded-full blur-2xl group-hover:bg-teal/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="text-[16px] text-ink-soft font-bold">
              {language === "en" ? "Total Staff" : "إجمالي الموظفين"}
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
              {staff.filter((s: any) => s.status === "active" || s.active === 1).length}{" "}
              {language === "en" ? "Active Staff" : "على رأس العمل"}
            </span>
          </div>
        </div>

        {/* Card 3: Debt */}
        <div className="bg-gradient-to-bl from-white to-coral-pale/40 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-coral/5 rounded-full blur-2xl group-hover:bg-coral/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-6">
            <div className="text-[16px] text-ink-soft font-bold">
              {language === "en" ? "Accounts & Debts" : "الحسابات والديون"}
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
            {Number(totalDebt).toLocaleString()}
            <span className="text-[15px] font-sans font-bold text-ink-soft">
              {language === "en" ? "₪ for Suppliers" : "₪ للموردين"}
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
            {language === "en" ? "Manage Branches" : "إدارة الفروع"}
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`min-w-[150px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "staff"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            {language === "en" ? "Staff" : "الموظفون"}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "reports"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            {language === "en" ? "Financial Reports 📊" : "التقارير المالية 📊"}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            {language === "en" ? "System Settings ⚙️" : "إعدادات النظام ⚙️"}
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`min-w-[120px] flex-1 py-4 text-center font-bold text-[14px] md:text-[15px] transition-all border-b-2 whitespace-nowrap ${
              activeTab === "subscription"
                ? "border-primary text-primary bg-primary-pale/30"
                : "border-transparent text-ink-soft hover:bg-bg"
            }`}
          >
            {language === "en" ? "Subscription & Billing 💳" : "الاشتراك والفواتير 💳"}
          </button>
        </div>

        {["branches", "staff"].includes(activeTab) && (
          <div className="p-4 bg-bg border-b border-mint-line">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={
                activeTab === "branches" ? language === "en" ? "Search for branch..." : "ابحث عن فرع..." : language === "en" ? "Search for staff..." : "ابحث عن موظف..."
              }
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {activeTab === "branches" && (
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-mint-line text-ink-soft text-[14px] bg-card">
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Branch Number" : "رقم الفرع"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Branch Name" : "اسم الفرع"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Manager in Charge" : "المدير المسؤول"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Number of Staff" : "عدد الموظفين"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Status" : "الحالة"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Actions" : "إجراءات"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-soft text-[15px]">
                      {language === "en" ? "No branches found" : "لا توجد فروع مطابقة للبحث"}
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((br: any, index: number) => {
                    const isMainBranch = br.name === "الفرع الرئيسي" || br.name === "Main Branch" || br.name?.toLowerCase().includes("main");
                    const branchStaff = staff.filter((s: any) => s.branch === br.name || s.branch === br.id || (isMainBranch && (!s.branch || s.branch === "الرئيسي")));
                    const staffCount = branchStaff.length;
                    const branchMgr = branchStaff.find((s: any) =>
                      s.role === "manager" ||
                      s.role === "branchManager" ||
                      s.role === "مدير فرع" ||
                      s.role === "مدير"
                    ) || (br.addr && br.addr !== "المقر الرئيسي" && br.addr !== "الفرع الرئيسي" ? { name: br.addr } : null);
                    const managerName = branchMgr?.name
                      ? branchMgr.name
                      : isMainBranch
                        ? (user?.name || user?.managerName || (language === "en" ? "General Manager" : "المدير العام"))
                        : (language === "en" ? "Unassigned" : "غير محدد");
                    const isActive = br.status === "active" || br.status === "نشط";

                    return (
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
                        <td className="py-4 px-5 text-[14px]">
                          <span className={managerName === "غير محدد" || managerName === "Unassigned" ? "text-ink-soft/60 italic" : "font-bold text-ink"}>
                            {managerName}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-[14px] font-bold text-ink">
                          {language === "en" ? (
                            staffCount === 0 ? (
                              <span className="text-ink-soft/60 italic font-normal">0 Staff</span>
                            ) : (
                              <span>{staffCount} Staff</span>
                            )
                          ) : (
                            staffCount === 0 ? (
                              <span className="text-ink-soft/60 italic font-normal">لا يوجد موظفون</span>
                            ) : staffCount === 1 ? (
                              <span>صيدلي واحد</span>
                            ) : staffCount === 2 ? (
                              <span>صيدليان</span>
                            ) : staffCount <= 10 ? (
                              <span>{staffCount} صيادلة</span>
                            ) : (
                              <span>{staffCount} صيدلياً</span>
                            )
                          )}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[12px] font-bold ${
                              isActive
                                ? "bg-teal-pale text-teal"
                                : "bg-amber-pale text-amber"
                            }`}
                          >
                            {isActive ? (language === "en" ? "Active" : "يعمل (نشط)") : (language === "en" ? "Preparing" : "قيد التجهيز")}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setEditingBranch({
                                  id: br.id,
                                  name: br.name,
                                  manager: branchMgr?.name || (br.addr !== "المقر الرئيسي" && br.addr !== "الفرع الرئيسي" ? br.addr : ""),
                                  status: isActive ? "active" : "preparing",
                                });
                              }}
                              className="text-[13px] font-bold text-primary hover:underline hover:text-teal transition-colors"
                            >
                              {language === "en" ? "Edit" : "تعديل"}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const newStatus = isActive ? "قيد التجهيز" : "نشط";
                                  const res = await fetch(
                                    `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches/${br.id}`,
                                    {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: br.name,
                                        addr: br.addr,
                                        status: newStatus,
                                      }),
                                    }
                                  );
                                  const data = await res.json();
                                  if (data.success) {
                                    mutateBranches();
                                    toast.success(
                                      newStatus === "نشط"
                                        ? (language === "en" ? "Branch activated successfully!" : "تم تفعيل الفرع بنجاح!")
                                        : (language === "en" ? "Branch status changed to preparing" : "تم تحويل حالة الفرع إلى قيد التجهيز")
                                    );
                                  } else {
                                    toast.error(data.error || "Failed");
                                  }
                                } catch {
                                  toast.error("Error");
                                }
                              }}
                              className={`text-[13px] font-bold hover:underline transition-colors ${
                                isActive ? "text-amber" : "text-teal"
                              }`}
                            >
                              {isActive
                                ? (language === "en" ? "Deactivate" : "إيقاف مؤقت")
                                : (language === "en" ? "Activate" : "تفعيل")}
                            </button>
                            {!isMainBranch && (
                              <button
                                onClick={() => setBranchToDelete(br)}
                                className="text-[13px] font-bold text-coral hover:underline transition-colors"
                              >
                                {language === "en" ? "Delete" : "حذف"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === "staff" && (
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-mint-line text-ink-soft text-[14px] bg-card">
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Employee ID" : "الرقم الوظيفي"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Employee Name" : "اسم الموظف"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Job Title" : "المسمى الوظيفي"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Branch" : "الفرع التابع له"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Basic Salary" : "الراتب الأساسي"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Status" : "الحالة"}</th>
                  <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Actions" : "إجراءات"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-soft text-[15px]">
                      {language === "en" ? "No staff found" : "لا يوجد موظفون مطابقون للبحث"}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((st: any, index: number) => {
                    const isActive = st.status === "active" || st.active === 1;
                    const salaryFormatted = st.salary
                      ? `${Number(String(st.salary).replace(/\D/g, "") || 0).toLocaleString()} ₪`
                      : "0 ₪";

                    return (
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
                        <td className="py-4 px-5 text-[14px]">{st.branch || (language === "en" ? "Main Branch" : "الفرع الرئيسي")}</td>
                        <td className="py-4 px-5 text-[14px] font-bold text-coral font-mono">
                          {salaryFormatted}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[12px] font-bold ${
                              isActive
                                ? "bg-teal-pale text-teal"
                                : st.status === "suspended"
                                  ? "bg-coral-pale text-coral"
                                  : "bg-amber-pale text-amber"
                            }`}
                          >
                            {isActive
                              ? (language === "en" ? "On Duty" : "على رأس العمل")
                              : st.status === "suspended"
                                ? (language === "en" ? "Suspended" : "موقوف")
                                : (language === "en" ? "On Leave" : "إجازة")}
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
                              {language === "en" ? "Edit" : "تعديل"}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const newStatus = isActive ? "suspended" : "active";
                                  const res = await fetch(
                                    `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${st.id}`,
                                    {
                                      method: "PUT",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({
                                        ...st,
                                        status: newStatus,
                                        active: newStatus === "active" ? 1 : 0,
                                      }),
                                    },
                                  );
                                  if ((await res.json()).success) {
                                    mutateStaff();
                                    toast.success(
                                      newStatus === "suspended"
                                        ? language === "en" ? "Staff member temporarily suspended" : "تم إيقاف الموظف مؤقتاً"
                                        : language === "en" ? "Staff member reinstated" : "تم إعادة الموظف للعمل",
                                    );
                                  }
                                } catch (e) {}
                              }}
                              className={`text-[13px] font-bold hover:underline transition-colors ${isActive ? "text-amber" : "text-teal"}`}
                            >
                              {isActive ? (language === "en" ? "Suspend" : "توقيف") : (language === "en" ? "Activate" : "تفعيل")}
                            </button>
                            <button
                              onClick={() => setStaffToFire(st)}
                              className="text-[13px] font-bold text-coral hover:underline transition-colors"
                            >
                              {language === "en" ? "Terminate" : "فصل"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === "reports" && (
            <div className="p-6 bg-bg h-full flex flex-col gap-6">
              <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                <div>
                  <h3 className="font-bold text-[18px] text-primary mb-1">
                    {language === "en" ? "Financial Reports & Profits" : "التقارير المالية والأرباح"}
                  </h3>
                  <p className="text-[13px] text-ink-soft">
                    {language === "en" ? "Control financial formulas and view daily net profit." : "تحكم في المعادلات المالية واطّلع على صافي الأرباح اليومية."}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-mint-bg p-2 px-4 rounded-xl border border-mint-line">
                  <span className="text-[14px] font-bold text-ink">
                    {language === "en" ? "Include staff salaries in expenses?" : "تضمين رواتب الموظفين في حساب المصروفات؟"}
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
                    {language === "en" ? "Daily Sales 🟢" : "المبيعات اليومية 🟢"}
                  </div>
                  <div className="text-[24px] font-black font-mono text-teal">
                    {finances.dailyRevenue.toLocaleString()} ₪
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                  <div className="text-[13px] text-ink-soft font-bold mb-2">
                    {language === "en" ? "Cost of Goods Sold 🔴" : "تكلفة البضاعة المباعة 🔴"}
                  </div>
                  <div className="text-[24px] font-black font-mono text-coral">
                    {finances.dailyCogs.toLocaleString()} ₪
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm relative">
                  <div className="text-[13px] text-ink-soft font-bold mb-2">
                    {language === "en" ? "Other Expenses 🔴" : "مصروفات أخرى 🔴"}
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-[24px] font-black font-mono text-coral">
                      {finances.dailyExpenses.toLocaleString()} ₪
                    </div>
                    <button
                      onClick={() => setShowExpenseModal(true)}
                      className="text-[12px] font-bold text-coral bg-coral-pale px-3 py-1 rounded-lg hover:bg-coral hover:text-white transition-colors"
                    >
                      {language === "en" ? "+ Add Expense" : "+ إضافة مصروف"}
                    </button>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] text-ink-soft font-bold">
                      {language === "en" ? "Salaries (Daily)" : "الرواتب (يومي)"} {includeSalaries ? "🔴" : "⚪"}
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
                      ? language === "en" ? "Net Profit" : "الربح الصافي (Net Profit)"
                      : language === "en" ? "Gross Profit" : "الربح التشغيلي (Gross Profit)"}
                  </div>
                  <div className="text-[13px] text-ink-soft font-bold">
                    {language === "en" ? "Formula: Sales - Cost of Goods - Expenses" : "معادلة الحساب: المبيعات - تكلفة البضاعة - المصروفات"}{" "}
                    {includeSalaries ? language === "en" ? " - Salaries" : "- الرواتب" : ""}
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
                  {language === "en" ? "Financial Policies & Permissions (Applies to all branches)" : "السياسات المالية والصلاحيات (تطبق على جميع الفروع)"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        {language === "en" ? "Max Cashier Discount (%)" : "الحد الأقصى للخصم للكاشير (%)"}
                      </label>
                      <input
                        type="number"
                        value={systemSettings.cashierMaxDiscount}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select();
                        }}
                        onChange={(e) => setSystemSettings({ ...systemSettings, cashierMaxDiscount: e.target.value })}
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary font-mono text-[15px]"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        {language === "en" ? "Max Branch Manager Discount (%)" : "الحد الأقصى للخصم لمدير الفرع (%)"}
                      </label>
                      <input
                        type="number"
                        value={systemSettings.managerMaxDiscount}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select();
                        }}
                        onChange={(e) => setSystemSettings({ ...systemSettings, managerMaxDiscount: e.target.value })}
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary font-mono text-[15px]"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[14px] font-bold text-ink mb-2">
                        {language === "en" ? "Return Policy Window (Days)" : "المدة المسموحة للإرجاع (بالأيام)"}
                      </label>
                      <input
                        type="number"
                        value={systemSettings.returnDays}
                        onFocus={(e) => {
                          if (e.target.value === "0") e.target.select();
                        }}
                        onChange={(e) => setSystemSettings({ ...systemSettings, returnDays: e.target.value })}
                        className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary font-mono text-[15px]"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-mint-bg rounded-xl border border-mint-line mt-2">
                      <span className="text-[14px] font-bold text-ink">
                        {language === "en" ? "Enable Central Stock Alerts" : "تفعيل تنبيهات نواقص المخزون المركزية"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSystemSettings({ ...systemSettings, stockAlertsEnabled: !systemSettings.stockAlertsEnabled })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${systemSettings.stockAlertsEnabled ? "bg-primary" : "bg-[#E1E9E3]"}`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${systemSettings.stockAlertsEnabled ? "right-1" : "right-7"}`}
                        ></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined" && user?.pharmacy_id) {
                        localStorage.setItem(`roshetta_settings_${user.pharmacy_id}`, JSON.stringify(systemSettings));
                      }
                      toast.success(language === "en" ? "System settings saved successfully!" : "تم حفظ إعدادات النظام بنجاح!");
                    }}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal transition-colors shadow-sm"
                  >
                    {language === "en" ? "Save Settings" : "حفظ الإعدادات"}
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
                      {((user as any)?.subscriptionType === "annual" || (user as any)?.subscriptionType === "سنوي")
                        ? (language === "en" ? "Annual Subscription (Premium)" : "الاشتراك السنوي (Premium)")
                        : ((user as any)?.subscriptionType === "lifetime" || (user as any)?.subscriptionType === "مدى الحياة")
                          ? (language === "en" ? "Lifetime License (Unlimited)" : "ترخيص مدى الحياة (غير محدود)")
                          : ((user as any)?.subscriptionType === "monthly" || (user as any)?.subscriptionType === "شهري")
                            ? (language === "en" ? "Monthly Subscription" : "الاشتراك الشهري")
                            : (language === "en" ? "Free Trial (14 Days)" : "الاشتراك التجريبي (14 يوماً)")}
                    </h3>
                    <p className="text-white/80 font-bold mb-4">
                      {language === "en" ? "Allows you to manage branches, inventory, and staff with real-time sync." : "يسمح لك بإدارة الفروع والمخزون والموظفين مع المزامنة السحابية اللحظية."}
                    </p>

                    <div className="flex gap-4">
                      <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-[12px] text-white/80">
                          {language === "en" ? "Branches Used" : "الفروع المستخدمة"}
                        </div>
                        <div className="font-bold font-mono text-[18px]" dir="ltr">
                          {branches.length} / {((user as any)?.subscriptionType === "lifetime" ? "∞" : (user as any)?.subscriptionType === "annual" ? 10 : (user as any)?.subscriptionType === "monthly" ? 3 : 2)}
                        </div>
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
                        <div className="text-[12px] text-white/80">
                          {language === "en" ? "Subscription Expiry" : "تاريخ انتهاء الاشتراك"}
                        </div>
                        <div className="font-bold font-mono text-[18px]">
                          {(user as any)?.subscriptionExpiry
                            ? new Date((user as any).subscriptionExpiry).toLocaleDateString(language === "en" ? "en-US" : "ar-EG")
                            : (language === "en" ? "Active" : "ساري")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <a
                      href="/pricing"
                      className="bg-white text-primary text-center px-6 py-3 rounded-xl font-black shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                    >
                      {language === "en" ? "Upgrade Plan (More Branches)" : "ترقية الباقة (فروع أكثر)"}
                    </a>
                    <a
                      href="/my-subscription"
                      className="bg-transparent border-2 border-white/30 text-white text-center px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
                    >
                      {language === "en" ? "Subscription Details" : "تفاصيل الاشتراك"}
                    </a>
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
            {language === "en" ? "Staff Login Credentials" : "بيانات الدخول للموظفين"}
          </h2>
          <span className="text-[13px] text-ink-soft bg-primary-pale px-3 py-1 rounded-lg">
            {language === "en" ? "Confidential 🔒" : "بيانات سرية 🔒"}
          </span>
        </div>
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-mint-line text-ink-soft text-[14px]">
              <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Employee Name" : "اسم الموظف"}</th>
              <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Password" : "كلمة المرور"}</th>
              <th className="py-3 px-5 font-semibold text-start">{language === "en" ? "Actions" : "إجراءات"}</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-ink-soft text-[14px]">
                  {language === "en" ? "No staff found" : "لا يوجد موظفون مطابقون للبحث"}
                </td>
              </tr>
            ) : (
              filteredStaff.map((st: any, i: number) => (
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
                      {language === "en" ? "Edit Credentials" : "تعديل البيانات"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-mint-line overflow-hidden">
            <div className="p-5 border-b border-mint-line flex justify-between items-center bg-bg">
              <h3 className="font-bold text-[18px] text-primary">
                {language === "en" ? "Add New Expense" : "إضافة مصروف جديد"}
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
                  {language === "en" ? "Expense Type" : "نوع المصروف"}
                </label>
                <select
                  value={expenseData.type}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, type: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px]"
                >
                  <option value="نثريات">{language === "en" ? "Sundries (Hospitality, Cleaning...)" : "نثريات (ضيافة، تنظيف...)"}</option>
                  <option value="فواتير">{language === "en" ? "Bills (Electricity, Water, Internet)" : "فواتير (كهرباء، ماء، إنترنت)"}</option>
                  <option value="صيانة">{language === "en" ? "Maintenance & Repairs" : "صيانة وإصلاحات"}</option>
                  <option value="أخرى">{language === "en" ? "Other" : "أخرى"}</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Expense Description" : "وصف المصروف"}
                </label>
                <input
                  type="text"
                  value={expenseData.title}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, title: e.target.value })
                  }
                  placeholder={language === "en" ? "Example: August electricity bill" : "مثال: فاتورة كهرباء شهر ٨"}
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-[14px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === "en" ? "Amount (₪)" : "المبلغ (₪)"}
                  </label>
                  <input
                    type="number"
                    value={expenseData.amount}
                    onFocus={(e) => {
                      if (e.target.value === "0" || e.target.value === "0.00") e.target.select();
                    }}
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
                    {language === "en" ? "Date" : "التاريخ"}
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
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
              <button
                onClick={async () => {
                  if (!expenseData.title || !expenseData.amount) {
                    toast.error(language === "en" ? "Please fill in all fields" : "يرجى تعبئة الحقول");
                    return;
                  }
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/expenses`,
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
                      toast.success(language === "en" ? "Expense recorded successfully" : "تم تسجيل المصروف بنجاح");
                      setShowExpenseModal(false);
                      setExpenseData({
                        title: "",
                        amount: "",
                        date: new Date().toISOString().split("T")[0],
                        type: language === "en" ? "Sundries" : "نثريات",
                      });
                    }
                  } catch (e) {}
                }}
                className="px-6 py-2 rounded-xl font-bold text-white bg-primary hover:bg-teal transition-colors shadow-md shadow-primary/20"
              >
                {language === "en" ? "Save Expense" : "حفظ المصروف"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStaffModal && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-[20px] font-bold text-ink mb-6">
              {editingStaff ? (language === "en" ? "Edit Staff Data" : "تعديل بيانات الموظف") : (language === "en" ? "Add New Staff" : "إضافة موظف جديد")}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Employee Name" : "اسم الموظف"}
                </label>
                <input
                  type="text"
                  value={editingStaff?.name || ""}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, name: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder={language === "en" ? "Full Name" : "الاسم الرباعي"}
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Job Title" : "المسمى الوظيفي"}
                </label>
                <select
                  value={editingStaff?.role || (language === "en" ? "Pharmacist / Cashier" : "صيدلي / كاشير")}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option>{language === "en" ? "Pharmacist / Cashier" : "صيدلي / كاشير"}</option>
                  <option>{language === "en" ? "Branch Manager" : "مدير فرع"}</option>
                  <option>{language === "en" ? "Pharmacy Assistant" : "مساعد صيدلي"}</option>
                  <option>{language === "en" ? "Warehouse" : "مستودع"}</option>
                </select>
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Assigned Branch" : "الفرع التابع له"}
                </label>
                <select
                  value={editingStaff?.branch || ""}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, branch: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">{language === "en" ? "Select Branch..." : "اختر الفرع..."}</option>
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
                    {language === "en" ? "Basic Salary" : "الراتب الأساسي"}
                  </label>
                  <input
                    type="text"
                    value={editingStaff?.salary || ""}
                    onFocus={(e) => {
                      if (e.target.value === "0") e.target.select();
                    }}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        salary: e.target.value,
                      })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    placeholder={language === "en" ? "Example: 1500" : "مثال: 1500"}
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === "en" ? "Phone Number" : "رقم الجوال"}
                  </label>
                  <input
                    type="text"
                    value={editingStaff?.phone || ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        phone: e.target.value,
                      })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    placeholder="059xxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === "en" ? "Email / Username" : "البريد الإلكتروني للدخول"}
                  </label>
                  <input
                    type="text"
                    value={editingStaff?.email || editingStaff?.username || ""}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        email: e.target.value,
                        username: e.target.value,
                      })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start font-mono text-[14px]"
                    placeholder="staff@example.com"
                    dir="ltr"
                  />
                </div>
                <div className="relative">
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {editingStaff?.id ? (language === "en" ? "New Password (Optional)" : "كلمة المرور (اتركه فارغاً للإبقاء)") : (language === "en" ? "Password" : "كلمة المرور")}
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
                      className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-start font-mono"
                      placeholder="••••••••"
                      dir="ltr"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3.5 text-ink-soft hover:text-primary transition-colors"
                      title={
                        showPassword ? language === "en" ? "Hide Password" : "إخفاء كلمة المرور" : language === "en" ? "Show Password" : "إظهار كلمة المرور"
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
                  const staffName = (editingStaff?.name || "").trim();
                  const staffEmail = (editingStaff?.email || editingStaff?.username || "").trim();

                  if (!staffName) {
                    toast.error(language === "en" ? "Please enter employee name" : "يرجى كتابة اسم الموظف");
                    return;
                  }

                  if (!editingStaff?.id && (!staffEmail || !editingStaff?.password)) {
                    toast.error(language === "en" ? "Email and password are required" : "البريد الإلكتروني وكلمة المرور مطلوبان لإنشاء حساب الموظف");
                    return;
                  }

                  const staffPayload = {
                    ...editingStaff,
                    name: staffName,
                    email: staffEmail,
                    username: staffEmail,
                    phone: (editingStaff?.phone || "").trim(),
                    salary: editingStaff?.salary || 0,
                    role: editingStaff?.role || (language === "en" ? "Pharmacist / Cashier" : "صيدلي / كاشير"),
                    branch: editingStaff?.branch || branches[0]?.name || (language === "en" ? "Main Branch" : "الفرع الرئيسي"),
                  };

                  if (editingStaff?.id) {
                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${editingStaff.id}`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(staffPayload),
                        },
                      );
                      const data = await res.json();
                      if (data.success) {
                        mutateStaff();
                        toast.success(language === "en" ? "Staff data updated successfully!" : "تم تحديث بيانات الموظف بنجاح!");
                        setShowAddStaffModal(false);
                        setEditingStaff(null);
                      } else {
                        toast.error(data.error || (language === "en" ? "Error during update" : "حدث خطأ أثناء التحديث"));
                      }
                    } catch (e) {
                      toast.error(language === "en" ? "Could not connect to server" : "تعذر الاتصال بالخادم");
                    }
                  } else {
                    try {
                      const res = await fetch(
                        `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(staffPayload),
                        },
                      );
                      const data = await res.json();
                      if (data.success) {
                        mutateStaff();
                        toast.success(language === "en" ? "New staff added successfully!" : "تم إضافة الموظف الجديد بنجاح!");
                        setShowAddStaffModal(false);
                        setEditingStaff(null);
                      } else {
                        toast.error(data.error || (language === "en" ? "Error during addition" : "حدث خطأ أثناء الإضافة"));
                      }
                    } catch (e) {
                      toast.error(language === "en" ? "Could not connect to server" : "تعذر الاتصال بالخادم");
                    }
                  }
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all"
              >
                {editingStaff?.id ? language === "en" ? "Save Changes" : "حفظ التعديلات" : language === "en" ? "Appoint Staff" : "تعيين الموظف"}
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
              {language === "en" ? "Confirm Staff Termination" : "تأكيد فصل الموظف"}
            </h3>
            <p className="text-[15px] text-ink-soft mb-8">
              {language === "en" ? "Are you sure you want to permanently terminate employee " : "هل أنت متأكد من رغبتك في فصل الموظف "}
              <span className="font-bold text-ink">{staffToFire.name}</span>{" "}
              {language === "en" ? "from the system?" : "نهائياً من النظام؟"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${staffToFire.id}`,
                      {
                        method: "DELETE",
                      },
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateStaff();
                      setStaffToFire(null);
                      toast.success(language === "en" ? "Done!" : "تم!");
                    } else toast.error(data.error);
                  } catch (e) {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-coral text-white font-bold rounded-xl hover:bg-coral/90 transition-all shadow-[0_4px_12px_rgba(235,93,80,0.3)]"
              >
                {language === "en" ? "Yes, Confirm Termination" : "نعم، تأكيد الفصل"}
              </button>
              <button
                onClick={() => setStaffToFire(null)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "تراجع"}
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
              {language === "en" ? "Edit Admin Profile" : "تعديل الملف الشخصي للإدارة"}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === "en" ? "Full Name" : "الاسم بالكامل"}
                  </label>
                  <input
                    type="text"
                    value={adminForm.name}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, name: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === "en" ? "Phone Number" : "رقم الجوال"}
                  </label>
                  <input
                    type="text"
                    value={adminForm.phone}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, phone: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Email (Username)" : "البريد الإلكتروني (اسم المستخدم)"}
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  disabled
                  readOnly
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start bg-bg/50 text-ink-soft cursor-not-allowed"
                  dir="ltr"
                />
                <span className="text-xs text-ink-soft mt-1 block">
                  {language === "en"
                    ? "To change system login email, please contact platform support."
                    : "لتعديل البريد الإلكتروني لتسجيل الدخول، يرجى مراجعة الدعم الفني أو السوبر أدمن."}
                </span>
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
                  {language === "en" ? "Change Password" : "تغيير كلمة المرور"}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      {language === "en" ? "New Password" : "كلمة المرور الجديدة"}
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPasswords ? "text" : "password"}
                        value={adminForm.newPassword}
                        onChange={(e) =>
                          setAdminForm({ ...adminForm, newPassword: e.target.value })
                        }
                        className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-start"
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
                      {language === "en" ? "Confirm New Password" : "تأكيد الكلمة الجديدة"}
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPasswords ? "text" : "password"}
                        value={adminForm.confirmNewPassword}
                        onChange={(e) =>
                          setAdminForm({ ...adminForm, confirmNewPassword: e.target.value })
                        }
                        className="w-full border border-mint-line rounded-xl p-3 pl-10 focus:outline-none focus:border-primary text-start"
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
                  try {
                    // Password update check
                    if (adminForm.newPassword) {
                      if (adminForm.newPassword.length < 6) {
                        toast.error(
                          language === "en"
                            ? "Password must be at least 6 characters"
                            : "كلمة المرور يجب أن لا تقل عن 6 أحرف"
                        );
                        return;
                      }
                      if (adminForm.newPassword !== adminForm.confirmNewPassword) {
                        toast.error(
                          language === "en"
                            ? "Passwords do not match"
                            : "كلمات المرور غير متطابقة"
                        );
                        return;
                      }
                      const res = await fetch(
                        `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/reset-password`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ newPassword: adminForm.newPassword }),
                        }
                      );
                      const data = await res.json();
                      if (!data.success) {
                        toast.error(
                          data.error ||
                            (language === "en"
                              ? "Failed to update password"
                              : "فشل تغيير كلمة المرور")
                        );
                        return;
                      }
                    }

                    // Name / Phone update check
                    if (adminForm.name || adminForm.phone) {
                      await fetch(
                        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/settings`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: adminForm.name,
                            phone: adminForm.phone,
                          }),
                        }
                      );
                      login({
                        ...user,
                        name: adminForm.name,
                        managerName: adminForm.name,
                        phone: adminForm.phone,
                      });
                    }

                    toast.success(
                      language === "en"
                        ? "Profile changes saved successfully!"
                        : "تم حفظ تعديلات الملف الشخصي بنجاح!"
                    );
                    setAdminForm((prev) => ({
                      ...prev,
                      newPassword: "",
                      confirmNewPassword: "",
                    }));
                    setShowChangePasswordModal(false);
                  } catch (e: any) {
                    toast.error(e.message || "Error");
                  }
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all shadow-md shadow-primary/20"
              >
                {language === "en" ? "Save Changes" : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => {
                  setAdminForm((prev) => ({
                    ...prev,
                    newPassword: "",
                    confirmNewPassword: "",
                  }));
                  setShowChangePasswordModal(false);
                }}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
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
              {language === "en" ? "Add New Branch" : "إضافة فرع جديد"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Branch Name / Area" : "اسم الفرع / المنطقة"}
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, name: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder={language === "en" ? "Example: Nuseirat Branch" : "مثال: فرع النصيرات"}
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Manager in Charge" : "المدير المسؤول عن الفرع"}
                </label>
                <input
                  type="text"
                  value={newBranch.manager}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, manager: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder={language === "en" ? "Pharmacist Name" : "اسم الصيدلي"}
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  {language === "en" ? "Initial Branch Status" : "حالة الفرع المبدئية"}
                </label>
                <select
                  value={newBranch.status}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, status: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="active">{language === "en" ? "Active" : "يعمل (نشط)"}</option>
                  <option value="preparing">{language === "en" ? "Preparing" : "قيد التجهيز"}</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  if (!newBranch.name || !newBranch.manager) {
                    toast.error(language === "en" ? "Please fill in branch details" : "يرجى تعبئة بيانات الفرع");
                    return;
                  }

                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: newBranch.name,
                          addr: newBranch.manager || "",
                          status: newBranch.status === "active" ? "نشط" : "قيد التجهيز",
                        }),
                      },
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateBranches();
                      setNewBranch({
                        name: "",
                        manager: "",
                        status: "active",
                      });
                      setShowAddBranchModal(false);
                      toast.success(language === "en" ? "Done!" : "تم!");
                    } else toast.error(data.error);
                  } catch (e) {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all shadow-md shadow-primary/20"
              >
                {language === "en" ? "Save & Add" : "حفظ وإضافة"}
              </button>
              <button
                onClick={() => {
                  setNewBranch({
                    name: "",
                    manager: "",
                    status: "active",
                  });
                  setShowAddBranchModal(false);
                }}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-mint-line relative animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-bold text-primary">
                {language === "en" ? "Edit Branch" : "تعديل بيانات الفرع"}
              </h3>
              <button
                onClick={() => setEditingBranch(null)}
                className="text-ink-soft hover:text-ink w-8 h-8 rounded-full bg-bg flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-ink mb-1">
                  {language === "en" ? "Branch Name" : "اسم الفرع"}
                </label>
                <input
                  type="text"
                  value={editingBranch.name}
                  onChange={(e) =>
                    setEditingBranch({ ...editingBranch, name: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder={language === "en" ? "e.g. Al-Rimal Branch" : "مثال: فرع الرمال"}
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-1">
                  {language === "en" ? "Manager in Charge / Address" : "المدير المسؤول / العنوان"}
                </label>
                <input
                  type="text"
                  value={editingBranch.manager}
                  onChange={(e) =>
                    setEditingBranch({ ...editingBranch, manager: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  placeholder={language === "en" ? "Manager name or location" : "اسم المدير أو الموقع"}
                />
              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink mb-1">
                  {language === "en" ? "Status" : "حالة الفرع"}
                </label>
                <select
                  value={editingBranch.status}
                  onChange={(e) =>
                    setEditingBranch({ ...editingBranch, status: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white"
                >
                  <option value="active">{language === "en" ? "Active" : "يعمل (نشط)"}</option>
                  <option value="preparing">{language === "en" ? "Preparing" : "قيد التجهيز"}</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  if (!editingBranch.name.trim()) {
                    toast.error(language === "en" ? "Branch name is required" : "يرجى كتابة اسم الفرع");
                    return;
                  }
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches/${editingBranch.id}`,
                      {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: editingBranch.name,
                          addr: editingBranch.manager || "",
                          status: editingBranch.status === "active" ? "نشط" : "قيد التجهيز",
                        }),
                      }
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateBranches();
                      setEditingBranch(null);
                      toast.success(language === "en" ? "Branch updated successfully!" : "تم تعديل بيانات الفرع بنجاح!");
                    } else {
                      toast.error(data.error || "Failed");
                    }
                  } catch {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all shadow-md shadow-primary/20"
              >
                {language === "en" ? "Save Changes" : "حفظ التعديلات"}
              </button>
              <button
                onClick={() => setEditingBranch(null)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Branch Confirmation Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-mint-line relative animate-scale-up text-center">
            <div className="w-16 h-16 bg-coral-pale text-coral rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ⚠️
            </div>
            <h3 className="text-[20px] font-bold text-ink mb-2">
              {language === "en" ? "Delete Branch" : "حذف الفرع"}
            </h3>
            <p className="text-[14px] text-ink-soft mb-6">
              {language === "en"
                ? `Are you sure you want to delete branch "${branchToDelete.name}"?`
                : `هل أنت متأكد من رغبتك في حذف فرع "${branchToDelete.name}"؟`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches/${branchToDelete.id}`,
                      {
                        method: "DELETE",
                      }
                    );
                    const data = await res.json();
                    if (data.success) {
                      mutateBranches();
                      setBranchToDelete(null);
                      toast.success(language === "en" ? "Branch deleted successfully" : "تم حذف الفرع بنجاح");
                    } else {
                      toast.error(data.error || "Failed");
                    }
                  } catch {
                    toast.error("Error");
                  }
                }}
                className="flex-1 py-3 bg-coral text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-md shadow-coral/20"
              >
                {language === "en" ? "Yes, Delete" : "نعم، حذف"}
              </button>
              <button
                onClick={() => setBranchToDelete(null)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
