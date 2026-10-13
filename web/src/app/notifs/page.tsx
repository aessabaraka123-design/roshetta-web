"use client";

import AppBar from "@/components/AppBar";
import { useStore } from "@/store";
import useSWR from "swr";
import { useEffect, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Notifications() {
  const language = useStore((state: any) => state.language);
  const user = useStore((state: any) => state.user);
  const [isClient, setIsClient] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem("roshetta_read_notifs");
      if (stored) setReadIds(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const { data: notifsData, mutate } = useSWR(
    user && isClient
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const rawNotifications = notifsData?.notifications || [];
  const notifications = rawNotifications.map((n: any) => ({
    ...n,
    is_read: n.is_read || readIds.includes(n.id),
  }));

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n: any) => !n.is_read)
    : notifications;

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications/mark-read`,
        { method: "PUT" }
      );
    } catch (e) {}
    const allIds = rawNotifications.map((n: any) => n.id);
    const newRead = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(newRead);
    try {
      localStorage.setItem("roshetta_read_notifs", JSON.stringify(newRead));
    } catch (e) {}
    mutate();
  };

  const handleMarkSingleRead = (id: string) => {
    const newRead = Array.from(new Set([...readIds, id]));
    setReadIds(newRead);
    try {
      localStorage.setItem("roshetta_read_notifs", JSON.stringify(newRead));
    } catch (e) {}
    mutate();
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case "expiring":
      case "error":
      case "alert":
      case "coral":
        return "border-r-coral bg-coral-pale/40 text-coral";
      case "low_stock":
      case "warning":
      case "amber":
        return "border-r-amber-500 bg-amber-50 text-amber-700";
      case "staff":
      case "success":
      case "teal":
        return "border-r-teal bg-teal-pale text-teal";
      case "credit_sale":
      case "debt":
      case "high_debt":
        return "border-r-purple-500 bg-purple-50 text-purple-700";
      case "system_alert":
      case "broadcast":
      case "info":
      case "primary":
      default:
        return "border-r-primary bg-primary-pale text-primary";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return "📦";
      case "expiring":
        return "⏰";
      case "staff":
        return "👤";
      case "credit_sale":
      case "debt":
      case "high_debt":
        return "💸";
      case "system_alert":
      case "broadcast":
        return "📢";
      case "error":
      case "alert":
      case "coral":
        return "⏰";
      case "warning":
      case "amber":
        return "📦";
      case "success":
      case "teal":
        return "✅";
      default:
        return "💡";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "low_stock":
        return language === "en" ? "Low Stock" : "نقص في المخزون";
      case "expiring":
        return language === "en" ? "Expiring Soon" : "اقتراب الصلاحية";
      case "staff":
        return language === "en" ? "Staff" : "طاقم العمل";
      case "credit_sale":
      case "debt":
      case "high_debt":
        return language === "en" ? "Credit / Debt" : "ذمم وديون";
      default:
        return language === "en" ? "System Alert" : "تنبيه نظام";
    }
  };

  // Format date nicely
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === "en" ? "en-US" : "ar-EG", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <div className="max-w-3xl pb-24">
      <AppBar title={language === 'en' ? "Notifications" : "الإشعارات"} showLogo={false} />

      {/* Tabs and Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-6 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              filter === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-ink-soft hover:bg-teal-pale/50 border border-mint-line"
            }`}
          >
            {language === "en" ? "All" : "الكل"}{" "}
            <span className="font-mono text-xs opacity-80">({notifications.length})</span>
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 ${
              filter === "unread"
                ? "bg-primary text-white shadow-sm"
                : "bg-white text-ink-soft hover:bg-teal-pale/50 border border-mint-line"
            }`}
          >
            {language === "en" ? "Unread" : "غير المقروءة"}
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-xs font-mono font-bold ${
                filter === "unread" ? "bg-white text-primary" : "bg-coral text-white"
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[13px] font-bold text-primary hover:text-teal hover:underline px-3.5 py-1.5 bg-primary/10 rounded-xl transition-colors"
          >
            {language === "en" ? "Mark all as read" : "تحديد الكل كمقروء"}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex flex-col gap-3 mt-4">
        {!notifsData && (
          <div className="p-8 text-center text-ink-soft animate-pulse">
            {language === "en" ? "Loading notifications..." : "جاري تحميل الإشعارات..."}
          </div>
        )}
        
        {notifsData && filteredNotifications.length === 0 && (
          <div className="p-12 text-center bg-card border border-mint-line rounded-2xl">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-ink-soft font-bold">
              {filter === "unread"
                ? (language === "en" ? "No unread notifications" : "لا توجد إشعارات غير مقروءة")
                : (language === "en" ? "No notifications yet" : "لا توجد إشعارات حالياً")}
            </div>
          </div>
        )}

        {filteredNotifications.map((n: any) => {
          const colors = getColorClasses(n.type);
          const icon = getIcon(n.type);
          const typeLabel = getTypeLabel(n.type);
          
          return (
            <div
              key={n.id}
              onClick={() => !n.is_read && handleMarkSingleRead(n.id)}
              className={`flex gap-4 bg-card border ${
                n.is_read ? 'border-mint-line opacity-85' : 'border-mint-line shadow-sm shadow-primary/5'
              } border-r-4 rounded-[14px] p-4 transition-all cursor-pointer hover:shadow-md ${colors.split(" ")[0]}`}
            >
              <div
                className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-[20px] shadow-xs ${colors.split(" ").slice(1).join(" ")}`}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-[15px] font-bold ${n.is_read ? 'text-ink-soft' : 'text-ink'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-bg text-ink-soft border border-mint-line/50">
                      {typeLabel}
                    </span>
                  </div>
                  {!n.is_read && (
                    <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-coral mt-1.5 shadow-xs animate-pulse"></span>
                  )}
                </div>
                {n.body && (
                  <p className="text-[13px] text-ink-soft mt-1 leading-relaxed">
                    {n.body}
                  </p>
                )}
                <div className="flex items-center justify-between text-[11px] text-[#A6B8AE] mt-2 font-mono">
                  <span>{formatTime(n.created_at)}</span>
                  {!n.is_read && (
                    <span className="text-teal font-bold hover:underline">
                      {language === "en" ? "Click to mark read" : "انقر للتحديد كمقروء"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
