"use client";

import { useState, useRef, useEffect } from "react";
import { LogoMark, BellIcon } from "./icons";
import Link from "next/link";
import useSWR from "swr";
import { useStore } from "@/store";
import { useTranslation } from "@/i18n";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AppBar({
  title,
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
  const { t, language } = useTranslation();

  const isRtl = language !== "en";
  const actualTitle = title || t.appbar.title;

  const { data: notifsData } = useSWR(
    user && showNotifs
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifs`
      : null,
    fetcher,
    { refreshInterval: 60000 },
  );

  const unreadCount =
    notifsData?.notifs?.filter((n: any) => !n.isRead).length || 0;

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
        {showLogo && <LogoMark className="w-[30px] h-[30px] shrink-0" />}
        <span className="font-bold text-[20px]">{actualTitle}</span>
      </div>
      <div className="flex items-center gap-4">
        {children}

        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => setShowNotifsMenu(!showNotifsMenu)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-ink-soft hover:text-teal hover:shadow-md transition-all relative"
            title={t.appbar.notifications}
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
          
          {showNotifsMenu && (
            <div className={`absolute top-12 ${isRtl ? 'left-0' : 'right-0'} w-80 bg-white rounded-2xl shadow-xl border border-mint-line p-4 z-50`}>
              <h3 className="font-bold text-ink mb-3">{t.appbar.notifications}</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                {notifsData?.notifs?.length > 0 ? (
                  notifsData.notifs.slice(0, 5).map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-xl text-sm ${notif.isRead ? "bg-bg text-ink-soft" : "bg-teal-pale text-teal font-semibold"}`}
                    >
                      {notif.message}
                    </div>
                  ))
                ) : (
                  <p className="text-ink-soft text-sm text-center py-4">
                    {language === "en" ? "No notifications" : "لا توجد إشعارات حالياً"}
                  </p>
                )}
              </div>
              <Link
                href="/notifs"
                onClick={() => setShowNotifsMenu(false)}
                className="block text-center text-teal text-sm font-bold mt-3 hover:underline"
              >
                {language === "en" ? "View all notifications" : "عرض كل الإشعارات"}
              </Link>
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-bold text-[14px] hover:bg-teal transition-all shadow-md hover:shadow-lg"
          >
            {t.appbar.quick_action}
            <span className="text-lg leading-none">+</span>
          </button>

          {showQuickMenu && (
            <div className={`absolute top-14 ${isRtl ? 'left-0' : 'right-0'} w-48 bg-white rounded-2xl shadow-xl border border-mint-line p-2 z-50`}>
              <Link
                href="/pos"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-ink hover:bg-teal-pale hover:text-teal rounded-xl transition-colors font-semibold"
              >
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                  💰
                </div>
                {t.appbar.quick_sale}
              </Link>
              <Link
                href="/add-item"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-ink hover:bg-teal-pale hover:text-teal rounded-xl transition-colors font-semibold"
              >
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                  💊
                </div>
                {t.appbar.add_item}
              </Link>
              <Link
                href="/customers"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-ink hover:bg-teal-pale hover:text-teal rounded-xl transition-colors font-semibold"
              >
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                  👤
                </div>
                {t.appbar.add_customer}
              </Link>
              <Link
                href="/suppliers"
                onClick={() => setShowQuickMenu(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-ink hover:bg-teal-pale hover:text-teal rounded-xl transition-colors font-semibold"
              >
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                  🏢
                </div>
                {t.appbar.add_supplier}
              </Link>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2.5 rounded-full shadow-sm border border-mint-line/50 w-64 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal-pale transition-all">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-soft"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder={t.appbar.search_placeholder}
            className="bg-transparent border-none outline-none text-[14px] w-full text-ink placeholder:text-ink-soft/70 font-medium"
          />
          <div className="flex gap-1 text-[10px] font-bold text-ink-soft/50 font-mono tracking-tighter">
            <kbd className="bg-bg px-1.5 py-0.5 rounded border border-mint-line/50">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
