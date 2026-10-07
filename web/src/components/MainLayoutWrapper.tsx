"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store";
import { useEffect } from "react";

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);

  
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
      
      if (url && url.includes('/api/') && !url.includes('/api/auth/') && !url.includes('/api/admin/')) {
        init = init || {};
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${useStore.getState().token}`);
        
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

  const plan = user?.subscriptionType || "monthly";

  return (
    <div className="flex-1 w-full min-h-screen flex flex-col relative">
      {user?.isReadOnly && (
        <div
          className="text-white text-center py-2 px-4 font-bold text-sm shadow-md sticky top-0 z-[9999] flex items-center justify-center gap-3 flex-wrap transition-colors duration-500"
          style={{ backgroundColor: isRejected ? "#B91C1C" : "#EF4444" }}
        >
          {isRejected ? (
            <>
              <span>{language === "en" ? "Receipt rejected. Please review with technical support." : "تم رفض إيصال الدفع، يرجى مراجعة الدعم الفني."}</span>
              <a
                href="https://wa.me/972590000000" 
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
          ) : (
            <>
              <span>{language === "en" ? "App in Read-Only mode. Awaiting admin approval. Please check your receipt." : "التطبيق في وضع القراءة فقط. بانتظار موافقة المسؤول على تأكيد الاشتراك. راجع إيصالك."}</span>
              <Link
                href="/receipt-upload"
                className="bg-white text-red-600 rounded-lg px-3 py-1 text-xs font-bold hover:bg-red-50 transition-colors shrink-0 shadow-sm"
                style={{
                  color: "#EF4444",
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
          )}
        </div>
      )}
      <main
        className={`p-8 flex-1 w-full max-w-7xl mx-auto transition-all duration-300 ${user?.isReadOnly ? "pointer-events-none opacity-60 grayscale-[30%] select-none" : ""}`}
      >
        {children}
      </main>
    </div>
  );
}
