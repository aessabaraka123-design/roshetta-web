"use client";

import AppBar from "@/components/AppBar";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const translatePlanName = (name: string, lang: string) => {
  if (lang !== "en") return name;
  if (!name) return name;
  const n = name.trim();
  if (n.includes("تجريبية") || n.includes("مجان") || n.toLowerCase().includes("free") || n.toLowerCase().includes("trial")) return "Free Trial";
  if (n.includes("شهري") || n.toLowerCase().includes("monthly")) return "Monthly Subscription";
  if (n.includes("سنوي") || n.toLowerCase().includes("annual")) return "Annual Subscription";
  if (n.includes("الحياة") || n.includes("دائم") || n.toLowerCase().includes("lifetime")) return "Lifetime License";
  return name;
};

const translateFeature = (feature: string, lang: string) => {
  if (lang !== "en") return feature;
  if (!feature) return feature;
  const f = feature.trim();
  const map: Record<string, string> = {
    "وصول كامل لجميع ميزات النظام": "Full access to all system features",
    "تجربة 14 يوماً بدون بطاقة ائتمانية": "14-day trial without credit card",
    "تجربة 14 يوما بدون بطاقة ائتمانية": "14-day trial without credit card",
    "إضافة موظفين للتجربة بحرية": "Add staff freely during trial",
    "دعم فني وإرشادي للبدء": "Tech and guidance support to start",
    "إدارة شاملة للمخزون والمبيعات": "Comprehensive inventory and sales management",
    "تحديثات دورية مجانية": "Free periodic updates",
    "دعم فني متواصل 24/7": "24/7 continuous tech support",
    "يدعم حتى 3 فروع وصلاحيات دقيقة": "Supports up to 3 branches and precise permissions",
    "جميع ميزات الباقة الشهرية": "All features of the monthly plan",
    "توفير 20% من قيمة الاشتراك": "Save 20% of subscription value",
    "عدد غير محدود من الفروع والموظفين": "Unlimited branches and staff",
    "تقارير مالية وإحصائيات متقدمة": "Financial reports and advanced statistics",
    "جميع الميزات السابقة مدى الحياة": "All previous features for life",
    "دفع لمرة واحدة فقط (بدون تجديد)": "Pay only once (no renewal)",
    "أولوية قصوى للدعم الفني (VIP)": "Top priority for tech support (VIP)",
    "أمان استثنائي ونسخ احتياطي سحابي": "Exceptional security and cloud backup",
  };
  if (map[f]) return map[f];
  if (f.includes("وصول كامل")) return "Full access to all system features";
  if (f.includes("بدون بطاقة")) return "14-day trial without credit card";
  if (f.includes("إضافة موظفين")) return "Add staff freely during trial";
  if (f.includes("إرشادي")) return "Tech and guidance support to start";
  if (f.includes("شاملة للمخزون")) return "Comprehensive inventory and sales management";
  if (f.includes("تحديثات دورية")) return "Free periodic updates";
  if (f.includes("متواصل 24/7")) return "24/7 continuous tech support";
  if (f.includes("3 فروع")) return "Supports up to 3 branches and permissions";
  if (f.includes("جميع ميزات الباقة الشهرية")) return "All features of the monthly plan";
  if (f.includes("توفير 20%")) return "Save 20% of subscription value";
  if (f.includes("غير محدود")) return "Unlimited branches and staff";
  return feature;
};

export default function MySubscription() {
  const router = useRouter();
  const language = useStore((state: any) => state.language);
  const user = useStore((state: any) => state.user);
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("roshetta_user");
      if (stored) {
        try {
          setLocalUser(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const activeUser = user || localUser;
  const pharmacyId = activeUser?.pharmacy_id;

  // SWR: Fetch live pharmacy subscription status from DB
  const { data: subData, isLoading: isSubLoading } = useSWR(
    pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/subscription-status` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 60000 }
  );

  // SWR: Fetch available plans from DB
  const { data: plansData, isLoading: isPlansLoading } = useSWR(
    `${API_BASE_URL}/api/subscription-plans`,
    fetcher
  );

  const isLoading = (isSubLoading || isPlansLoading) && !subData;

  const subStatus = subData?.success ? subData : null;
  const allPlans: any[] = plansData?.plans || [];

  // Match current plan from DB
  const targetPlanId = subStatus?.plan?.id || subStatus?.subscriptionType || subStatus?.plan_type || "monthly";
  const matchedPlan =
    allPlans.find((p: any) => p.id === targetPlanId || p.id === subStatus?.subscriptionType || p.id === subStatus?.plan_type) ||
    subStatus?.plan ||
    null;

  const planId = matchedPlan?.id || targetPlanId;
  const isLifetime = planId === "lifetime" || subStatus?.subscriptionType === "lifetime";

  const rawPlanName =
    matchedPlan?.name ||
    (planId === "annual"
      ? "اشتراك سنوي"
      : planId === "lifetime"
        ? "مدى الحياة"
        : planId === "free" || planId === "trial"
          ? "تجريبية مجانية"
          : "اشتراك شهري");
  const planName = translatePlanName(rawPlanName, language);

  // Expiry Date & Days Left Calculation
  let daysLeft: number | null = null;
  let formattedExpiry = "";

  if (isLifetime) {
    formattedExpiry = language === "en" ? "Lifetime (Never Expires)" : "مدى الحياة (صلاحية دائمة)";
  } else if (subStatus?.subscriptionExpiry) {
    const expDate = new Date(subStatus.subscriptionExpiry);
    if (!isNaN(expDate.getTime())) {
      formattedExpiry = expDate.toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      daysLeft = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    } else {
      formattedExpiry = subStatus.subscriptionExpiry;
    }
  } else {
    formattedExpiry = language === "en" ? "Not set" : "غير محدد";
  }

  // Status computation
  let status: "active" | "expiring" | "expired" | "pending" = "active";
  if (subStatus?.status === "pending") {
    status = "pending";
  } else if (subStatus?.isReadOnly || subStatus?.isExpired || (daysLeft !== null && daysLeft <= 0)) {
    status = "expired";
  } else if (daysLeft !== null && daysLeft <= 15) {
    status = "expiring";
  } else {
    status = "active";
  }

  // Branches details
  const currentBranches = subStatus?.branchesCount || 1;
  const maxBranchesRaw = matchedPlan?.maxBranches;
  const isUnlimitedBranches = maxBranchesRaw >= 999 || isLifetime || planId === "annual";
  const maxBranchesDisplay = isUnlimitedBranches
    ? language === "en"
      ? "Unlimited"
      : "غير محدود"
    : `${maxBranchesRaw || 3}`;

  // Renewal Price
  const priceDisplay = isLifetime
    ? language === "en"
      ? "One-Time"
      : "دفعة واحدة"
    : matchedPlan?.price !== undefined
      ? `₪ ${matchedPlan.price.toLocaleString("en-US")}`
      : "₪ 0";

  // Features list from database
  let rawFeatures: string[] = [];
  if (Array.isArray(matchedPlan?.features)) {
    rawFeatures = matchedPlan.features;
  } else if (typeof matchedPlan?.features === "string") {
    try {
      rawFeatures = JSON.parse(matchedPlan.features);
    } catch (e) {
      rawFeatures = [];
    }
  }

  if (!rawFeatures || rawFeatures.length === 0) {
    rawFeatures = [
      "إدارة شاملة للمخزون والمبيعات",
      "نقاط البيع السريعة (POS)",
      "تحديثات دورية مجانية",
      "دعم فني متواصل 24/7",
    ];
  }

  const whatsappNumber = subStatus?.whatsapp || "972590000000";

  return (
    <>
      <AppBar
        title={language === "en" ? "Subscription & Plan Details" : "تفاصيل الاشتراك والباقة"}
        backHref="/more"
      />

      <main className="max-w-4xl mx-auto p-4 pb-24 mt-4 space-y-6">
        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            <div className="bg-white rounded-3xl p-6 border border-mint-line h-52">
              <div className="h-6 w-36 bg-slate-200 rounded mb-4"></div>
              <div className="h-10 w-64 bg-slate-200 rounded mb-6"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-slate-100 rounded"></div>
                <div className="h-12 bg-slate-100 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-14 bg-slate-200 rounded-xl"></div>
              <div className="h-14 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-mint-line h-48">
              <div className="h-6 w-48 bg-slate-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded"></div>
                <div className="h-4 bg-slate-100 rounded"></div>
                <div className="h-4 bg-slate-100 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Read-Only or Expired Alert Banner */}
            {(status === "expired" || subStatus?.isReadOnly) && (
              <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px]">
                      {language === "en" ? "Subscription Expired (Read-Only Mode)" : "انتهى اشتراكك (وضع القراءة فقط)"}
                    </h4>
                    <p className="text-[13px] text-rose-700 mt-0.5">
                      {language === "en"
                        ? "Sales and inventory edits are locked until your subscription is renewed."
                        : "تم قفل عمليات البيع وتعديل المخزون مؤقتاً حتى يتم تجديد الاشتراك."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => router.push(`/receipt-upload?plan=${planId}`)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                  >
                    {language === "en" ? "Renew Now" : "تجديد الآن"}
                  </button>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-3 py-2 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs rounded-xl transition text-center"
                  >
                    {language === "en" ? "Support" : "الدعم الفني"}
                  </a>
                </div>
              </div>
            )}

            {/* Pending Request Banner */}
            {status === "pending" && (
              <div className="bg-blue-50 border-2 border-blue-200 text-blue-900 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-[15px]">
                    {language === "en" ? "Subscription Request Under Review" : "طلب الاشتراك قيد المراجعة"}
                  </h4>
                  <p className="text-[13px] text-blue-700 mt-0.5">
                    {language === "en"
                      ? "Your transfer receipt has been received and is being verified by the administration team."
                      : "تم استلام إيصال التحويل وجارٍ مراجعته واعتماده من قبل إدارة المنصة."}
                  </p>
                </div>
              </div>
            )}

            {/* Current Plan Overview Card */}
            <div className="bg-white rounded-3xl p-6 border border-mint-line shadow-sm relative overflow-hidden">
              <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-ink-soft mb-1">
                    {language === "en" ? "Your Current Plan" : "باقتك الحالية"}
                  </div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <h2 className="text-[26px] sm:text-[28px] font-black text-primary">
                      {planName}
                    </h2>
                    <span
                      className={`px-3 py-1 rounded-full text-[12px] font-bold border ${
                        status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : status === "expiring"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : status === "pending"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {status === "active"
                        ? language === "en" ? "Active" : "فعال"
                        : status === "expiring"
                          ? language === "en" ? "Expiring Soon" : "ينتهي قريباً"
                          : status === "pending"
                            ? language === "en" ? "Pending Approval" : "قيد المراجعة"
                            : language === "en" ? "Expired" : "منتهي"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                    <div>
                      <div className="text-[13px] text-ink-soft font-bold mb-1">
                        {language === "en" ? "Expiry Date" : "تاريخ الانتهاء"}
                      </div>
                      <div className="text-[16px] font-black text-ink">
                        {formattedExpiry}
                      </div>
                      {daysLeft !== null && (
                        <div
                          className={`text-[12px] font-bold mt-1 ${
                            daysLeft > 30 ? "text-emerald-600" : daysLeft > 0 ? "text-amber-600" : "text-rose-600"
                          }`}
                        >
                          {daysLeft > 0
                            ? language === "en"
                              ? `(Remaining ${daysLeft} days)`
                              : `(متبقي ${daysLeft} يوماً)`
                            : language === "en"
                              ? "(Expired)"
                              : "(منتهي الصلاحية)"}
                        </div>
                      )}
                      {isLifetime && (
                        <div className="text-[12px] font-bold mt-1 text-emerald-600">
                          {language === "en" ? "(Unlimited validity)" : "(صلاحية دائمة بدون انتهاء)"}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[13px] text-ink-soft font-bold mb-1">
                        {language === "en" ? "Used Branches" : "الفروع المستخدمة"}
                      </div>
                      <div className="text-[16px] font-black text-ink">
                        {currentBranches} / {maxBranchesDisplay}
                      </div>
                      <div className="text-[12px] font-bold text-ink-soft mt-1">
                        {isUnlimitedBranches
                          ? language === "en"
                            ? "Unlimited branches permitted"
                            : "عدد فروع غير محدود"
                          : language === "en"
                            ? `Maximum ${maxBranchesDisplay} branches`
                            : `الحد الأقصى ${maxBranchesDisplay} فروع`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 text-primary border border-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px] w-full sm:w-auto self-stretch sm:self-auto">
                  <div className="text-[12px] font-bold text-ink-soft mb-1">
                    {isLifetime
                      ? language === "en" ? "License Type" : "نوع الترخيص"
                      : language === "en" ? "Renewal Cost" : "تكلفة التجديد"}
                  </div>
                  <div className="text-[22px] font-black font-mono text-primary">
                    {priceDisplay}
                  </div>
                  {!isLifetime && (
                    <div className="text-[11px] text-ink-soft mt-0.5">
                      {planId === "annual"
                        ? language === "en" ? "Per year" : "لكل سنة"
                        : language === "en" ? "Per month" : "لكل شهر"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push(`/receipt-upload?plan=${planId}`)}
                className="bg-primary text-white font-bold py-4 rounded-xl shadow-md shadow-primary/20 hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 text-[16px]"
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {language === "en" ? "Renew Current Subscription" : "تجديد الاشتراك الحالي"}
              </button>

              <button
                onClick={() => router.push("/upgrade-plan")}
                className="bg-amber-50 text-amber-900 border border-amber-300 font-bold py-4 rounded-xl shadow-sm hover:bg-amber-100 active:scale-[0.99] transition flex items-center justify-center gap-2 text-[16px]"
              >
                <svg
                  className="w-5 h-5 text-amber-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {language === "en" ? "Upgrade to Higher Plan" : "ترقية إلى باقة أعلى"}
              </button>
            </div>

            {/* Plan Features from Database */}
            <div className="bg-white rounded-3xl p-6 border border-mint-line shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-black text-primary">
                  {language === "en" ? "Your Current Plan Features" : "مميزات باقتك الحالية"}
                </h3>
                <span className="text-[12px] font-bold text-ink-soft bg-slate-100 px-2.5 py-1 rounded-lg">
                  {rawFeatures.length} {language === "en" ? "Features Included" : "ميزة مشمولة"}
                </span>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rawFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-[14px] font-bold text-ink leading-snug">
                      {translateFeature(feature, language)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical Support & Help Section */}
            <div className="bg-gradient-to-r from-slate-50 to-primary/5 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    {language === "en" ? "Need help with your subscription?" : "هل تحتاج مساعدة في اشتراكك؟"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {language === "en"
                      ? "Our technical support team is available to assist you 24/7."
                      : "فريق الدعم الفني جاهز لمساعدتك والرد على استفساراتك على مدار الساعة."}
                  </p>
                </div>
              </div>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition text-center flex items-center justify-center gap-2 shrink-0"
              >
                <span>{language === "en" ? "Contact WhatsApp Support" : "تواصل عبر واتساب"}</span>
                <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </>
        )}
      </main>
    </>
  );
}
