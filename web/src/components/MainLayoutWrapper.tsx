"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { rehydrateClientStore, useStore } from "@/store";
import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import "@/lib/errorTranslations";
import {
  authFetchJson,
  formatExpiryDate,
  getPlanLabel,
  getSubscriptionNoticeState,
  getSubscriptionStatusEndpoint,
  resolveEffectiveExpiryMs,
} from "@/lib/subscription";

function isJwtExpired(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const payload = JSON.parse(json);
    if (typeof payload.exp === "number") {
      return Date.now() >= payload.exp * 1000;
    }
  } catch (_) {}
  return false;
}

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const [mounted, setMounted] = useState(false);
  const [expiredModalDismissed, setExpiredModalDismissed] = useState(true);
  const [soonBannerDismissed, setSoonBannerDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !user?.pharmacy_id || typeof window === "undefined") return;
    try {
      const dismissed = sessionStorage.getItem(`roshetta_sub_expired_dismissed_${user.pharmacy_id}`);
      setExpiredModalDismissed(dismissed === "1");
    } catch (_) {
      setExpiredModalDismissed(false);
    }
  }, [mounted, user?.pharmacy_id]);

  const { data: subStatusData } = useSWR(
    mounted && user?.pharmacy_id ? getSubscriptionStatusEndpoint(user.pharmacy_id) : null,
    authFetchJson,
    { refreshInterval: user?.isReadOnly ? 10000 : 30000 }
  );

  const { data: adminSettingsData } = useSWR(
    mounted ? `${API_BASE_URL}/api/admin/settings` : null,
    authFetchJson,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  // Sync isReadOnly, isExpired, subscriptionExpiry, pharmacyName, subscriptionType, isActive between server and store
  useEffect(() => {
    if (subStatusData && subStatusData.success && user) {
      let hasChanges = false;
      const updatedUser = { ...user };
      const effectiveExpiryMs = resolveEffectiveExpiryMs(subStatusData);
      const effectiveExpiryIso =
        subStatusData.subscriptionExpiry ||
        subStatusData.pharmacy?.subscriptionExpiry ||
        (Number.isFinite(effectiveExpiryMs) ? new Date(effectiveExpiryMs).toISOString() : null);
      const subType = subStatusData.subscriptionType || user.subscriptionType;
      const isDateExpired =
        subType !== "lifetime" &&
        Number.isFinite(effectiveExpiryMs) &&
        effectiveExpiryMs <= Date.now();

      const shouldBeReadOnly =
        subStatusData.status === "pending" ||
        subStatusData.isReadOnly === true ||
        subStatusData.isExpired === true ||
        isDateExpired;

      if (shouldBeReadOnly && !user.isReadOnly) {
        updatedUser.isReadOnly = true;
        hasChanges = true;
      } else if (!shouldBeReadOnly && subStatusData.isReadOnly === false && !isDateExpired && user.isReadOnly) {
        updatedUser.isReadOnly = false;
        hasChanges = true;
      }
      if (effectiveExpiryIso && effectiveExpiryIso !== user.subscriptionExpiry) {
        updatedUser.subscriptionExpiry = effectiveExpiryIso;
        hasChanges = true;
      }
      if (isDateExpired !== Boolean(user.isExpired)) {
        updatedUser.isExpired = isDateExpired;
        hasChanges = true;
      }
      if (subStatusData.pharmacyName && subStatusData.pharmacyName !== user.pharmacyName) {
        updatedUser.pharmacyName = subStatusData.pharmacyName;
        hasChanges = true;
      }
      if (subStatusData.subscriptionType && subStatusData.subscriptionType !== user.subscriptionType) {
        updatedUser.subscriptionType = subStatusData.subscriptionType;
        hasChanges = true;
      }
      if (typeof subStatusData.isActive === "boolean" && subStatusData.isActive !== user.isActive) {
        updatedUser.isActive = subStatusData.isActive;
        hasChanges = true;
      }

      if (hasChanges) {
        useStore.getState().login(updatedUser, useStore.getState().token || undefined);
        try {
          localStorage.setItem("roshetta_user", JSON.stringify(updatedUser));
        } catch (e) {}
      }
    }
  }, [subStatusData, user]);

  const isAuth =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/pricing" ||
    pathname === "/receipt-upload";

  useEffect(() => {
    // 1. Rehydrate persisted store after hydration, then validate session/token
    if (typeof window !== "undefined") {
      rehydrateClientStore();
      const storedUser = localStorage.getItem("roshetta_user");
      const storedToken = localStorage.getItem("roshetta_token");

      if (storedToken && isJwtExpired(storedToken)) {
        useStore.getState().logout();
        if (!isAuth) {
          toast.error(
            language === "en"
              ? "Session expired; please sign in again."
              : "انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً.",
            { id: "session-expired-toast", duration: 4500 }
          );
          router.replace("/login");
          return;
        }
      } else if (storedUser && !useStore.getState().user) {
        try {
          useStore.getState().login(JSON.parse(storedUser), storedToken || undefined);
        } catch (e) {}
      }
    }

    let isRedirectingForExpiredSession = false;

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
      
      if (url && url.includes('/api/') && !url.includes('/api/auth/')) {
        init = init || {};
        const headers = new Headers(init.headers);
        const token = useStore.getState().token || (typeof window !== 'undefined' ? localStorage.getItem('roshetta_token') : '');
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        
        if (init.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(init.method.toUpperCase()) && !(init.body instanceof FormData)) {
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
          if (!headers.has('Idempotency-Key')) {
            const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            headers.set('Idempotency-Key', uuid);
          }
        }
        init.headers = headers;
      }

      const response = await originalFetch(input, init);

      // Global 401 Session Interceptor: catches expired or invalid session errors
      if (
        response.status === 401 &&
        url &&
        url.includes('/api/') &&
        !url.includes('/api/auth/login')
      ) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          const errStr = String(data?.error || '').toLowerCase();
          const codeStr = String(data?.code || '').toUpperCase();
          const isSessionError =
            codeStr === 'DEVICE_SESSION_INVALID' ||
            codeStr === 'DEVICE_SESSION_REVOKED' ||
            codeStr === 'ACCOUNT_UNAVAILABLE' ||
            codeStr === 'CREDENTIALS_CHANGED' ||
            errStr.includes('expired session') ||
            errStr.includes('invalid session') ||
            errStr.includes('sign in again') ||
            errStr.includes('authentication required');

          if (isSessionError && !isRedirectingForExpiredSession) {
            isRedirectingForExpiredSession = true;
            useStore.getState().logout();
            const currentLang = useStore.getState().language || 'ar';
            toast.error(
              currentLang === 'en'
                ? 'Session expired; please sign in again.'
                : 'انتهت صلاحية الجلسة؛ يرجى تسجيل الدخول مجدداً.',
              { id: 'session-expired-toast', duration: 4500 }
            );
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              setTimeout(() => {
                window.location.href = '/login';
              }, 400);
            }
          }
        } catch (_) {}
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isAuth, language, router]);

  useEffect(() => {
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    document.documentElement.lang = language || "ar";
  }, [language]);

  // Global Auth Guard: if not an auth page and no user logged in, smoothly redirect to /login
  useEffect(() => {
    if (mounted && !isAuth && !user) {
      const storedUser = typeof window !== "undefined" ? localStorage.getItem("roshetta_user") : null;
      if (!storedUser) {
        router.replace("/login");
      }
    }
  }, [mounted, isAuth, user, router]);

  if (isAuth) {
    return (
      <main className="flex-1 w-full min-h-screen flex flex-col">
        {children}
      </main>
    );
  }

  // Prevent blank screen while checking auth on protected pages
  if (mounted && !user) {
    return (
      <div className="flex-1 w-full min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-ink-soft text-sm font-bold">
          {language === "en" ? "Redirecting to login..." : "جاري التحويل لتسجيل الدخول..."}
        </p>
      </div>
    );
  }

  const subState = getSubscriptionNoticeState(
    mounted ? user : null,
    subStatusData,
    adminSettingsData
  );
  const {
    isReadOnly,
    isRejected,
    isPending,
    isExpired,
    isExpiringSoon,
    isManager,
    activePlan,
    planType,
    expiryIso,
    daysLeft,
    whatsapp,
  } = subState;
  const supportHref = whatsapp ? `https://wa.me/${whatsapp}` : "/owner-support";
  const isSupportExternal = Boolean(whatsapp);

  const isExemptFromReadOnlyBlock =
    pathname === "/upgrade-plan" ||
    pathname === "/pricing" ||
    pathname === "/receipt-upload" ||
    pathname === "/my-subscription" ||
    pathname === "/notifs" ||
    pathname === "/owner-support";

  const renderSupportAction = (
    label: string,
    className: string,
    style?: React.CSSProperties
  ) =>
    isSupportExternal ? (
      <a
        href={supportHref}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {label}
      </a>
    ) : (
      <Link href="/owner-support" className={className} style={style}>
        {label}
      </Link>
    );

  const isEn = language === "en";
  const expiryFormatted = formatExpiryDate(expiryIso, isEn ? "en" : "ar");
  const planLabel = getPlanLabel(planType, isEn ? "en" : "ar");

  const dismissExpiredModal = () => {
    setExpiredModalDismissed(true);
    if (user?.pharmacy_id && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`roshetta_sub_expired_dismissed_${user.pharmacy_id}`, "1");
      } catch (_) {}
    }
  };

  return (
    <div className="flex-1 w-full min-h-screen flex flex-col relative">
      {mounted && isReadOnly && (
        <div
          className="text-white text-center py-2.5 px-4 font-bold text-sm shadow-md sticky top-0 z-[9990] flex items-center justify-center gap-2 sm:gap-3 flex-wrap transition-colors duration-500"
          style={{
            backgroundColor: isRejected ? "#B91C1C" : isPending ? "#D97706" : "#DC2626",
          }}
        >
          {isRejected ? (
            <>
              <span className="flex items-center gap-1.5">
                <span>❌</span>
                <span>
                  {isEn
                    ? "Payment receipt rejected. Please review your receipt or contact technical support."
                    : "تم رفض إيصال الدفع، يرجى مراجعة إيصالك أو التواصل مع الدعم الفني."}
                </span>
              </span>
              <Link
                href={`/receipt-upload?plan=${encodeURIComponent(activePlan)}`}
                className="bg-white text-red-700 rounded-lg px-3 py-1 text-xs font-bold hover:bg-red-50 transition-colors shrink-0 shadow-sm flex items-center gap-1"
                style={{
                  color: "#B91C1C",
                  background: "white",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                📄 {isEn ? "Review Receipt" : "راجع إيصالك"}
              </Link>
              {renderSupportAction(
                `💬 ${isEn ? "WhatsApp Support" : "الدعم الفني عبر واتساب"}`,
                "bg-green-500 text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-green-600 transition-colors shrink-0 flex items-center gap-1 shadow-sm",
                {
                  background: "#22c55e",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }
              )}
            </>
          ) : isPending ? (
            <>
              <span className="flex items-center gap-1.5">
                <span>⏳</span>
                <span>
                  {isEn
                    ? "App in Read-Only mode. Awaiting admin approval on your subscription."
                    : "التطبيق في وضع القراءة فقط. بانتظار موافقة المسؤول على تأكيد الاشتراك."}
                </span>
              </span>
              <Link
                href={`/receipt-upload?plan=${encodeURIComponent(activePlan)}`}
                className="bg-white text-amber-800 rounded-lg px-3 py-1 text-xs font-bold hover:bg-amber-50 transition-colors shrink-0 shadow-sm flex items-center gap-1"
                style={{
                  color: "#92400E",
                  background: "white",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                📄 {isEn ? "Review Receipt" : "راجع إيصالك"}
              </Link>
              {renderSupportAction(
                `💬 ${isEn ? "Technical Support" : "الدعم الفني"}`,
                "bg-amber-700/80 hover:bg-amber-700 text-white rounded-lg px-3 py-1 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 shadow-sm",
                {
                  background: "#B45309",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span>⚠️</span>
                <span>
                  {isEn
                    ? `Your subscription has expired${expiryFormatted ? ` (${expiryFormatted})` : ""}. You are in read-only mode.`
                    : `انتهى اشتراك الصيدلية${expiryFormatted ? ` (${expiryFormatted})` : ""}، أنت الآن في وضع القراءة فقط.`}
                </span>
              </span>
              {isManager ? (
                <>
                  <Link
                    href="/upgrade-plan"
                    className="bg-white text-red-600 rounded-lg px-3.5 py-1.5 text-xs font-black hover:bg-red-50 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-sm flex items-center gap-1.5"
                    style={{
                      color: "#DC2626",
                      background: "white",
                      borderRadius: "8px",
                      padding: "5px 14px",
                      fontSize: "12px",
                      fontWeight: "800",
                      textDecoration: "none",
                    }}
                  >
                    ⚡ {isEn ? "Renew Subscription" : "تجديد الاشتراك الآن"}
                  </Link>
                  <Link
                    href="/my-subscription"
                    className="bg-red-800/70 hover:bg-red-800 text-white rounded-lg px-3 py-1 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                    style={{
                      borderRadius: "8px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      textDecoration: "none",
                    }}
                  >
                    📋 {isEn ? "My Plan" : "تفاصيل الباقة"}
                  </Link>
                </>
              ) : (
                <span className="text-xs bg-red-700/60 text-white px-2.5 py-1 rounded-md font-bold">
                  {isEn ? "Contact manager to renew" : "يرجى مراجعة إدارة الصيدلية للتجديد"}
                </span>
              )}
              {renderSupportAction(
                `💬 ${isEn ? "Technical Support" : "الدعم الفني"}`,
                "bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg px-3 py-1 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 shadow-sm",
                {
                  background: "#059669",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }
              )}
            </>
          )}
        </div>
      )}

      {mounted && !isReadOnly && isExpiringSoon && !soonBannerDismissed && daysLeft !== null && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 font-bold text-xs sm:text-sm shadow-sm sticky top-0 z-[9980] flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span>
            ⏳{" "}
            {isEn
              ? `Your subscription (${planLabel}) expires in ${daysLeft} day(s)${expiryFormatted ? ` on ${expiryFormatted}` : ""}.`
              : `تنبيه: اشتراكك (${planLabel}) سينتهي خلال ${daysLeft} ${daysLeft <= 10 ? "أيام" : "يوماً"}${expiryFormatted ? ` (${expiryFormatted})` : ""}.`}
          </span>
          {isManager && (
            <Link
              href="/upgrade-plan"
              className="bg-white text-amber-800 rounded-lg px-3 py-1 text-xs font-black hover:bg-amber-50 transition-colors shrink-0 shadow-xs"
            >
              🔄 {isEn ? "Renew Early" : "تجديد الاشتراك مبكراً"}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSoonBannerDismissed(true)}
            className="text-white/80 hover:text-white px-2 py-0.5 text-xs font-bold"
            aria-label={isEn ? "Dismiss" : "إخفاء"}
          >
            ✕
          </button>
        </div>
      )}

      {mounted && isExpired && !isExemptFromReadOnlyBlock && !expiredModalDismissed && (
        <div
          className="fixed inset-0 z-[9998] bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={dismissExpiredModal}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-coral/25 animate-fadeIn"
            dir={isEn ? "ltr" : "rtl"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-coral/10 text-coral flex items-center justify-center mx-auto mb-4 text-3xl">
                ⚠️
              </div>
              <h2 className="text-[22px] font-black text-ink mb-2">
                {isEn ? "Subscription Expired" : "إشعار انتهاء الاشتراك"}
              </h2>
              <p className="text-[14px] text-ink-soft leading-relaxed mb-4">
                {isEn
                  ? `Your pharmacy subscription (${planLabel})${expiryFormatted ? ` expired on ${expiryFormatted}` : " has expired"}. The account is currently in read-only mode.`
                  : `انتهت صلاحية اشتراك الصيدلية (${planLabel})${expiryFormatted ? ` بتاريخ ${expiryFormatted}` : ""}. يعمل الحساب حالياً بوضع القراءة فقط.`}
              </p>

              <div className="bg-bg border border-mint-line rounded-2xl p-3.5 text-start mb-5 space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-ink-soft font-semibold">{isEn ? "Plan:" : "الباقة:"}</span>
                  <span className="font-black text-ink">{planLabel}</span>
                </div>
                {expiryFormatted && (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-soft font-semibold">{isEn ? "Expired On:" : "تاريخ الانتهاء:"}</span>
                    <span className="font-bold text-coral">{expiryFormatted}</span>
                  </div>
                )}
              </div>

              {isManager ? (
                <div className="space-y-2.5">
                  <Link
                    href="/upgrade-plan"
                    onClick={dismissExpiredModal}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-l from-coral to-rose-600 text-white font-black text-[15px] shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>⚡</span>
                    <span>{isEn ? "Renew Subscription Now" : "تجديد الاشتراك الآن"}</span>
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/my-subscription"
                      onClick={dismissExpiredModal}
                      className="py-2.5 px-3 rounded-xl bg-primary-pale text-primary font-bold text-[13px] hover:bg-primary/15 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>📋</span>
                      <span>{isEn ? "My Subscription" : "تفاصيل الباقة"}</span>
                    </Link>
                    {renderSupportAction(
                      `💬 ${isEn ? "Support" : "الدعم الفني"}`,
                      "py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[13px] hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-bold">
                  {isEn
                    ? "Please contact the pharmacy manager/owner to renew the subscription."
                    : "يرجى مراجعة مدير أو مالك الصيدلية لتجديد الاشتراك."}
                </div>
              )}
            </div>

            <div className="border-t border-mint-line bg-bg/60">
              <button
                type="button"
                onClick={dismissExpiredModal}
                className="w-full py-3.5 text-[14px] font-bold text-ink-soft hover:text-ink hover:bg-black/5 transition-colors"
              >
                {isEn ? "Later (Browse in Read-Only Mode)" : "لاحقاً (المتابعة بوضع القراءة فقط)"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={`p-3 sm:p-5 md:p-8 flex-1 w-full max-w-7xl mx-auto transition-all duration-300 ${
          mounted && isReadOnly && !isExemptFromReadOnlyBlock
            ? "pointer-events-none opacity-75 select-none"
            : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
