"use client";

import { useState, useRef, useEffect } from "react";
import { LogoMark, BellIcon } from "./icons";
import Link from "next/link";
import useSWR from "swr";
import { useStore } from "@/store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AppBar({
  title = "روشتة",
  showLogo = true,
  showNotifs = true,
  backHref,
  children,
}: {
  title?: string;
  showLogo?: boolean;
  showNotifs?: boolean;
  backHref?: string;
  children?: React.ReactNode;
}) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifsMenu, setShowNotifsMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);

  const user = useStore((state: any) => state.user);

  const { data } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications`
      : null,
    fetcher,
  );

  const notifications = data?.data || [];

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowQuickMenu(false);
      }
      if (
        notifsRef.current &&
        !notifsRef.current.contains(event.target as Node)
      ) {
        setShowNotifsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between mt-3 mb-5 w-full">
      <div className="flex items-center gap-2 text-primary">
        {showLogo && <LogoMark className="w-[48px] h-[48px] shrink-0" />}
        <span className="font-bold text-[20px]">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Global Search Bar (Fake for now to show shortcut) */}
        <div className="hidden md:flex items-center gap-2 bg-white border border-mint-line rounded-full px-4 py-1.5 shadow-sm text-ink-soft text-[13px] hover:border-primary/40 transition-colors cursor-text">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span className="ml-8 mr-2">بحث شامل...</span>
          <span className="font-mono bg-bg px-2 py-0.5 rounded text-[11px] font-bold">
            Ctrl+K
          </span>
        </div>

        {/* Quick Add Button with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="hidden sm:flex items-center gap-2 bg-primary text-white rounded-full px-4 py-2 text-[14px] font-bold hover:bg-teal transition-colors shadow-md shadow-primary/20"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showQuickMenu ? "rotate-45" : ""}`}
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            إجراء سريع
          </button>

          {showQuickMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-mint-line py-2 z-50 overflow-hidden transform origin-top-left transition-all">
              <div className="px-4 py-2 border-b border-mint-line mb-1">
                <span className="text-[12px] font-bold text-ink-soft">
                  ماذا تريد أن تفعل؟
                </span>
              </div>
              <Link
                href="/pos"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="w-8 h-8 rounded-full bg-teal-pale flex items-center justify-center text-teal">
                  🛒
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-ink">
                    فاتورة مبيعات (POS)
                  </span>
                </div>
              </Link>
              <Link
                href="/add-item"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  💊
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-ink">
                    إضافة دواء جديد
                  </span>
                </div>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg transition-colors"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="w-8 h-8 rounded-full bg-coral-pale flex items-center justify-center text-coral">
                  💸
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold text-ink">
                    تسجيل مصروف مالي
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {children}

        {/* Notifications Dropdown */}
        {showNotifs && (
          <div className="relative" ref={notifsRef}>
            <button
              onClick={() => setShowNotifsMenu(!showNotifsMenu)}
              className="w-[38px] h-[38px] rounded-full bg-white shadow-[0_3px_10px_rgba(15,61,46,0.08)] flex items-center justify-center relative shrink-0 hover:bg-bg transition-colors"
            >
              {notifications.length > 0 && (
                <div className="absolute top-[9px] right-[9px] w-[7px] h-[7px] rounded-full bg-coral border-[1.5px] border-white"></div>
              )}
              <BellIcon className="w-[17px] h-[17px] stroke-primary" />
            </button>

            {showNotifsMenu && (
              <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-mint-line py-2 z-50 overflow-hidden transform origin-top-left transition-all">
                <div className="px-4 py-3 border-b border-mint-line flex justify-between items-center">
                  <span className="text-[14px] font-bold text-primary">
                    الإشعارات الذكية
                  </span>
                  <span className="text-[11px] font-bold bg-coral text-white px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-ink-soft text-[13px] font-bold">
                      لا يوجد إشعارات حالياً
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className="p-4 border-b border-mint-line/50 hover:bg-bg transition-colors cursor-pointer flex gap-3"
                      >
                        <div
                          className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-1 ${
                            n.type === "low_stock"
                              ? "bg-amber/20 text-amber"
                              : n.type === "expiring"
                                ? "bg-coral/20 text-coral"
                                : "bg-primary/20 text-primary"
                          }`}
                        >
                          {n.type === "low_stock"
                            ? "📉"
                            : n.type === "expiring"
                              ? "⏳"
                              : "💰"}
                        </div>
                        <div>
                          <div className="font-bold text-[13px] text-ink">
                            {n.title}
                          </div>
                          <div className="text-[12px] text-ink-soft mt-1 leading-relaxed">
                            {n.message}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
