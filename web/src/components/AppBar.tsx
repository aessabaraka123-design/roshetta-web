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

  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("roshetta_read_notifs");
      if (stored) setReadIds(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const { data: notifsData, mutate: mutateNotifs } = useSWR(
    user && showNotifs
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications`
      : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const notifications = (notifsData?.notifications || []).map((n: any) => ({
    ...n,
    is_read: n.is_read || readIds.includes(n.id),
  }));

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications/mark-read`,
        { method: "PUT" }
      );
    } catch (e) {}
    const allIds = (notifsData?.notifications || []).map((n: any) => n.id);
    const newRead = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newRead);
    try {
      localStorage.setItem("roshetta_read_notifs", JSON.stringify(newRead));
    } catch (e) {}
    mutateNotifs();
  };

  const getNotifDetails = (type: string) => {
    switch (type) {
      case "low_stock":
        return { icon: "📦", border: "border-r-amber-500", bg: "bg-amber-500/10 text-amber-700" };
      case "expiring":
        return { icon: "⏰", border: "border-r-coral", bg: "bg-coral/10 text-coral" };
      case "staff":
        return { icon: "👤", border: "border-r-teal", bg: "bg-teal/10 text-teal" };
      case "credit_sale":
      case "debt":
      case "high_debt":
        return { icon: "💸", border: "border-r-purple-500", bg: "bg-purple-500/10 text-purple-700" };
      case "system_alert":
      case "broadcast":
        return { icon: "📢", border: "border-r-primary", bg: "bg-primary/10 text-primary" };
      default:
        return { icon: "💡", border: "border-r-mint-line", bg: "bg-mint-bg text-ink-soft" };
    }
  };

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
        {showLogo && <LogoMark className="h-[30px] w-auto shrink-0" />}
        <span className="font-bold text-[20px]">{actualTitle}</span>
      </div>
      <div className="flex items-center gap-4">
        {children}

        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => setShowNotifsMenu(!showNotifsMenu)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-ink-soft hover:text-teal hover:shadow-md transition-all relative border border-mint-line/30"
            title={t.appbar.notifications}
          >
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-coral text-white text-[10px] font-black h-[18px] min-w-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white font-mono shadow-sm animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          
          {showNotifsMenu && (
            <div className={`absolute top-12 ${isRtl ? 'left-0' : 'right-0'} w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-mint-line p-4 z-50`}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-mint-line">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink text-[15px]">{t.appbar.notifications}</h3>
                  {unreadCount > 0 && (
                    <span className="bg-coral/10 text-coral text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                      {unreadCount} {language === "en" ? "new" : "جديد"}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-teal font-bold hover:underline transition-colors"
                  >
                    {language === "en" ? "Mark all read" : "تحديد كمقروء"}
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar">
                {notifications.length > 0 ? (
                  notifications.slice(0, 6).map((notif: any) => {
                    const details = getNotifDetails(notif.type);
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl text-sm transition-all border border-mint-line ${
                          notif.is_read
                            ? "bg-bg text-ink-soft opacity-75"
                            : "bg-white shadow-sm font-semibold text-ink border-r-4 " + details.border
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm ${details.bg}`}>
                            {details.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-bold text-[13px] truncate text-ink">{notif.title}</p>
                              {!notif.is_read && (
                                <span className="w-2 h-2 rounded-full bg-coral shrink-0"></span>
                              )}
                            </div>
                            {notif.body && (
                              <p className="text-[12px] text-ink-soft line-clamp-2 mt-0.5 font-normal leading-relaxed">
                                {notif.body}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <span className="text-3xl block mb-1">🔕</span>
                    <p className="text-ink-soft text-sm font-medium">
                      {language === "en" ? "No notifications" : "لا توجد إشعارات حالياً"}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-mint-line mt-3">
                <Link
                  href="/notifs"
                  onClick={() => setShowNotifsMenu(false)}
                  className="block text-center text-teal text-sm font-bold hover:underline"
                >
                  {language === "en" ? "View all notifications" : "عرض كل الإشعارات"}
                </Link>
              </div>
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
