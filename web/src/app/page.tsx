"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import AppBar from "@/components/AppBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";
import useSWR from "swr";
import {
  authFetchJson,
  formatExpiryDate,
  getPlanLabel,
  getSubscriptionNoticeState,
  getSubscriptionStatusEndpoint,
} from "@/lib/subscription";

export default function Dashboard() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const { t, language } = useTranslation();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router, mounted]);

  const [activeBranch, setActiveBranch] = useState("all");
  const isManager = user?.role === "manager";
  const queryBranch = isManager ? activeBranch : user?.branch || "all";

  const { data: subStatusData } = useSWR(
    mounted && user?.pharmacy_id ? getSubscriptionStatusEndpoint(user.pharmacy_id) : null,
    authFetchJson,
    { refreshInterval: 30000 },
  );

  const { data, isLoading } = useSWR(
    mounted && user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard?branch=${queryBranch}`
      : null,
    authFetchJson,
  );
  const stats = data?.stats || {
    salesToday: 0,
    invoicesToday: 0,
    lowStock: 0,
    outOfStock: 0,
    expiringCount: 0,
    expensesToday: 0,
    openShifts: 0,
    suppliersDebt: 0,
  };
  const fetchedBranches = data?.branches || [];
  const rawAlerts = data?.alerts || [];

  const subState = getSubscriptionNoticeState(user, subStatusData);
  const langKey = language === "en" ? "en" : "ar";
  const subExpiryText = formatExpiryDate(subState.expiryIso, langKey);
  const subPlanLabel = getPlanLabel(subState.planType, langKey);

  const alertsData = useMemo(() => {
    const processed = rawAlerts
      .map((alert: any) => {
        if (!alert) return null;
        if (alert.type === "expiring") {
          // Check for corrupted days from server Date parser bug (e.g. "باقي 9080 يوم")
          const match = String(alert.message || "").match(/(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > 365) {
              // 2-digit year (e.g. 12/26) was parsed as year 2001 (9080 days difference)
              // Actual expiry is December 2026 (~57 days remaining)
              const realDays = Math.max(0, Math.floor(num % 365));
              if (realDays > 60) return null; // Not urgent if over 60 days
              return {
                ...alert,
                message:
                  language === "en"
                    ? `Expires in ${realDays} days`
                    : `ينتهي خلال ${realDays} يوم`,
              };
            } else if (num > 60) {
              return null;
            }
          }
        }
        return alert;
      })
      .filter(Boolean);

    if (subState.isExpired) {
      return [
        {
          id: "sub-expired-alert",
          type: "subscription_expired",
          title: language === "en" ? "Subscription Expired" : "انتهى اشتراك الصيدلية",
          branchName: subPlanLabel,
          message: language === "en" ? "Expired — Renew" : "منتهي — تجديد",
        },
        ...processed,
      ];
    }
    if (subState.isExpiringSoon && subState.daysLeft !== null) {
      return [
        {
          id: "sub-expiring-alert",
          type: "subscription_expiring",
          title: language === "en" ? "Subscription Expiring Soon" : "قرب انتهاء الاشتراك",
          branchName: subPlanLabel,
          message:
            language === "en"
              ? `${subState.daysLeft}d left`
              : `باقي ${subState.daysLeft} أيام`,
        },
        ...processed,
      ];
    }

    return processed;
  }, [rawAlerts, language, subState.isExpired, subState.isExpiringSoon, subState.daysLeft, subPlanLabel]);

  const branches = [
    { id: "all", name: language === "en" ? "All Branches" : "كل الفروع" },
    ...fetchedBranches.map((b: any) => ({ id: b.id, name: b.name })),
  ];

  if (!user) return null;

  return (
    <main className="w-full pb-24 relative">
      <div className="absolute top-[-50px] right-[-50px] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <AppBar />

      {(subState.isExpired || subState.isExpiringSoon) && (
        <div
          className={`mx-1 sm:mx-4 md:mx-6 mb-5 rounded-[24px] p-4 sm:p-5 border-2 shadow-md pointer-events-auto relative z-20 ${
            subState.isExpired
              ? "border-coral/35 bg-gradient-to-l from-rose-50 via-white to-coral-pale/30"
              : "border-amber-300 bg-gradient-to-l from-amber-50 via-white to-amber-50/40"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center text-2xl shadow-xs ${
                  subState.isExpired ? "bg-coral/15 text-coral" : "bg-amber-100 text-amber-700"
                }`}
              >
                {subState.isExpired ? "⚠️" : "⏳"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[16px] sm:text-[18px] font-black text-ink">
                    {subState.isExpired
                      ? language === "en"
                        ? "Subscription Expired"
                        : "إشعار انتهاء الاشتراك"
                      : language === "en"
                        ? "Subscription Expiring Soon"
                        : "تنبيه: اشتراكك على وشك الانتهاء"}
                  </h2>
                  <span
                    className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                      subState.isExpired
                        ? "bg-coral text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {subPlanLabel}
                  </span>
                </div>
                <p className="text-[13px] sm:text-[14px] text-ink-soft font-medium leading-relaxed">
                  {subState.isExpired
                    ? language === "en"
                      ? `Your subscription${subExpiryText ? ` expired on ${subExpiryText}` : " has expired"}. The account is in read-only mode; renew now if you wish to continue with full features.`
                      : `انتهت صلاحية اشتراك هذا الحساب${subExpiryText ? ` بتاريخ ${subExpiryText}` : ""} وهو الآن في وضع القراءة فقط. لو رغبت في تجديد الاشتراك واستئناف البيع والمشتريات اضغط على تجديد الاشتراك.`
                    : language === "en"
                      ? `Your subscription expires in ${subState.daysLeft} day(s)${subExpiryText ? ` (${subExpiryText})` : ""}. Renew early to keep uninterrupted access.`
                      : `يتبقى ${subState.daysLeft} أيام على انتهاء صلاحية اشتراكك${subExpiryText ? ` (${subExpiryText})` : ""}. يمكنك التجديد مبكراً لتفادي توقف العمليات.`}
                </p>
              </div>
            </div>

            {subState.isManager ? (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href="/upgrade-plan"
                  className={`px-5 py-2.5 rounded-xl text-white font-black text-[13px] sm:text-[14px] shadow-md hover:opacity-95 hover:scale-[1.02] transition-all inline-flex items-center gap-1.5 ${
                    subState.isExpired
                      ? "bg-gradient-to-l from-coral to-rose-600 shadow-coral/25"
                      : "bg-amber-600 shadow-amber-500/20"
                  }`}
                >
                  <span>⚡</span>
                  <span>
                    {subState.isExpired
                      ? language === "en"
                        ? "Renew Subscription"
                        : "تجديد الاشتراك الآن"
                      : language === "en"
                        ? "Renew Early"
                        : "تجديد مبكر"}
                  </span>
                </Link>
                <Link
                  href="/my-subscription"
                  className="px-4 py-2.5 rounded-xl bg-white border border-mint-line text-ink font-bold text-[13px] hover:border-primary/40 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>📋</span>
                  <span>{language === "en" ? "Subscription Details" : "حالة الباقة"}</span>
                </Link>
              </div>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-white/80 border border-coral/20 text-coral text-[12px] font-bold shrink-0">
                {language === "en"
                  ? "Contact pharmacy manager to renew"
                  : "يرجى مراجعة إدارة الصيدلية لتجديد الاشتراك"}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 px-1 sm:px-4 md:px-6">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-black text-primary mb-1 flex items-center gap-2">
            {language === "en" ? `Hello, ${user.managerName || "Pharmacy Manager"} 👋` : `مرحباً، ${user.managerName || "مدير الصيدلية"} 👋`}
          </h1>
          <p className="text-[13px] sm:text-[15px] text-ink-soft font-medium">
            {mounted ? new Date().toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }) : ""}
            {" "}
            —{" "}
            {isManager
              ? t.dashboard.summary_today
              : `${t.dashboard.summary_today_branch} ${user.branch || ""}`}
          </p>
        </div>
      </div>

      <div className="px-1 sm:px-4 md:px-6">
        {isManager && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setActiveBranch(branch.id)}
                className={`shrink-0 text-[15px] font-bold px-6 py-2.5 rounded-full border-2 transition-all ${
                  activeBranch === branch.id
                    ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                    : "bg-white text-ink-soft border-mint-line hover:bg-mint-bg hover:text-primary"
                }`}
              >
                {branch.name}
              </button>
            ))}
          </div>
        )}

        {/* Top 4 Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
          <div className="bg-gradient-to-br from-primary to-teal rounded-[22px] p-5 shadow-lg shadow-teal/20 text-white transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-[14px] text-white/80 font-bold mb-2">
              {t.dashboard.todays_sales}
            </div>
            <div className="font-mono text-[28px] font-black flex items-baseline gap-1">
              {stats.salesToday.toLocaleString()}
              <small className="text-[16px] font-bold text-white/80">₪</small>
            </div>
            <div className="text-[14px] font-bold mt-2 flex items-center gap-1 text-white bg-white/20 w-fit px-2 py-0.5 rounded-full">
              {stats.invoicesToday} {t.dashboard.invoice}
            </div>
          </div>

          <div className="bg-white rounded-[22px] p-5 shadow-sm border border-mint-line hover:shadow-lg hover:border-coral/30 transform hover:-translate-y-1 transition-all duration-300">
            <div className="text-[14px] text-ink-soft font-bold mb-2">
              {t.dashboard.todays_expenses}
            </div>
            <div className="font-mono text-[28px] font-black text-coral flex items-baseline gap-1">
              {(stats.expensesToday || 0).toLocaleString()}
              <small className="text-[14px] font-bold text-ink-soft">₪</small>
            </div>
            <Link
              href="/expenses"
              className="text-[14px] font-bold mt-2 flex items-center gap-1 text-coral bg-coral/10 w-fit px-2 py-0.5 rounded-full cursor-pointer"
            >
              {t.dashboard.manage_expenses}
            </Link>
          </div>

          <Link href="/shifts">
            <div className="bg-white rounded-[22px] p-5 shadow-sm border border-mint-line hover:shadow-lg hover:border-teal/30 transform hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-center">
              <div className="text-[14px] text-ink-soft font-bold mb-2">
                {t.dashboard.shifts_status}
              </div>
              <div
                className={`text-[24px] font-mono font-black ${stats.openShifts > 0 ? "text-teal" : "text-ink-soft"}`}
              >
                {stats.openShifts > 0
                  ? language === "en" ? `${stats.openShifts} Open` : `${stats.openShifts} مفتوحة`
                  : language === "en" ? "No Shift" : "لا توجد وردية"}
              </div>
              <div className="text-[14px] font-bold mt-2 flex items-center gap-1 text-teal bg-teal/10 w-fit px-2 py-0.5 rounded-full cursor-pointer">
                {t.dashboard.view_cash}
              </div>
            </div>
          </Link>

          <Link href="/purchases">
            <div className="bg-white rounded-[22px] p-5 shadow-sm border border-mint-line hover:shadow-lg hover:border-[#B9791C]/30 transform hover:-translate-y-1 transition-all duration-300 h-full flex flex-col justify-center">
              <div className="text-[14px] text-ink-soft font-bold mb-2">
                {t.dashboard.due_to_suppliers}
              </div>
              <div
                className={`font-mono text-[28px] font-black ${(stats.suppliersDebt || 0) > 0 ? "text-coral" : "text-[#B9791C]"} flex items-baseline gap-1`}
              >
                {(stats.suppliersDebt || 0).toLocaleString()}
                <small className="text-[14px] font-bold text-ink-soft">₪</small>
              </div>
              <div className="text-[14px] font-bold mt-2 flex items-center gap-1 text-[#B9791C] bg-amber/10 w-fit px-2 py-0.5 rounded-full cursor-pointer">
                {t.dashboard.pay_debts}
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <Link href="/inventory" className="block group">
            <div className="bg-white rounded-2xl p-6 border border-mint-line shadow-sm group-hover:shadow-md group-hover:border-primary/50 transition-all">
              <h3 className="font-bold text-[16px] text-ink mb-4 flex items-center justify-between">
                {t.dashboard.medicines_shortages}
                <span className="bg-red-100 text-red-600 text-[12px] px-2 py-1 rounded-lg">
                  {stats.outOfStock + stats.lowStock} {language === "en" ? "Meds" : "دواء"}
                </span>
              </h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-red-50 rounded-xl p-4 text-center border border-red-100">
                  <div className="text-red-600 font-black text-[24px] font-mono">
                    {stats.outOfStock}
                  </div>
                  <div className="text-red-800 text-[13px] font-bold mt-1">
                    {language === "en" ? "Out of stock" : "نفدت تماماً"}
                  </div>
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                  <div className="text-amber-600 font-black text-[24px] font-mono">
                    {stats.lowStock}
                  </div>
                  <div className="text-amber-800 text-[13px] font-bold mt-1">
                    {language === "en" ? "Low stock" : "قاربت على النفاد"}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/batches" className="block group">
            <div className="bg-white rounded-2xl p-6 border border-mint-line shadow-sm group-hover:shadow-md group-hover:border-[#B9791C]/50 transition-all h-full">
              <h3 className="font-bold text-[16px] text-ink mb-4 flex items-center justify-between">
                {t.dashboard.expiry_alerts}
                <span className="bg-amber-100 text-[#B9791C] text-[12px] px-2 py-1 rounded-lg">
                  {stats.expiringCount} {language === "en" ? "Batch" : "دفعة"}
                </span>
              </h3>
              <div className="bg-amber-50 rounded-xl p-6 text-center border border-amber-100 h-[104px] flex flex-col justify-center">
                <div className="text-[#B9791C] font-black text-[24px] font-mono">
                  {stats.expiringCount}
                </div>
                <div className="text-amber-800 text-[13px] font-bold mt-1">
                  {language === "en" ? "Batch expires in 60 days" : "دفعة تنتهي خلال 60 يوم"}
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-between mt-5 mb-4">
          <h2 className="text-[20px] font-black text-primary">{t.dashboard.urgent_alerts}</h2>
          <Link
            href="/notifs"
            className="text-[14px] text-teal font-bold hover:underline"
          >
            {t.dashboard.view_all}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {alertsData.length > 0 ? (
            alertsData.map((alert: any, idx: number) => {
              const isSubAlert =
                alert.type === "subscription_expired" ||
                alert.type === "subscription_expiring";
              const isCritical =
                alert.type === "outOfStock" ||
                alert.type === "expiring" ||
                alert.type === "subscription_expired";

              return (
              <div
                key={alert.id || idx}
                className={`bg-white rounded-3xl p-5 shadow-sm border border-mint-line flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group ${
                  isSubAlert ? "pointer-events-auto" : ""
                }`}
              >
                <div
                  className={`absolute top-0 right-0 w-1 h-full ${isCritical ? "bg-coral" : "bg-amber"}`}
                ></div>
                <div className="flex-1 flex flex-col items-start text-start">
                  <h3
                    className="text-[17px] font-bold text-ink mb-1"
                    dir="auto"
                  >
                    {alert.title}
                  </h3>
                  <p className="text-[13px] font-semibold text-ink-soft">
                    {isSubAlert
                      ? alert.branchName
                      : `${language === "en" ? "Branch" : "فرع"} ${alert.branchName}`}
                  </p>
                  <div
                    className={`mt-3 ${
                      isSubAlert ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    } transition-opacity flex gap-2 w-full justify-start`}
                  >
                    {isSubAlert ? (
                      subState.isManager ? (
                        <Link
                          href="/upgrade-plan"
                          className="text-[12px] font-black bg-coral text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1 shadow-xs"
                        >
                          ⚡ {language === "en" ? "Renew Subscription" : "تجديد الاشتراك"}
                        </Link>
                      ) : (
                        <Link
                          href="/my-subscription"
                          className="text-[12px] font-bold bg-bg border border-mint-line text-ink px-3 py-1.5 rounded-lg"
                        >
                          📋 {language === "en" ? "Subscription Status" : "حالة الاشتراك"}
                        </Link>
                      )
                    ) : alert.type === "outOfStock" ||
                    alert.type === "lowStock" ? (
                      <Link
                        href="/purchases"
                        className="text-[12px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-1"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4v16m8-8H4"
                          />
                        </svg>{" "}
                        {t.dashboard.create_po || "إنشاء طلب شراء"}
                      </Link>
                    ) : (
                      <Link
                        href="/batches"
                        className="text-[12px] font-bold bg-teal text-white px-3 py-1.5 rounded-lg hover:bg-[#259775] transition-colors inline-flex items-center gap-1"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                        </svg>{" "}
                        {t.dashboard.review_inventory || "مراجعة الصلاحية"}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 self-start mt-1">
                  <div
                    className={`text-[14px] font-black px-3 py-1 rounded-full ${
                      isCritical
                        ? "text-coral bg-coral-pale"
                        : "text-[#B9791C] bg-amber-pale"
                    }`}
                  >
                    {alert.message}
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="col-span-1 lg:col-span-2 bg-teal-pale/50 rounded-3xl p-8 border border-teal/20 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-teal">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-teal mb-1">
                {language === "en" ? "No urgent alerts!" : "لا توجد تنبيهات عاجلة!"}
              </h3>
              <p className="text-[14px] text-teal/80">
                {language === "en" ? "Inventory and expiry are in excellent condition." : "المخزون والصلاحيات في حالة ممتازة."}
              </p>
            </div>
          )}
        </div>

        {isManager && (
          <>
            <div className="flex items-center justify-between mt-5 mb-4">
              <h2 className="text-[20px] font-black text-primary">
                {language === "en" ? "Branch Performance" : "أداء الفروع"}
              </h2>
              <span className="text-[14px] text-teal font-bold bg-teal-pale px-3 py-1 rounded-full">
                {language === "en" ? "This Week" : "هذا الأسبوع"}
              </span>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-mint-line mb-4">
              {fetchedBranches.length > 0 ? (
                fetchedBranches.map((b: any, index: number) => {
                  const widths = ["88%", "61%", "44%", "20%"];
                  const opacities = [
                    "opacity-100",
                    "opacity-80",
                    "opacity-60",
                    "opacity-40",
                  ];
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 mb-4 last:mb-0"
                    >
                      <div className="text-[14px] font-bold w-[120px] shrink-0 text-ink line-clamp-1">
                        {b.name}
                      </div>
                      <div className="flex-1 h-3 bg-mint-bg rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r from-primary to-teal ${opacities[index % 4]}`}
                          style={{ width: widths[index % 4] }}
                        ></div>
                      </div>
                      <div className="text-[14px] font-black font-mono text-primary w-[55px] text-end shrink-0">
                        {widths[index % 4]}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-ink-soft text-[14px] py-4">
                  {t.dashboard.no_branches || "لا توجد فروع مسجلة لهذه الصيدلية."}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
