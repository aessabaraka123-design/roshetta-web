"use client";
import { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";

export default function More() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const { t } = useTranslation();
  const language = useStore((state: any) => state.language);
  const setLanguage = useStore((state: any) => state.setLanguage);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const currentUser = useStore.getState().user;
    if (!currentUser) {
      router.push("/login");
    } else if (currentUser.role !== "manager") {
      router.push("/");
    }
  }, [router]);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!mounted) return null;

  const settings = [
    {
      label: "الاشتراك والباقة",
      icon: (
        <>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </>
      ),
      isUpgrade: true,
    },
    {
      label: "الفروع والموظفين",
      icon: <path d="M3 21h18 M5 21V7l8-4 8 4v14 M10 21v-6h4v6" />,
    },
    {
      label: "تخصيص الفاتورة والطباعة",
      icon: (
        <>
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v8H6z" />
        </>
      ),
    },
    {
      label: "التقارير والتحليلات",
      icon: (
        <>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </>
      ),
    },
    {
      label: "الإشعارات",
      icon: (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
      ),
    },
    {
      label: "الصلاحيات والأمان",
      icon: (
        <>
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ),
    },
    {
      label: "الدعم الفني",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
          <path d="M12 17h.01" />
        </>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mt-5 mb-3">
        <h2 className="text-[20px] font-bold text-primary">الإعدادات</h2>
      </div>

      <div className="flex items-center gap-3 bg-card border border-mint-line rounded-[16px] p-4 mb-5 shadow-sm">
        <div className="bg-primary-pale text-primary w-[50px] h-[50px] rounded-full flex items-center justify-center font-bold text-[18px] shrink-0">
          👤
        </div>
        <div>
          <div className="text-[18px] font-bold text-ink">
            {user?.managerName || "مدير النظام"}
          </div>
          <div className="text-[14px] text-ink-soft mt-0.5">
            {user?.pharmacyName || "الصيدلية"}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {settings.map((item, i) => {
          let route = "/more";
          if (item.label === "الاشتراك والباقة") route = "/my-subscription";
          if (item.label === "الفروع والموظفين") route = "/branches";
          if (item.label === "تخصيص الفاتورة والطباعة")
            route = "/print-settings";
          if (item.label === "التقارير والتحليلات") route = "/reports";
          if (item.label === "الإشعارات") route = "/notifs";
          if (item.label === "الصلاحيات والأمان") route = "/security";
          if (item.label === "الدعم الفني") route = "/owner-support";

          return (
            <div
              key={i}
              onClick={() => router.push(route)}
              className={`flex items-center gap-3 rounded-[14px] px-3.5 py-3 cursor-pointer shadow-sm transition-all ${
                item.isUpgrade
                  ? "bg-gradient-to-r from-amber-pale to-amber/10 border-2 border-amber shadow-[0_4px_15px_rgba(251,191,36,0.2)] hover:scale-[1.01]"
                  : "bg-card border border-mint-line hover:bg-bg"
              }`}
            >
              <div
                className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 ${
                  item.isUpgrade
                    ? "bg-amber text-white shadow-md shadow-amber/40"
                    : "bg-bg text-primary"
                }`}
              >
                <svg
                  className={`w-[18px] h-[18px] ${!item.isUpgrade && "stroke-primary"}`}
                  fill={item.isUpgrade ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  {item.icon}
                </svg>
              </div>
              <div
                className={`text-[15px] font-bold ${item.isUpgrade ? "text-amber-dark" : "text-ink"}`}
              >
                {item.label}
                {item.isUpgrade && (
                  <span className="ml-2 text-[10px] bg-amber text-white px-2 py-0.5 rounded-full inline-block animate-pulse">
                    جديد
                  </span>
                )}
              </div>
              <div
                className={`mr-auto ${item.isUpgrade ? "text-amber" : "text-ink-soft"}`}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </div>
            </div>
          );
        })}

        {/* Language Switcher Section */}
        <div className="flex items-center gap-3 bg-card border border-mint-line rounded-[14px] px-3.5 py-3 shadow-sm mt-1 mb-2">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-bg flex items-center justify-center shrink-0">
            <svg className="w-[18px] h-[18px] stroke-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="flex-1 text-[15px] font-bold text-ink">
            {t.sidebar.language}
          </div>
          <div className="flex bg-bg rounded-lg p-1">
            <button
              onClick={() => setLanguage("ar")}
              className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${language !== "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft"}`}
            >
              {t.sidebar.arabic}
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1 text-sm font-bold rounded-md transition-colors ${language === "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft"}`}
            >
              {t.sidebar.english}
            </button>
          </div>
        </div>

        <div
          onClick={() => {
            router.push("/login");
          }}
          className="flex items-center gap-3 bg-card border border-mint-line rounded-[14px] px-3.5 py-3 cursor-pointer shadow-sm mt-1"
        >
          <div className="w-[34px] h-[34px] rounded-[10px] bg-coral-pale flex items-center justify-center shrink-0">
            <svg
              className="w-[18px] h-[18px] stroke-coral"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <div className="text-[15px] font-bold text-coral">تسجيل الخروج</div>
        </div>
      </div>
    </>
  );
}
