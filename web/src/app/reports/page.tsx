"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import AppBar from "@/components/AppBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { exportCorporateExcel, exportComprehensivePDF, exportComprehensiveWord } from "@/utils/export";
import { computeFinancialReport } from "@/lib/reports/domain";
import { getWebAuthHeaders } from "@/lib/customers/transport";

const fetchReports = async (url: string) => {
  const headers = getWebAuthHeaders();

  // 1. Try dedicated server reports endpoint
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.success && data?.data) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Server /reports fetch failed, attempting live data calculation:", err);
  }

  // 2. Resilient Auto-Fallback: Fetch live sales, expenses, and inventory directly
  try {
    const urlObj = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const segments = urlObj.pathname.split("/").filter(Boolean);
    const pid = segments[2];
    const from = urlObj.searchParams.get("from");
    const to = urlObj.searchParams.get("to");
    const branch = urlObj.searchParams.get("branch") || "all";

    if (pid) {
      const branchQuery = branch && branch !== "all" ? `?branchName=${encodeURIComponent(branch)}` : "?branchName=all";
      const [salesRes, expRes, invRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/pharmacies/${pid}/sales${branchQuery}`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/api/pharmacies/${pid}/expenses`, { headers }).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE_URL}/api/pharmacies/${pid}/inventory`, { headers }).then(r => r.json()).catch(() => ({})),
      ]);

      const sales = Array.isArray(salesRes?.sales) ? salesRes.sales : [];
      const expenses = Array.isArray(expRes?.expenses) ? expRes.expenses : [];
      const inventory = Array.isArray(invRes?.inventory) ? invRes.inventory : [];

      if (sales.length > 0 || expenses.length > 0) {
        return computeFinancialReport({
          sales,
          expenses,
          inventory,
          from: from || undefined,
          to: to || undefined,
          branch: branch || "all",
        });
      }
    }
  } catch (fallbackErr) {
    console.warn("Live calculation fallback failed:", fallbackErr);
  }

  // 3. Fallback to empty structure
  return {
    success: true,
    data: {
      totalRevenue: 0,
      grossRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalExpenses: 0,
      totalDiscount: 0,
      totalVat: 0,
      netProfit: 0,
      profitMargin: 0,
      dailyTrend: [],
      branchPerformance: [],
      topItems: [],
      paymentBreakdown: { cash: 0, card: 0, bank: 0, jawwal: 0, palpay: 0, maalchat: 0, credit: 0, insurance: 0, other: 0 },
    }
  };
};

type DateRange = "today" | "week" | "month" | "all" | "custom";

function getDateRange(
  range: DateRange,
  customFrom?: string,
  customTo?: string,
) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (range === "today") {
    const t = fmt(today);
    return { from: t, to: t };
  }
  if (range === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { from: fmt(start), to: fmt(today) };
  }
  if (range === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(start), to: fmt(today) };
  }
  if (range === "all") {
    return { from: "2024-01-01", to: fmt(today) };
  }
  return { from: customFrom || fmt(today), to: customTo || fmt(today) };
}

const PIE_COLORS = ["#2DC08E", "#223E56", "#F2A93B", "#6FA3C9", "#E85D75"];

export default function Reports() {
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
    else if (user.role !== "manager" && user.role !== "مدير فرع") {
      toast.error(language === 'en' ? 'You do not have permission to access this page' : 'ليس لديك الصلاحية للوصول إلى هذه الصفحة');
      router.push("/");
    }
  }, [user, router, language]);

  const isManager = user?.role === "manager";

  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [branchFilter, setBranchFilter] = useState("all");
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`,
          { headers: getWebAuthHeaders() }
        );
        const data = await res.json();
        if (data.success && data.branches?.length > 0) {
          setBranches(data.branches);
        }
      } catch (err) {}
    }
    fetchBranches();
  }, [user?.pharmacy_id]);

  const { from, to } = useMemo(
    () => getDateRange(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo],
  );

  const userBranchObj = branches.find((b: any) => b.id === user?.branch || b.name === user?.branch);
  let activeBranchId = branchFilter;
  if (user?.role === "صيدلي" || user?.role === "مدير فرع" || user?.role === "branchManager") {
    activeBranchId = userBranchObj ? String(userBranchObj.id) : (user?.branch || "PENDING");
  }

  const shouldFetch = user && activeBranchId !== "PENDING";
  const { data, isLoading, error } = useSWR(
    shouldFetch
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&branch=${encodeURIComponent(activeBranchId)}`
      : null,
    fetchReports,
  );

  const inventory = useStore((state) => state.inventory) || [];
  const [offlineReport, setOfflineReport] = useState<any>(null);

  useEffect(() => {
    // If SWR fails or browser is offline, compute financial report deterministically from local storage
    if ((error || !navigator.onLine) && typeof window !== "undefined") {
      try {
        const storedSalesRaw = localStorage.getItem("roshetta_offline_sales") || localStorage.getItem("offline_sales") || "[]";
        const storedExpensesRaw = localStorage.getItem("roshetta_offline_expenses") || "[]";
        const sales = JSON.parse(storedSalesRaw);
        const expenses = JSON.parse(storedExpensesRaw);
        const localReport = computeFinancialReport({
          sales,
          expenses,
          inventory,
          from,
          to,
          branch: activeBranchId,
        });
        setOfflineReport(localReport);
      } catch (e) {
        console.warn("Failed to compute offline report:", e);
      }
    } else {
      setOfflineReport(null);
    }
  }, [error, from, to, activeBranchId, inventory]);

  const rawReport = data?.data || offlineReport?.data || {};
  const report = {
    totalRevenue: Number(rawReport.totalRevenue ?? rawReport.netRevenue ?? rawReport.grossRevenue ?? 0),
    netRevenue: Number(rawReport.netRevenue ?? rawReport.totalRevenue ?? rawReport.grossRevenue ?? 0),
    grossRevenue: Number(rawReport.grossRevenue ?? rawReport.totalRevenue ?? rawReport.netRevenue ?? 0),
    totalCost: Number(rawReport.totalCost ?? rawReport.cogs ?? 0),
    cogs: Number(rawReport.cogs ?? rawReport.totalCost ?? 0),
    totalProfit: Number(rawReport.totalProfit ?? rawReport.grossProfit ?? 0),
    grossProfit: Number(rawReport.grossProfit ?? rawReport.totalProfit ?? 0),
    totalExpenses: Number(rawReport.totalExpenses ?? rawReport.operatingExpenses ?? 0),
    totalDiscount: Number(rawReport.totalDiscount ?? rawReport.totalDiscounts ?? 0),
    totalVat: Number(rawReport.totalVat ?? 0),
    netProfit: Number(rawReport.netProfit ?? 0),
    profitMargin: Number(rawReport.profitMargin ?? rawReport.netMargin ?? 0).toFixed(1),
    dailyTrend: Array.isArray(rawReport.dailyTrend)
      ? rawReport.dailyTrend.map((d: any) => ({
          date: String(d?.date || ""),
          revenue: Number(d?.revenue || 0),
        }))
      : [],
    branchPerformance: Array.isArray(rawReport.branchPerformance) ? rawReport.branchPerformance : [],
    topItems: Array.isArray(rawReport.topItems) ? rawReport.topItems : [],
    paymentBreakdown: rawReport.paymentBreakdown || { cash: 0, card: 0, bank: 0, jawwal: 0, palpay: 0, maalchat: 0, credit: 0, insurance: 0, other: 0 },
  };

  const pb = report.paymentBreakdown || {};
  const pieData = [
    { name: language === "en" ? "Cash" : "نقدي", value: pb.cash || 0 },
    { name: language === "en" ? "Card" : "بطاقة", value: pb.card || 0 },
    { name: language === "en" ? "Bank" : "بنكي", value: pb.bank || 0 },
    { name: language === "en" ? "Jawwal Pay" : "جوال باي", value: pb.jawwal || 0 },
    { name: language === "en" ? "PalPay" : "بال باي", value: pb.palpay || 0 },
    { name: language === "en" ? "MaalChat" : "مالتشات", value: pb.maalchat || 0 },
    { name: language === "en" ? "Credit" : "ذمم", value: pb.credit || 0 },
    { name: language === "en" ? "Other" : "أخرى", value: pb.other || 0 },
  ].filter((d) => d.value > 0);

  const handlePrint = () => window.print();

  if (!user) return null;

  return (
    <main className="w-full pb-24 relative print:p-0">
      <AppBar
        title={language === "en" ? "Financial & Performance Reports" : "التقارير المالية والأداء"}
        backHref={isManager ? "/more" : "/"}
      />

      <div className="max-w-6xl mx-auto p-4 mt-4 space-y-8 print:space-y-4">
        {/* Header + Print */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[24px] font-black text-primary">{language === 'en' ? 'Reports' : 'التقارير'} 📊</h1>
            <p className="text-ink-soft text-[14px] font-bold">
              {from} — {to}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => {
                const now = new Date();
                const fileName = `Financial_Ledger_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
                exportCorporateExcel(
                  report,
                  user?.pharmacyName || (user as any)?.pharmacy_name || (language === "en" ? "Roshetta Pharmacy" : "صيدلية روشيتة"),
                  `${from} ${language === "en" ? "to" : "إلى"} ${to}`,
                  fileName,
                  activeBranchId === "all" ? (language === "en" ? "All Branches" : "جميع الفروع") : (activeBranchId || "الفرع الرئيسي"),
                );
              }}
              className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              Excel
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const fileName = `Financial_Report_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
                exportComprehensiveWord(
                  report,
                  user?.pharmacyName || (user as any)?.pharmacy_name || (language === "en" ? "Roshetta Pharmacy" : "صيدلية روشيتة"),
                  `${from} ${language === "en" ? "to" : "إلى"} ${to}`,
                  fileName,
                  activeBranchId === "all" ? (language === "en" ? "All Branches" : "جميع الفروع") : (activeBranchId || "الفرع الرئيسي"),
                );
              }}
              className="bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Word</span>
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const fileName = `Financial_Report_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
                exportComprehensivePDF(
                  report,
                  user?.pharmacyName || (user as any)?.pharmacy_name || (language === "en" ? "Roshetta Pharmacy" : "صيدلية روشيتة"),
                  `${from} ${language === "en" ? "to" : "إلى"} ${to}`,
                  fileName,
                  activeBranchId === "all" ? (language === "en" ? "All Branches" : "جميع الفروع") : (activeBranchId || "الفرع الرئيسي"),
                );
              }}
              className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              {language === "en" ? "Print" : "طباعة"}
            </button>
          </div>
        </div>

        {/* Date & Branch Filter */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-mint-line print:hidden flex flex-wrap gap-3 items-center">
          <div className="flex bg-bg rounded-xl p-1 w-fit">
            {(["today", "week", "month", "all", "custom"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${dateRange === r ? "bg-white shadow-sm text-primary" : "text-ink-soft hover:text-ink"}`}
              >
                {r === "today"
                  ? language === "en" ? "Today" : "اليوم"
                  : r === "week"
                    ? language === "en" ? "Last 7 Days" : "آخر 7 أيام"
                    : r === "month"
                      ? language === "en" ? "This Month" : "هذا الشهر"
                      : r === "all"
                        ? language === "en" ? "All Time" : "كل الفترات"
                        : language === "en" ? "Custom" : "مخصص"}
              </button>
            ))}
          </div>
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-bg border border-mint-line rounded-lg px-3 py-2 text-[13px]"
              />
              <span className="text-ink-soft text-[13px] font-bold">{language === "en" ? "to" : "إلى"}</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-bg border border-mint-line rounded-lg px-3 py-2 text-[13px]"
              />
            </div>
          )}
          {isManager && branches.length > 0 && (
            <div className="mr-auto">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-bg border border-mint-line rounded-lg px-3 py-2 text-[13px] font-bold text-primary focus:outline-none focus:border-primary"
              >
                <option value="all">{language === "en" ? "All Branches" : "كل الفروع"}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 7 Summary Cards (Revenue, COGS, Gross Profit, Expenses, Discounts, VAT, Net Profit) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 print:grid-cols-7">
          <div className="bg-primary text-white rounded-2xl p-4 shadow-lg shadow-primary/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-white/80 mb-1">
              {language === "en" ? "Total Revenue" : "إجمالي المبيعات"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black">
              ₪{(Number(report.totalRevenue) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-700 text-white rounded-2xl p-4 shadow-lg shadow-slate-700/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-white/80 mb-1">
              {language === "en" ? "Cost of Goods (COGS)" : "تكلفة المبيعات (COGS)"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black text-slate-100">
              ₪{(Number(report.totalCost) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-teal text-white rounded-2xl p-4 shadow-lg shadow-teal/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-white/80 mb-1">
              {language === "en" ? "Gross Profit" : "الربح الإجمالي"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black">
              ₪{(Number(report.totalProfit) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-coral text-white rounded-2xl p-4 shadow-lg shadow-coral/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-white/80 mb-1">
              {language === "en" ? "Total Expenses" : "إجمالي المصروفات"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black">
              ₪{(Number(report.totalExpenses) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-amber text-ink rounded-2xl p-4 shadow-sm border border-amber/30 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {language === "en" ? "Total Discounts" : "إجمالي الخصومات"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black text-amber-700">
              ₪{(Number(report.totalDiscount) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-800 rounded-2xl p-4 shadow-sm border border-emerald-200 transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-emerald-600 mb-1">
              {language === "en" ? "Total VAT" : "ضريبة القيمة المضافة"}
            </div>
            <div className="font-mono text-[18px] md:text-[22px] font-black text-emerald-800">
              ₪{(Number(report.totalVat) || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white border-2 border-primary/20 rounded-2xl p-4 shadow-sm transform hover:-translate-y-1 transition-all">
            <div className="text-[12px] font-bold text-primary mb-1 flex items-center justify-between">
              {language === "en" ? "Net Profit" : "صافي الربح"}
              <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-full font-bold">
                {report.profitMargin}%
              </span>
            </div>
            <div
              className={`font-mono text-[18px] md:text-[22px] font-black ${(report.netProfit || 0) >= 0 ? "text-primary" : "text-coral"}`}
            >
              ₪{(Number(report.netProfit) || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h3 className="text-[16px] font-bold text-ink mb-6">
              {language === "en" ? "Daily Sales" : "المبيعات اليومية"}
            </h3>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="w-full h-full bg-bg animate-pulse rounded-xl"></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={report.dailyTrend}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2DC08E"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2DC08E"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (typeof val === "string" ? val.substring(5) : "")}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₪${Number(val || 0)}`}
                      orientation="right"
                      width={60}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₪${Number(val || 0).toLocaleString()}`, language === "en" ? "Revenue" : "المبيعات"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2DC08E"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h3 className="text-[16px] font-bold text-ink mb-6">{language === "en" ? "Payment Methods" : "طرق الدفع"}</h3>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="w-full h-full bg-bg animate-pulse rounded-xl"></div>
              ) : pieData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-ink-soft text-[14px]">
                  {language === "en" ? "No Data" : "لا توجد بيانات"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => `₪${Number(val || 0).toLocaleString()}`} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "13px", paddingTop: "20px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Performance Chart */}
          {isManager && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[17px] font-black text-[#1E3A5F]">
                  {language === "en" ? "Branch Performance Comparison" : "مقارنة أداء الفروع"}
                </h3>
              </div>
              <div className="flex flex-col gap-6 justify-center h-[200px]">
                {isLoading ? (
                  <div className="w-full h-full bg-bg animate-pulse rounded-xl"></div>
                ) : (
                  (() => {
                    const branchData = (report.branchPerformance || []).filter(
                      (b: any) =>
                        branches.some((active) => active.name === b.name),
                    );
                    if (branchData.length === 0)
                      return (
                        <div className="text-center text-ink-soft text-[14px]">
                          {language === "en" ? "No sales" : "لا توجد مبيعات"}
                        </div>
                      );
                    const maxRevenue = Math.max(
                      ...branchData.map((d: any) => d.revenue),
                      1,
                    );
                    const totalRevenue =
                      branchData.reduce(
                        (sum: number, b: any) => sum + (Number(b?.revenue) || 0),
                        0,
                      ) || 1;

                    return branchData.map((b: any, idx: number) => {
                      const bRev = Number(b?.revenue) || 0;
                      const percentage = (
                        (bRev / totalRevenue) *
                        100
                      ).toFixed(1);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-4"
                          title={`₪${bRev.toLocaleString()}`}
                        >
                          <div className="w-24 text-start font-black text-[13px] text-[#1E293B] truncate shrink-0">
                            {b.name}
                          </div>
                          <div className="flex-1 h-3.5 bg-slate-100 rounded-full flex justify-start items-center">
                            <div
                              className="h-full rounded-full shadow-sm"
                              style={{
                                width: `${Math.max((bRev / maxRevenue) * 100, 1.5)}%`,
                                background:
                                  "linear-gradient(to left, #223E56, #8BA7C0)",
                              }}
                            />
                          </div>
                          <div className="w-12 text-start font-bold text-[13px] text-ink-soft shrink-0">
                            {percentage}%
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          )}
          {/* Top Selling Items */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h3 className="text-[16px] font-bold text-ink mb-4">
              {language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}
            </h3>
            {isLoading ? (
              <div className="h-40 bg-bg animate-pulse rounded-xl"></div>
            ) : (
              <div className="space-y-4">
                {(report.topItems || []).length === 0 ? (
                  <div className="text-center py-4 text-ink-soft text-[14px]">
                    {language === "en" ? "No sales in this period" : "لا توجد مبيعات في هذه الفترة"}
                  </div>
                ) : (
                  (report.topItems || []).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-bg pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-pale text-teal flex items-center justify-center font-bold text-[13px]">
                          {idx + 1}
                        </div>
                        <div className="font-bold text-[14px] text-ink">
                          {item.name}
                        </div>
                      </div>
                      <div className="text-start">
                        <div className="text-[14px] font-bold text-primary">
                          {item.qty} {language === "en" ? "box" : "علبة"}
                        </div>
                        <div className="text-[12px] font-mono text-ink-soft">
                          ₪{(Number(item.revenue) || 0).toFixed(2)}
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
    </main>
  );
}
