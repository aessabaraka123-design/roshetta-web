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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: notifsData, mutate } = useSWR(
    user && isClient
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications`
      : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications = notifsData?.notifications || [];

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/notifications/mark-read`,
        { method: "PUT" }
      );
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case "error":
      case "alert":
      case "coral":
        return "border-r-coral bg-coral-pale text-coral";
      case "warning":
      case "amber":
        return "border-r-amber bg-amber-pale text-amber-600";
      case "success":
      case "teal":
        return "border-r-teal bg-teal-pale text-teal";
      case "info":
      case "primary":
      default:
        return "border-r-primary bg-primary-pale text-primary";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
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
      case "info":
      case "primary":
      default:
        return "💡";
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

      <div className="flex justify-between items-center mt-6 px-1">
        <h2 className="font-bold text-ink text-[18px]">
          {language === "en" ? "Recent Notifications" : "أحدث الإشعارات"}
        </h2>
        {notifications.some((n: any) => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-[13px] font-bold text-primary hover:underline px-3 py-1 bg-primary/10 rounded-lg"
          >
            {language === "en" ? "Mark all as read" : "تحديد الكل كمقروء"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-4">
        {!notifsData && (
          <div className="p-8 text-center text-ink-soft animate-pulse">
            {language === "en" ? "Loading notifications..." : "جاري تحميل الإشعارات..."}
          </div>
        )}
        
        {notifsData && notifications.length === 0 && (
          <div className="p-12 text-center bg-card border border-mint-line rounded-2xl">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-ink-soft font-bold">
              {language === "en" ? "No new notifications" : "لا توجد إشعارات جديدة"}
            </div>
          </div>
        )}

        {notifications.map((n: any) => {
          const colors = getColorClasses(n.type);
          const icon = getIcon(n.type);
          
          return (
            <div
              key={n.id}
              className={`flex gap-4 bg-card border ${n.is_read ? 'border-mint-line' : 'border-mint-line shadow-md shadow-primary/5'} border-r-4 rounded-[12px] p-4 transition-all ${colors.split(" ")[0]}`}
            >
              <div
                className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[18px] ${colors.split(" ").slice(1).join(" ")}`}
              >
                {icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h4 className={`text-[16px] font-bold ${n.is_read ? 'text-ink-soft' : 'text-ink'}`}>{n.title}</h4>
                  {!n.is_read && (
                    <span className="w-2 h-2 shrink-0 rounded-full bg-coral mt-1.5"></span>
                  )}
                </div>
                {n.body && (
                  <p className="text-[14px] text-ink-soft mt-1 leading-relaxed">
                    {n.body}
                  </p>
                )}
                <div className="text-[12px] text-[#A6B8AE] mt-2 font-mono">
                  {formatTime(n.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
