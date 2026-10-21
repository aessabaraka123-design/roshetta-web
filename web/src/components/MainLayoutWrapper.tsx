"use client";

import { API_BASE_URL } from "@/lib/config";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store";
import { useEffect } from "react";
import useSWR from "swr";

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: subStatusData } = useSWR(
    user?.pharmacy_id
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/subscription-status`
      : null,
    fetcher,
    { refreshInterval: user?.isReadOnly ? 10000 : 30000 }
  );

  // Sync isReadOnly between server check and client store
  useEffect(() => {
    if (subStatusData && subStatusData.success && user) {
      if (subStatusData.isReadOnly === false && user.isReadOnly) {
        useStore.getState().login({ ...user, isReadOnly: false }, useStore.getState().token || undefined);
      } else if (subStatusData.isReadOnly === true && !user.isReadOnly) {
        useStore.getState().login({ ...user, isReadOnly: true }, useStore.getState().token || undefined);
      }
    }
  }, [subStatusData, user]);

  useEffect(() => {
    // Sync stored session if store was not hydrated yet
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("roshetta_user");
      const storedToken = localStorage.getItem("roshetta_token");
      if (storedUser && !useStore.getState().user) {
        try {
          useStore.getState().login(JSON.parse(storedUser), storedToken || undefined);
        } catch (e) {}
      }
    }

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
      
      if (url && url.includes('/api/') && !url.includes('/api/auth/') && !url.includes('/api/admin/')) {
        init = init || {};
        const headers = new Headers(init.headers);
        const token = useStore.getState().token || (typeof window !== 'undefined' ? localStorage.getItem('roshetta_token') : '');
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        
        if (init.method && ['POST', 'PUT', 'PATCH'].includes(init.method.toUpperCase()) && !(init.body instanceof FormData)) {
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }
        init.headers = headers;
      }
      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    document.documentElement.lang = language || "ar";
  }, [language]);

  const isAuth =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/pricing" ||
    pathname === "/receipt-upload";

  if (isAuth) {
    return (
      <main className="flex-1 w-full min-h-screen flex flex-col">
        {children}
      </main>
    );
  }

  const isReadOnly = Boolean(user?.isReadOnly || subStatusData?.isReadOnly || subStatusData?.isExpired);
  const isRejected = isReadOnly && subStatusData?.status === "rejected";
  const isPending = isReadOnly && subStatusData?.status === "pending";
  const isExpired = isReadOnly && !isRejected && !isPending;

  const isExemptFromReadOnlyBlock =
    pathname === "/upgrade-plan" ||
    pathname === "/pricing" ||
    pathname === "/receipt-upload" ||
    pathname === "/my-subscription";

  const activePlan = subStatusData?.plan_type || user?.subscriptionType || "monthly";

  return (
    <div className="flex-1 w-full min-h-screen flex flex-col relative">
      {isReadOnly && (
        <div
          className="text-white text-center py-2.5 px-4 font-bold text-sm shadow-md sticky top-0 z-[9999] flex items-center justify-center gap-2 sm:gap-3 flex-wrap transition-colors duration-500"
          style={{
            backgroundColor: isRejected ? "#B91C1C" : isPending ? "#D97706" : "#DC2626",
          }}
        >
          {isRejected ? (
            <>
              <span className="flex items-center gap-1.5">
                <span>❌</span>
                <span>
                  {language === "en"
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
                📄 {language === "en" ? "Review Receipt" : "راجع إيصالك"}
              </Link>
              <a
                href={`https://wa.me/${subStatusData?.whatsapp || "972590000000"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-green-600 transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                style={{
                  background: "#22c55e",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                💬 {language === "en" ? "WhatsApp Support" : "الدعم الفني عبر واتساب"}
              </a>
            </>
          ) : isPending ? (
            <>
              <span className="flex items-center gap-1.5">
                <span>⏳</span>
                <span>
                  {language === "en"
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
                📄 {language === "en" ? "Review Receipt" : "راجع إيصالك"}
              </Link>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <span>⚠️</span>
                <span>
                  {language === "en"
                    ? "Your subscription has expired. You are currently in read-only mode."
                    : "انتهى اشتراكك، أنت الآن في وضع القراءة فقط."}
                </span>
              </span>
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
                ⚡ {language === "en" ? "Upgrade & Renew" : "ترقية وتجديد الاشتراك"}
              </Link>
              <a
                href={`https://wa.me/${subStatusData?.whatsapp || "972590000000"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg px-3 py-1 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                style={{
                  background: "#059669",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                💬 {language === "en" ? "Technical Support" : "الدعم الفني"}
              </a>
            </>
          )}
        </div>
      )}
      <main
        className={`p-3 sm:p-5 md:p-8 flex-1 w-full max-w-7xl mx-auto transition-all duration-300 ${
          isReadOnly && !isExemptFromReadOnlyBlock
            ? "pointer-events-none opacity-60 grayscale-[30%] select-none"
            : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
