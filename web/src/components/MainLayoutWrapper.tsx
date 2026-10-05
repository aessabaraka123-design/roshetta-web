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
          className="text-white text-center py-2 px-4 font-bold text-sm shadow-md sticky top-0 z-[9999] flex items-center justify-center gap-3 flex-wrap"
          style={{ backgroundColor: "#EF4444" }}
        >
          <span>
            ⚠️ التطبيق في وضع القراءة فقط، في انتظار موافقة المسؤول على تأكيد
            الاشتراك.
          </span>
          <Link
            href="/receipt-upload"
            className="bg-white text-red-600 rounded-lg px-3 py-1 text-xs font-bold hover:bg-red-50 transition-colors shrink-0"
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
            📄 راجع إيصالك
          </Link>
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
