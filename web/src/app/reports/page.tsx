"use client";

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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { exportToExcel, exportComprehensivePDF } from "@/utils/export";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type DateRange = "today" | "week" | "month" | "custom";

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
  return { from: customFrom || fmt(today), to: customTo || fmt(today) };
}

const PIE_COLORS = ["#2DC08E", "#223E56", "#F2A93B", "#6FA3C9", "#E85D75"];

export default function Reports() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
    else if (user.role !== "manager" && user.role !== "مدير فرع") {
      toast.error("ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router]);

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

  const { from, to } = useMemo(
    () => getDateRange(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo],
  );

  const userBranchObj = branches.find((b: any) => b.name === user?.branch);
  let activeBranchId = branchFilter;
  if (user?.role === "صيدلي" || user?.role === "مدير فرع") {
    activeBranchId = userBranchObj ? userBranchObj.name : "PENDING";
  }

  const shouldFetch = user && activeBranchId !== "PENDING";
  const { data, isLoading } = useSWR(
    shouldFetch
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/reports?from=${from}&to=${to}&branch=${activeBranchId}`
      : null,
    fetcher,
  );

  const report = data?.data || {
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    dailyTrend: [],
    branchPerformance: [],
    topItems: [],
    paymentBreakdown: { cash: 0, card: 0, credit: 0, insurance: 0, other: 0 },
  };

  const pb = report.paymentBreakdown || {};
  const pieData = [
    { name: "نقدي", value: pb.cash || 0 },
    { name: "بنكي", value: pb.bank || 0 },
    { name: "جوال باي", value: pb.jawwal || 0 },
    { name: "بال باي", value: pb.palpay || 0 },
    { name: "مالتشات", value: pb.maalchat || 0 },
    { name: "ذمم", value: pb.credit || 0 },
    { name: "أخرى", value: pb.other || 0 },
  ].filter((d) => d.value > 0);

  const handlePrint = () => window.print();

  if (!user) return null;

  return (
    <main className="w-full pb-24 relative print:p-0">
      <AppBar
        title="التقارير المالية والأداء"
        backHref={isManager ? "/more" : "/"}
      />

      <div className="max-w-6xl mx-auto p-4 mt-4 space-y-8 print:space-y-4">
        {/* Header + Print */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[24px] font-black text-primary">التقارير 📊</h1>
            <p className="text-ink-soft text-[14px] font-bold">
              {from} — {to}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() =>
                exportToExcel(
                  [
                    {
                      totalRevenue: report.totalRevenue,
                      totalProfit: report.totalProfit,
                      totalExpenses: report.totalExpenses,
                      netProfit: report.netProfit,
                    },
                  ],
                  "Financial_Report",
                )
              }
              className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              Excel
            </button>
            <button
              onClick={() =>
                exportComprehensivePDF(
                  report,
                  user.pharmacyName || "صيدليتي",
                  `${from} إلى ${to}`,
                  "Financial_Report",
                )
              }
              className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              PDF
            </button>
            <button
              onClick={handlePrint}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              طباعة
            </button>
          </div>
        </div>

        {/* Date & Branch Filter */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-mint-line print:hidden flex flex-wrap gap-3 items-center">
          <div className="flex bg-bg rounded-xl p-1 w-fit">
            {(["today", "week", "month", "custom"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${dateRange === r ? "bg-white shadow-sm text-primary" : "text-ink-soft hover:text-ink"}`}
              >
                {r === "today"
                  ? "اليوم"
                  : r === "week"
                    ? "آخر 7 أيام"
                    : r === "month"
                      ? "هذا الشهر"
                      : "مخصص"}
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
              <span className="text-ink-soft text-[13px] font-bold">إلى</span>
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
                <option value="all">كل الفروع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 4 Summary Cards (Revenue, Profit, Expenses, Net Profit) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="bg-primary text-white rounded-2xl p-5 shadow-lg shadow-primary/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[13px] font-bold text-white/80 mb-1">
              إجمالي المبيعات
            </div>
            <div className="font-mono text-[24px] md:text-[28px] font-black">
              ₪{report.totalRevenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-teal text-white rounded-2xl p-5 shadow-lg shadow-teal/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[13px] font-bold text-white/80 mb-1">
              الربح الإجمالي (من المبيعات)
            </div>
            <div className="font-mono text-[24px] md:text-[28px] font-black">
              ₪{report.totalProfit.toLocaleString()}
            </div>
          </div>
          <div className="bg-coral text-white rounded-2xl p-5 shadow-lg shadow-coral/20 transform hover:-translate-y-1 transition-all">
            <div className="text-[13px] font-bold text-white/80 mb-1">
              إجمالي المصروفات
            </div>
            <div className="font-mono text-[24px] md:text-[28px] font-black">
              ₪{(report.totalExpenses || 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white border-2 border-primary/20 rounded-2xl p-5 shadow-sm transform hover:-translate-y-1 transition-all">
            <div className="text-[13px] font-bold text-primary mb-1 flex items-center justify-between">
              صافي الربح
              <span className="text-[11px] bg-primary/10 px-2 py-0.5 rounded-full">
                {report.profitMargin}% هامش
              </span>
            </div>
            <div
              className={`font-mono text-[24px] md:text-[28px] font-black ${(report.netProfit || 0) >= 0 ? "text-primary" : "text-coral"}`}
            >
              ₪{(report.netProfit || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h3 className="text-[16px] font-bold text-ink mb-6">
              المبيعات اليومية
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
                      tickFormatter={(val) => val.substring(5)}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₪${val}`}
                      orientation="right"
                      width={60}
                    />
                    <Tooltip
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
            <h3 className="text-[16px] font-bold text-ink mb-6">طرق الدفع</h3>
            <div className="h-[300px]">
              {isLoading ? (
                <div className="w-full h-full bg-bg animate-pulse rounded-xl"></div>
              ) : pieData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-ink-soft text-[14px]">
                  لا توجد بيانات
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
                    <Tooltip formatter={(val: number) => `₪${val}`} />
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
                  مقارنة أداء الفروع
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
                          لا توجد مبيعات
                        </div>
                      );
                    const maxRevenue = Math.max(
                      ...branchData.map((d: any) => d.revenue),
                      1,
                    );
                    const totalRevenue =
                      branchData.reduce(
                        (sum: number, b: any) => sum + b.revenue,
                        0,
                      ) || 1;

                    return branchData.map((b: any, idx: number) => {
                      const percentage = (
                        (b.revenue / totalRevenue) *
                        100
                      ).toFixed(1);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-4"
                          title={`₪${b.revenue.toLocaleString()}`}
                        >
                          <div className="w-24 text-right font-black text-[13px] text-[#1E293B] truncate shrink-0">
                            {b.name}
                          </div>
                          <div className="flex-1 h-3.5 bg-slate-100 rounded-full flex justify-start items-center">
                            <div
                              className="h-full rounded-full shadow-sm"
                              style={{
                                width: `${Math.max((b.revenue / maxRevenue) * 100, 1.5)}%`,
                                background:
                                  "linear-gradient(to left, #223E56, #8BA7C0)",
                              }}
                            />
                          </div>
                          <div className="w-12 text-left font-bold text-[13px] text-ink-soft shrink-0">
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
              الأدوية الأكثر مبيعاً
            </h3>
            {isLoading ? (
              <div className="h-40 bg-bg animate-pulse rounded-xl"></div>
            ) : (
              <div className="space-y-4">
                {(report.topItems || []).length === 0 ? (
                  <div className="text-center py-4 text-ink-soft text-[14px]">
                    لا توجد مبيعات في هذه الفترة
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
                      <div className="text-right">
                        <div className="text-[14px] font-bold text-primary">
                          {item.qty} علبة
                        </div>
                        <div className="text-[12px] font-mono text-ink-soft">
                          ₪{item.revenue.toFixed(2)}
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
