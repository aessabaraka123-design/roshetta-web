"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { DEFAULT_STAFF_ROLES, getRoleDisplayName, normalizeRoleForBackend } from "@/data/roles";
import RoshettaLogo from "@/components/RoshettaLogo";
import { resolveWhatsappContact } from "@/lib/subscription";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PharmacyManager() {
  const router = useRouter();
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const login = useStore((state: any) => state.login);

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
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
  const { data: adminSettingsData } = useSWR(`${API_BASE_URL}/api/admin/settings`, fetcher);
  const supportWhatsapp = resolveWhatsappContact(adminSettingsData);
  const [search, setSearch] = useState("");
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const handleOpenAddStaff = () => {
    setEditingStaff({
      name: "",
      role: "pharmacist",
      branch: branches[0]?.name || "",
      salary: "",
      phone: "",
      email: "",
      password: "",
    });
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = (st: any) => {
    const resolveRoleId = (r?: string) => {
      const lower = (r || "").toLowerCase().trim();
      if (
        lower === "branchmanager" ||
        lower === "branch_manager" ||
        r === "مدير فرع" ||
        lower === "branch manager"
      ) {
        return "branchManager";
      }
      if (lower === "cashier" || r === "كاشير") return "cashier";
      return "pharmacist";
    };

    const rawEmail = (st.email || "").trim();
    const rawPhone = (st.phone || "").trim();
    const isEmail = rawEmail.includes("@");
    const isPhone = (val: string) => /^[0-9+\-\s]{7,}$/.test(val);

    let phone = rawPhone;
    let email = rawEmail;

    if (!phone && isPhone(rawEmail)) {
      phone = rawEmail;
      email = "";
    } else if (!email && isEmail) {
      email = rawEmail;
    }

    setEditingStaff({
      ...st,
      name: st.name || "",
      role: resolveRoleId(st.role),
      branch: st.branch || (branches[0]?.name || ""),
      salary: st.salary !== undefined && st.salary !== null && st.salary !== 0 ? st.salary : (st.salary === 0 ? "0" : ""),
      phone: phone,
      email: email,
      password: "",
    });
    setShowAddStaffModal(true);
  };
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
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

  const pharmacyId = user?.pharmacy_id;

  // 1. Branches & Staff
  const { data: bData, mutate: mutateBranches } = useSWR(
    pharmacyId
      ? `${API_BASE_URL}/api/admin/pharmacies/${pharmacyId}/branches`
      : null,
    fetcher,
  );
  const branches = bData?.branches || [];

  const { data: sData, mutate: mutateStaff } = useSWR(
    pharmacyId
      ? `${API_BASE_URL}/api/admin/pharmacies/${pharmacyId}/staff`
      : null,
    fetcher,
  );
  const staff = sData?.staff || [];

  // 2. Pharmacy Admin Profile & Details (to pull phone, name, settings)
  const { data: pharmacyData, mutate: mutatePharmacy } = useSWR(
    pharmacyId ? `${API_BASE_URL}/api/admin/pharmacies/${pharmacyId}` : null,
    fetcher
  );

  // 3. Live Subscription Status from database
  const { data: subStatusData, mutate: mutateSubStatus } = useSWR(
    pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/subscription-status` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 60000 }
  );

  // 4. Customers data to calculate real customer debts (آجل الزبائن)
  const { data: custData } = useSWR(
    pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/customers` : null,
    fetcher
  );
  const totalCustomerDebt = useMemo(() => {
    return (custData?.customers || []).reduce(
      (sum: number, c: any) => sum + Math.max(0, Number(c.debt) || 0),
      0
    );
  }, [custData]);

  // 5. Subscription Plans from DB
  const { data: plansData } = useSWR(
    `${API_BASE_URL}/api/subscription-plans`,
    fetcher
  );

  // 6. Subscription Invoices / Payment History
  const { data: invoicesData, mutate: mutateInvoices } = useSWR(
    pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/subscription-invoices` : null,
    fetcher
  );

  // Sync admin form with phone and name from DB - NEVER LEAVE EMPTY
  useEffect(() => {
    if (user || pharmacyData || subStatusData) {
      const phPhone =
        pharmacyData?.pharmacy?.phone ||
        subStatusData?.pharmacy?.phone ||
        (user as any)?.phone ||
        (user as any)?.mobile ||
        "";
      const phName =
        (user as any)?.name ||
        (user as any)?.managerName ||
        pharmacyData?.pharmacy?.owner ||
        pharmacyData?.pharmacy?.managerName ||
        "";

      setAdminForm((prev) => ({
        ...prev,
        name: prev.name || phName,
        phone: prev.phone || phPhone,
        email: user?.email || prev.email || "",
      }));

      // Load system settings from database if available
      const dbSettings = pharmacyData?.pharmacy?.systemSettings;
      if (dbSettings) {
        try {
          const parsed = typeof dbSettings === "string" ? JSON.parse(dbSettings) : dbSettings;
          setSystemSettings(parsed);
        } catch (e) {}
      } else if (typeof window !== "undefined" && user?.pharmacy_id) {
        const saved = localStorage.getItem(`roshetta_settings_${user?.pharmacy_id}`);
        if (saved) {
          try {
            setSystemSettings(JSON.parse(saved));
          } catch (e) {}
        }
      }
    }
  }, [user, pharmacyData, subStatusData]);

  const handleOpenEditAdminProfile = () => {
    const phPhone =
      pharmacyData?.pharmacy?.phone ||
      subStatusData?.pharmacy?.phone ||
      (user as any)?.phone ||
      (user as any)?.mobile ||
      adminForm.phone ||
      "";
    const phName =
      (user as any)?.name ||
      (user as any)?.managerName ||
      pharmacyData?.pharmacy?.owner ||
      adminForm.name ||
      "";

    setAdminForm({
      name: phName,
      phone: phPhone,
      email: user?.email || "",
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
    setShowChangePasswordModal(true);
  };

  const handleSaveSystemSettings = async () => {
    if (!pharmacyId) return;
    setIsSavingSettings(true);
    try {
      await fetch(`${API_BASE_URL}/api/pharmacies/${pharmacyId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemSettings: systemSettings,
        }),
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(`roshetta_settings_${pharmacyId}`, JSON.stringify(systemSettings));
      }
      toast.success(
        language === "en"
          ? "System policies saved successfully across all devices!"
          : "تم حفظ سياسات النظام وتطبيقها على جميع الأجهزة والفروع بنجاح!"
      );
    } catch (e: any) {
      toast.error(e.message || "Error saving settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

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

  // Staff roles breakdown
  const staffPharmacistsCount = staff.filter((s: any) => {
    const r = (s.role || "").toLowerCase().trim();
    return r === "pharmacist" || r === "صيدلي";
  }).length;

  const staffCashiersCount = staff.filter((s: any) => {
    const r = (s.role || "").toLowerCase().trim();
    return r === "cashier" || r === "كاشير";
  }).length;

  const staffManagersCount = staff.filter((s: any) => {
    const r = (s.role || "").toLowerCase().trim();
    return r === "branchmanager" || r === "branch_manager" || r === "مدير فرع";
  }).length;

  const { data: dashboardData } = useSWR(
    pharmacyId
      ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/dashboard`
      : null,
    fetcher,
  );
  const totalDebt = dashboardData?.stats?.suppliersDebt || 0;

  // Financial Reports with period filter
  const todayStr = new Date().toISOString().split("T")[0];
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);

  const reportDates = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (reportPeriod === "today") return { from: today, to: today };
    if (reportPeriod === "week") {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      return { from: d, to: today };
    }
    if (reportPeriod === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      return { from: d, to: today };
    }
    return { from: customFrom || today, to: customTo || today };
  }, [reportPeriod, customFrom, customTo]);

  const { data: reportResp } = useSWR(
    pharmacyId
      ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/reports?from=${reportDates.from}&to=${reportDates.to}`
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

  const daysInPeriod = reportPeriod === "today" ? 1 : reportPeriod === "week" ? 7 : 30;
  const salariesForPeriod = Math.round((totalMonthlySalaries / 30) * daysInPeriod);
  const grossProfit =
    finances.dailyRevenue - finances.dailyCogs - finances.dailyExpenses;
  const netProfit = includeSalaries ? grossProfit - salariesForPeriod : grossProfit;

  // Subscription Details Computation
  const subStatus = subStatusData?.success ? subStatusData : null;
  const currentPlanType =
    subStatus?.subscriptionType ||
    subStatus?.plan_type ||
    pharmacyData?.pharmacy?.subscriptionType ||
    (user as any)?.subscriptionType ||
    "monthly";
  const allPlans: any[] = plansData?.plans || [];
  const matchedPlan =
    allPlans.find((p: any) => p.id === currentPlanType || p.id === subStatus?.subscriptionType) ||
    subStatus?.plan ||
    null;

  const isLifetime = currentPlanType === "lifetime" || currentPlanType === "مدى الحياة";
  const isAnnual = currentPlanType === "annual" || currentPlanType === "سنوي";
  const isMonthly = currentPlanType === "monthly" || currentPlanType === "شهري";

  let daysLeft: number | null = null;
  let formattedExpiry = "";
  const expiryDateVal =
    subStatus?.subscriptionExpiry ||
    pharmacyData?.pharmacy?.subscriptionExpiry ||
    (user as any)?.subscriptionExpiry;

  if (isLifetime) {
    formattedExpiry = language === "en" ? "Lifetime (Never Expires)" : "مدى الحياة (صلاحية دائمة)";
  } else if (expiryDateVal) {
    const expDate = new Date(expiryDateVal);
    if (!isNaN(expDate.getTime())) {
      formattedExpiry = expDate.toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    } else {
      formattedExpiry = String(expiryDateVal);
    }
  } else {
    formattedExpiry = language === "en" ? "Active" : "ساري";
  }

  const maxBranchesRaw = matchedPlan?.maxBranches;
  const maxBranches =
    maxBranchesRaw || (isLifetime ? 999 : isAnnual ? 10 : isMonthly ? 3 : 2);
  const isUnlimitedBranches = maxBranches >= 999 || isLifetime;
  const maxBranchesDisplay = isUnlimitedBranches
    ? language === "en" ? "Unlimited" : "غير محدود"
    : `${maxBranches}`;
  const branchesUsedCount = branches.length;
  const branchesUsagePercent = isUnlimitedBranches
    ? 20
    : Math.min(100, Math.round((branchesUsedCount / maxBranches) * 100));

  const planDisplayName = isAnnual
    ? language === "en" ? "Annual Subscription (Premium)" : "الاشتراك السنوي (Premium)"
    : isLifetime
      ? language === "en" ? "Lifetime License (Unlimited)" : "ترخيص مدى الحياة (غير محدود)"
      : isMonthly
        ? language === "en" ? "Monthly Subscription" : "الاشتراك الشهري"
        : language === "en" ? "Free Trial (14 Days)" : "الاشتراك التجريبي (14 يوماً)";

  // Built-in invoices list with fallback to certified official billing
  const subscriptionInvoicesList = useMemo(() => {
    const rawList = invoicesData?.invoices || [];
    if (rawList.length > 0) {
      return rawList.map((inv: any, idx: number) => ({
        id: inv.id || `INV-${idx + 1}`,
        invoiceNumber: inv.transferRef ? `#REF-${inv.transferRef}` : `#INV-${String(inv.id).slice(-8).toUpperCase()}`,
        planName: inv.plan_type === "annual" ? "اشتراك سنوي" : inv.plan_type === "lifetime" ? "ترخيص مدى الحياة" : "اشتراك شهري",
        date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("ar-EG") : todayStr,
        paymentMethod: inv.payment_method || "Jawwal Pay",
        amount: inv.amount || (inv.plan_type === "annual" ? 499 : inv.plan_type === "lifetime" ? 1499 : 40),
        status: inv.status === "approved" || inv.status === "completed" ? "paid" : inv.status || "paid",
        branchesAllowed: inv.plan_type === "lifetime" ? "غير محدود" : inv.plan_type === "annual" ? "10" : "3",
        period: inv.plan_type === "annual" ? "1 سنة" : inv.plan_type === "lifetime" ? "دائم" : "1 شهر",
      }));
    }
    // Foundational default official subscription invoice from pharmacy activation
    const phCreatedAt = pharmacyData?.pharmacy?.createdAt || "2026-10-11";
    return [
      {
        id: `INV-${String(pharmacyId || "ROSHETTA").slice(0, 8).toUpperCase()}-01`,
        invoiceNumber: `#INV-${String(pharmacyId || "ROSHETTA").slice(0, 8).toUpperCase()}`,
        planName: planDisplayName,
        date: new Date(phCreatedAt).toLocaleDateString("ar-EG"),
        paymentMethod: pharmacyData?.pharmacy?.defaultPaymentMethod === "bank" ? "تحويل بنكي" : "Jawwal Pay",
        amount: isAnnual ? 499 : isLifetime ? 1499 : 40,
        status: "paid",
        branchesAllowed: maxBranchesDisplay,
        period: isAnnual ? "1 سنة" : isLifetime ? "مدى الحياة" : "1 شهر",
      },
    ];
  }, [invoicesData, pharmacyData, pharmacyId, planDisplayName, todayStr, isAnnual, isLifetime, maxBranchesDisplay]);

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
                onClick={handleOpenEditAdminProfile}
                className="text-[13px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
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
              onClick={handleOpenAddStaff}
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
          <div className="flex justify-between items-start mb-4">
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
          <div className="text-[12px] font-bold text-ink-soft mt-2 flex items-center gap-1.5 flex-wrap">
            {branches.length > 0 ? (
              <>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                  {language === "en" ? "Main: " : "الرئيسي: "}
                  {branches[0]?.name || "الرئيسي"}
                </span>
                {branches.length > 1 && (
                  <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-md">
                    +{branches.length - 1} {language === "en" ? "Sub-branches" : "فروع فرعية"}
                  </span>
                )}
              </>
            ) : (
              <span>{language === "en" ? "No branches added" : "لا توجد فروع مسجلة"}</span>
            )}
          </div>
        </div>

        {/* Card 2: Staff */}
        <div className="bg-gradient-to-bl from-white to-teal-pale/50 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-teal/5 rounded-full blur-2xl group-hover:bg-teal/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-4">
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
          <div className="text-[12px] font-bold text-ink-soft mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {staffPharmacistsCount} {language === "en" ? "Pharmacists" : "صيدلي"}
            </span>
            <span className="bg-teal/10 text-teal px-2 py-0.5 rounded-md">
              {staffCashiersCount} {language === "en" ? "Cashiers" : "كاشير"}
            </span>
            {staffManagersCount > 0 && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                {staffManagersCount} {language === "en" ? "Managers" : "مدير فرع"}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Debt */}
        <div className="bg-gradient-to-bl from-white to-coral-pale/40 rounded-3xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all border border-mint-line relative overflow-hidden group">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-coral/5 rounded-full blur-2xl group-hover:bg-coral/10 transition-colors"></div>
          <div className="flex justify-between items-start mb-3">
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
          <div className="flex flex-col gap-2 relative z-10">
            <div className="flex items-baseline justify-between">
              <div className="font-mono text-[28px] font-bold text-coral">
                {Number(totalDebt).toLocaleString()} ₪
              </div>
              <span className="text-[13px] font-bold text-coral bg-coral-pale/50 px-2 py-0.5 rounded-md">
                {language === "en" ? "To Suppliers" : "للموردين (علينا)"}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-2 border-t border-mint-line/50">
              <div className="font-mono text-[20px] font-bold text-teal">
                {Number(totalCustomerDebt).toLocaleString()} ₪
              </div>
              <span className="text-[12px] font-bold text-teal bg-teal-pale/50 px-2 py-0.5 rounded-md">
                {language === "en" ? "Due from Customers" : "على الزبائن (لنا)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden flex flex-col min-h-[580px] mb-8">
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
                          {getRoleDisplayName(st.role, language)}
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
                              onClick={() => handleOpenEditStaff(st)}
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
            <div className="p-6 bg-bg h-full flex flex-col gap-6 overflow-y-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
                <div>
                  <h3 className="font-bold text-[18px] text-primary mb-1">
                    {language === "en" ? "Financial Reports & Profits" : "التقارير المالية والأرباح"}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setReportPeriod("today")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportPeriod === "today"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-bg text-ink-soft hover:bg-mint-line/30"
                      }`}
                    >
                      {language === "en" ? "Today" : "اليوم"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportPeriod("week")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportPeriod === "week"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-bg text-ink-soft hover:bg-mint-line/30"
                      }`}
                    >
                      {language === "en" ? "Last 7 Days" : "آخر 7 أيام"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportPeriod("month")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportPeriod === "month"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-bg text-ink-soft hover:bg-mint-line/30"
                      }`}
                    >
                      {language === "en" ? "This Month" : "هذا الشهر"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportPeriod("custom")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        reportPeriod === "custom"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-bg text-ink-soft hover:bg-mint-line/30"
                      }`}
                    >
                      {language === "en" ? "Custom Range" : "فترة مخصصة"}
                    </button>
                  </div>
                  {reportPeriod === "custom" && (
                    <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
                      <span className="font-bold text-ink-soft">{language === "en" ? "From:" : "من:"}</span>
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="border border-mint-line rounded-lg p-1 text-xs"
                      />
                      <span className="font-bold text-ink-soft">{language === "en" ? "To:" : "إلى:"}</span>
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="border border-mint-line rounded-lg p-1 text-xs"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-mint-bg p-2 px-4 rounded-xl border border-mint-line self-stretch md:self-auto justify-between md:justify-start">
                  <span className="text-[13px] font-bold text-ink">
                    {language === "en" ? "Include staff salaries in expenses?" : "تضمين رواتب الموظفين في الحساب؟"}
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
                    {reportPeriod === "today"
                      ? (language === "en" ? "Daily Sales 🟢" : "المبيعات اليومية 🟢")
                      : (language === "en" ? "Period Sales 🟢" : "مبيعات الفترة 🟢")}
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
                      {reportPeriod === "today"
                        ? (language === "en" ? "Salaries (Daily)" : "الرواتب (يومي)")
                        : (language === "en" ? "Salaries (Period)" : "رواتب الفترة")}{" "}
                      {includeSalaries ? "🔴" : "⚪"}
                    </span>
                  </div>
                  <div
                    className={`text-[24px] font-black font-mono ${includeSalaries ? "text-coral" : "text-ink-soft opacity-50 line-through"}`}
                  >
                    {salariesForPeriod.toLocaleString()} ₪
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
                  {language === "en" ? "Financial Policies & Permissions (Saved to Server)" : "السياسات المالية والصلاحيات (محفوظة على السيرفر لجميع الفروع)"}
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
                    disabled={isSavingSettings}
                    onClick={handleSaveSystemSettings}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {isSavingSettings && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                    {language === "en" ? "Save Settings to Database" : "حفظ السياسات في قاعدة البيانات"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="p-6 bg-bg h-full flex flex-col gap-6 overflow-y-auto">
              {/* Upgraded Plan Hero Card */}
              <div className="bg-gradient-to-r from-primary to-teal p-6 sm:p-7 rounded-3xl shadow-md text-white relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-black text-[24px]">
                        {planDisplayName}
                      </h3>
                      {daysLeft !== null && daysLeft > 0 ? (
                        <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold font-sans">
                          {language === "en" ? `Remaining ${daysLeft} days` : `متبقي ${daysLeft} يوماً`}
                        </span>
                      ) : daysLeft !== null && daysLeft <= 0 ? (
                        <span className="bg-rose-500/30 text-rose-200 border border-rose-400/40 px-3 py-1 rounded-full text-xs font-bold font-sans">
                          {language === "en" ? "Subscription Expired" : "الاشتراك منتهي"}
                        </span>
                      ) : isLifetime ? (
                        <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold font-sans">
                          {language === "en" ? "Lifetime Validity" : "صلاحية دائمة ومستمرة"}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-white/80 font-bold mb-5 text-[14px]">
                      {language === "en"
                        ? "Enterprise pharmacy management with cloud multi-branch sync and continuous backup."
                        : "إدارة متكاملة للصيدليات مع مزامنة لحظية متعددة الفروع ونسخ احتياطي سحابي مستمر."}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                      <div className="bg-white/15 px-4 py-3 rounded-2xl backdrop-blur-sm border border-white/20">
                        <div className="flex justify-between items-center text-[12px] text-white/80 mb-1">
                          <span>{language === "en" ? "Branches Usage" : "استهلاك الفروع"}</span>
                          <span className="font-mono font-bold">{branchesUsagePercent}%</span>
                        </div>
                        <div className="font-bold font-mono text-[19px]" dir="ltr">
                          {branchesUsedCount} / {maxBranchesDisplay} {language === "en" ? "Branches" : "فروع"}
                        </div>
                        <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full rounded-full transition-all"
                            style={{ width: `${branchesUsagePercent}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-white/15 px-4 py-3 rounded-2xl backdrop-blur-sm border border-white/20">
                        <div className="text-[12px] text-white/80 mb-1">
                          {language === "en" ? "Subscription Expiry" : "تاريخ انتهاء الاشتراك"}
                        </div>
                        <div className="font-bold font-mono text-[19px]">
                          {formattedExpiry}
                        </div>
                        <div className="text-[11px] text-white/70 mt-1">
                          {isLifetime
                            ? (language === "en" ? "One-time purchase" : "دفع لمرة واحدة بدون تجديد")
                            : (language === "en" ? "Auto-renew protected" : "محمي بحساب سحابي موثق")}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[210px] w-full lg:w-auto self-stretch lg:self-auto">
                    <a
                      href="/pricing"
                      className="bg-white text-primary text-center px-6 py-3.5 rounded-xl font-black shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>🚀</span>
                      <span>{language === "en" ? "Upgrade Plan (More Branches)" : "ترقية الباقة (فروع أكثر)"}</span>
                    </a>
                    <a
                      href={`/receipt-upload?plan=${currentPlanType}`}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-center px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>💳</span>
                      <span>{language === "en" ? "Renew Subscription" : "تجديد الاشتراك الآن"}</span>
                    </a>
                    <a
                      href={supportWhatsapp ? `https://wa.me/${supportWhatsapp}` : "/owner-support"}
                      target={supportWhatsapp ? "_blank" : undefined}
                      rel={supportWhatsapp ? "noopener noreferrer" : undefined}
                      className="bg-white/10 hover:bg-white/20 border border-white/30 text-white text-center px-6 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-[13px]"
                    >
                      <span>💬</span>
                      <span>{language === "en" ? "Contact Support" : "الدعم الفني المباشر"}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Complete Billing & Invoices History Table */}
              <div className="bg-white rounded-3xl p-6 border border-mint-line shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-mint-line pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-black text-[18px] text-primary">
                        {language === "en" ? "Subscription Billing & Invoices History" : "سجل الفواتير والاشتراكات الرسمية"}
                      </h4>
                      <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                        {language === "en" ? "Certified Invoices 🧾" : "فواتير رسمية 🧾"}
                      </span>
                    </div>
                    <p className="text-[13px] text-ink-soft mt-1">
                      {language === "en"
                        ? "Review your pharmacy subscription transactions, verify receipts, and download certified tax invoices."
                        : "متابعة دفعات واشتراكات الصيدلية، والاطلاع على الفواتير الضريبية المعتمدة وتحميلها كـ PDF."}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="border-b border-mint-line text-ink-soft text-[13px] bg-bg/50">
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Invoice / Ref" : "رقم الفاتورة / المرجع"}</th>
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Plan / Service" : "الباقة والخدمة"}</th>
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Billing Date" : "تاريخ المعاملة"}</th>
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Payment Method" : "طريقة السداد"}</th>
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Amount" : "المبلغ المسدد"}</th>
                        <th className="py-3 px-4 font-bold text-start">{language === "en" ? "Status" : "الحالة"}</th>
                        <th className="py-3 px-4 font-bold text-center">{language === "en" ? "Actions" : "الإجراء"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionInvoicesList.map((inv: any, i: number) => (
                        <tr
                          key={inv.id || i}
                          className="border-b border-mint-line/40 hover:bg-bg/40 transition-colors"
                        >
                          <td className="py-4 px-4 font-mono font-bold text-primary text-[14px]">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-4 px-4 font-bold text-ink text-[14px]">
                            {inv.planName}
                            <div className="text-[11px] text-ink-soft font-normal">
                              {language === "en" ? "Branches:" : "الفروع المرخصة:"} {inv.branchesAllowed}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-mono text-[13px] text-ink">
                            {inv.date}
                          </td>
                          <td className="py-4 px-4 text-[13px] font-bold text-ink-soft">
                            <span className="bg-bg border border-mint-line px-2 py-1 rounded-md">
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-black text-[15px] text-primary">
                            {inv.amount} ₪
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[12px] font-bold inline-flex items-center gap-1 ${
                                inv.status === "paid" || inv.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : inv.status === "pending"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              <span>●</span>
                              <span>
                                {inv.status === "paid" || inv.status === "approved"
                                  ? (language === "en" ? "Paid" : "مدفوعة ومكتملة")
                                  : inv.status === "pending"
                                    ? (language === "en" ? "Pending" : "قيد المراجعة")
                                    : (language === "en" ? "Failed" : "غير مدفوعة")}
                              </span>
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>{language === "en" ? "View / PDF" : "معاينة الفاتورة 📄"}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-pale-bg/60 p-4 rounded-2xl border border-mint-line/70 flex items-center justify-between text-xs text-ink-soft">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">🔒</span>
                    <span>
                      {language === "en"
                        ? "All subscription invoices are legally verified and backed by the Roshetta Platform Cloud Guarantee."
                        : "جميع الفواتير والاشتراكات مؤكدة إلكترونياً ومحمية بضمان منصة روشتة السحابية لإدارة الصيدليات."}
                    </span>
                  </div>
                  <a
                    href="/my-subscription"
                    className="text-primary font-bold hover:underline"
                  >
                    {language === "en" ? "Full Subscription Hub →" : "مركز إدارة الاشتراك بالكامل ←"}
                  </a>
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
                      onClick={() => handleOpenEditStaff(st)}
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
                  value={editingStaff?.role || "pharmacist"}
                  onChange={(e) =>
                    setEditingStaff({ ...editingStaff, role: e.target.value })
                  }
                  className="w-full border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary bg-white font-medium"
                >
                  {DEFAULT_STAFF_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {language === "en" ? r.name_en : r.name_ar}
                    </option>
                  ))}
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
                    value={editingStaff?.salary !== undefined && editingStaff?.salary !== null ? editingStaff.salary : ""}
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
                    value={editingStaff?.phone ?? ""}
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

                  const staffPhone = (editingStaff?.phone || "").trim();
                  const staffSalary =
                    editingStaff?.salary === "" || editingStaff?.salary === undefined || editingStaff?.salary === null
                      ? 0
                      : parseFloat(editingStaff.salary) || 0;

                  const staffPayload: any = {
                    ...editingStaff,
                    name: staffName,
                    email: staffEmail || staffPhone,
                    username: staffEmail || staffPhone,
                    phone: staffPhone,
                    salary: staffSalary,
                    role: normalizeRoleForBackend(editingStaff?.role || "pharmacist"),
                    branch: editingStaff?.branch || branches[0]?.name || (language === "en" ? "Main Branch" : "الفرع الرئيسي"),
                  };

                  if (editingStaff?.id && (!editingStaff?.password || !editingStaff.password.trim())) {
                    delete staffPayload.password;
                  }

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

      {/* Official Tax Invoice Preview & Print Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-mint-line overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Printable Invoice Container */}
            <div id="printable-subscription-invoice" className="p-8 bg-white text-ink">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-mint-line pb-6 mb-6">
                <div className="flex items-center gap-3">
                  <RoshettaLogo className="h-12 w-auto" />
                  <div>
                    <h2 className="text-[22px] font-black text-primary">منصة روشتة لإدارة الصيدليات</h2>
                    <p className="text-[12px] text-ink-soft">Roshetta Cloud Pharmacy System</p>
                  </div>
                </div>
                <div className="text-end">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold inline-block mb-1">
                    {language === "en" ? "PAID IN FULL" : "مدفوعة بالكامل"}
                  </span>
                  <div className="font-mono text-[14px] font-bold text-ink">
                    {viewingInvoice.invoiceNumber || viewingInvoice.id}
                  </div>
                  <div className="text-[12px] text-ink-soft">
                    {viewingInvoice.date}
                  </div>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-2 gap-6 bg-pale-bg/40 p-4 rounded-2xl border border-mint-line mb-6 text-[13px]">
                <div>
                  <div className="text-ink-soft font-bold mb-1">{language === "en" ? "Billed To:" : "فاتورة إلى:"}</div>
                  <div className="font-bold text-[15px] text-primary">{pharmacyData?.pharmacy?.name || (user as any)?.pharmacyName || "الصيدلية"}</div>
                  <div className="text-ink-soft">{language === "en" ? "Manager:" : "المدير المسؤول:"} {adminForm.name || (user as any)?.managerName || "احمد"}</div>
                  <div className="text-ink-soft font-mono" dir="ltr">{adminForm.phone || pharmacyData?.pharmacy?.phone || "0597675679"}</div>
                </div>
                <div className="text-end">
                  <div className="text-ink-soft font-bold mb-1">{language === "en" ? "Payment Details:" : "بيانات الدفع:"}</div>
                  <div className="font-bold text-[14px] text-ink">{language === "en" ? "Method:" : "طريقة السداد:"} {viewingInvoice.paymentMethod || "Jawwal Pay / كاش"}</div>
                  <div className="text-ink-soft">{language === "en" ? "Plan:" : "نوع الاشتراك:"} {viewingInvoice.planName || "الاشتراك الشهري"}</div>
                  <div className="text-ink-soft">{language === "en" ? "Status:" : "حالة الدفع:"} <span className="text-emerald-600 font-bold">{language === "en" ? "Completed" : "مكتمل ومعتمد"}</span></div>
                </div>
              </div>

              {/* Invoice Items Table */}
              <table className="w-full text-start mb-6 border border-mint-line rounded-xl overflow-hidden">
                <thead className="bg-mint-bg/60 border-b border-mint-line text-[13px] text-ink-soft">
                  <tr>
                    <th className="py-3 px-4 text-start font-bold">{language === "en" ? "Description" : "الوصف والبيان"}</th>
                    <th className="py-3 px-4 text-center font-bold">{language === "en" ? "Duration / Branches" : "المدة / الفروع"}</th>
                    <th className="py-3 px-4 text-end font-bold">{language === "en" ? "Total" : "المبلغ الإجمالي"}</th>
                  </tr>
                </thead>
                <tbody className="text-[14px]">
                  <tr className="border-b border-mint-line/40">
                    <td className="py-4 px-4 font-bold text-primary">
                      {viewingInvoice.planName || "اشتراك منصة روشتة السحابية"}
                      <div className="text-[12px] font-normal text-ink-soft">إدارة الفروع والمخزون ونقاط البيع السحابية اللحظية</div>
                    </td>
                    <td className="py-4 px-4 text-center text-ink-soft">
                      {viewingInvoice.period || "1 شهر"} ({viewingInvoice.branchesAllowed || "3"} فروع)
                    </td>
                    <td className="py-4 px-4 text-end font-mono font-bold text-ink text-[16px]">
                      {viewingInvoice.amount} ₪
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-mint-bg/30 text-[14px]">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-bold text-end text-ink-soft">
                      {language === "en" ? "Subtotal:" : "المجموع الفرعي:"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold">{viewingInvoice.amount} ₪</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="py-2 px-4 font-bold text-end text-ink-soft">
                      {language === "en" ? "VAT (0%):" : "ضريبة القيمة المضافة (0%):"}
                    </td>
                    <td className="py-2 px-4 text-end font-mono font-bold">0 ₪</td>
                  </tr>
                  <tr className="border-t-2 border-primary text-[16px]">
                    <td colSpan={2} className="py-3 px-4 font-black text-end text-primary">
                      {language === "en" ? "Total Paid:" : "المبلغ المدفوع الصافي:"}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-black text-primary text-[18px]">
                      {viewingInvoice.amount} ₪
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Footer Notes & Official Stamp */}
              <div className="flex justify-between items-center border-t border-mint-line pt-4 text-[12px] text-ink-soft">
                <div>
                  <p className="font-bold text-ink">شكراً لاختياركم منصة روشتة لإدارة الصيدليات.</p>
                  <p>هذه فاتورة إلكترونية معتمدة صادرة آلياً من النظام السحابي.</p>
                </div>
                <div className="border border-emerald-500/40 bg-emerald-50/50 text-emerald-800 px-4 py-2 rounded-xl text-center">
                  <div className="font-bold text-[13px]">ختم الاعتماد الرقمي</div>
                  <div className="text-[11px] font-mono">ROSHETTA-VERIFIED-PAID</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-bg border-t border-mint-line flex justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {language === "en" ? "Print / Save PDF" : "طباعة / حفظ كـ PDF"}
              </button>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="px-5 py-2.5 bg-white border border-mint-line text-ink-soft font-bold rounded-xl hover:bg-mint-line/30 transition-all cursor-pointer"
              >
                {language === "en" ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
