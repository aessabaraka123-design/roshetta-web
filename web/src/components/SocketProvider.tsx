"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "@/store";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { SOCKET_BASE_URL, API_BASE_URL } from "@/lib/config";
import MaintenanceOverlay from "./MaintenanceOverlay";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const loginFn = useStore((state) => state.login);
  const setIsMaintenanceMode = useStore((state: any) => state.setIsMaintenanceMode);

  const langRef = useRef(language);
  langRef.current = language;

  const userRef = useRef(user);
  userRef.current = user;

  const loginFnRef = useRef(loginFn);
  loginFnRef.current = loginFn;

  useEffect(() => {
    // Initial maintenance status check on load
    fetch(`${API_BASE_URL}/api/status?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.isMaintenance === "boolean") {
          setIsMaintenanceMode(d.isMaintenance);
        }
      })
      .catch(() => {});

    const newSocket = io(
      SOCKET_BASE_URL,
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    newSocket.on("connect", () => {
      if (user?.pharmacy_id) {
        newSocket.emit("join_pharmacy", user.pharmacy_id);
      }
    });

    newSocket.on("sync_update", (data: any) => {
      const type = data?.type;
      if (type === "shifts") {
        mutate(
          (key) =>
            typeof key === "string" &&
            (key.includes("/shifts") || key.includes("/api/pharmacies")),
          undefined,
          { revalidate: true }
        );
      } else if (type === "plans") {
        mutate((key) => typeof key === "string" && (key.includes("/plans") || key.includes("/subscription-plans")), undefined, { revalidate: true });
      } else if (type === "settings") {
        mutate((key) => typeof key === "string" && key.includes("/settings"), undefined, { revalidate: true });
      } else if (type === "tickets") {
        mutate((key) => typeof key === "string" && key.includes("/tickets"), undefined, { revalidate: true });
      } else if (type === "staff") {
        mutate((key) => typeof key === "string" && key.includes("/staff"), undefined, { revalidate: true });
      } else if (type === "branches") {
        mutate((key) => typeof key === "string" && key.includes("/branches"), undefined, { revalidate: true });
      } else if (type === "sales") {
        mutate((key) => typeof key === "string" && key.includes("/sales"), undefined, { revalidate: true });
      } else {
        mutate(
          (key) => typeof key === "string" && key.includes("/api/pharmacies"),
          undefined,
          { revalidate: true },
        );
      }
    });

    // 🔔 Listen for subscription plans & prices updates
    newSocket.on("plans_updated", () => {
      mutate((key) => typeof key === "string" && (key.includes("/plans") || key.includes("/subscription-plans")), undefined, { revalidate: true });
    });

    // 🔔 Listen for platform settings & payment methods updates
    newSocket.on("settings_updated", () => {
      mutate((key) => typeof key === "string" && key.includes("/settings"), undefined, { revalidate: true });
    });

    // 🔔 Listen for maintenance mode toggle
    newSocket.on("maintenance_mode", (data: any) => {
      const isMaint = !!data?.isMaintenance;
      setIsMaintenanceMode(isMaint);
      if (isMaint) {
        toast.error(
          langRef.current === "en" ? "⚠️ System is undergoing scheduled maintenance." : "⚠️ النظام حالياً في وضع الصيانة والتحديثات.",
          { duration: 5000 }
        );
      }
    });

    // 🔔 Listen for Global Announcements & Broadcasts
    newSocket.on("new_broadcast", (data: any) => {
      if (data) {
        toast.custom(
          (t) => (
            <div className="max-w-md w-full bg-slate-900 text-white shadow-2xl rounded-2xl p-4 flex items-start gap-3 border border-indigo-500/40">
              <span className="text-2xl pt-0.5">📢</span>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-indigo-300">{data.title || "تنبيه عام من الإدارة"}</h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{data.message}</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1">✕</button>
            </div>
          ),
          { duration: 10000, position: "top-center" }
        );
      }
    });

    // 🔔 Listen for ticket updates & support replies
    newSocket.on("ticket_updated", () => {
      mutate((key) => typeof key === "string" && key.includes("/tickets"), undefined, { revalidate: true });
      toast.success(
        langRef.current === "en" ? "Support ticket updated" : "تم تحديث تذكرة الدعم الفني",
        { duration: 4000 }
      );
    });

    // 🔔 Listen for deleted sales
    newSocket.on("sale_deleted", () => {
      mutate((key) => typeof key === "string" && key.includes("/sales"), undefined, { revalidate: true });
    });

    // 🔔 Listen for instant pharmacy updates from Superadmin (Live Sync)
    newSocket.on("pharmacy_updated", (data: any) => {
      const currentUser = userRef.current;
      if (currentUser && data) {
        const updatedUser = {
          ...currentUser,
          ...(data.pharmacyName ? { pharmacyName: data.pharmacyName } : {}),
          ...(data.managerName ? { managerName: data.managerName } : {}),
          ...(data.subscriptionType ? { subscriptionType: data.subscriptionType } : {}),
          ...(data.subscriptionExpiry ? { subscriptionExpiry: data.subscriptionExpiry } : {}),
          ...(typeof data.isReadOnly === "boolean" ? { isReadOnly: data.isReadOnly } : {}),
          ...(typeof data.isActive === "boolean" ? { isActive: data.isActive } : {}),
        };
        loginFnRef.current(updatedUser, useStore.getState().token || undefined);
        try {
          localStorage.setItem("roshetta_user", JSON.stringify(updatedUser));
        } catch (e) {}
      }

      // Revalidate all SWR queries
      mutate(
        (key) => typeof key === "string" && key.includes("/api/pharmacies"),
        undefined,
        { revalidate: true }
      );

      if (data?.pharmacyName && data.pharmacyName !== userRef.current?.pharmacyName) {
        toast.success(
          langRef.current === "en" ? `Pharmacy name updated: ${data.pharmacyName}` : `تم تحديث بيانات الصيدلية: ${data.pharmacyName}`,
          { duration: 4000 }
        );
      }
    });

    // 🔔 Listen for account active/freeze status changes
    newSocket.on("account_status_changed", (data: any) => {
      if (data && typeof data.isActive === "boolean") {
        const currentUser = userRef.current;
        if (currentUser) {
          loginFnRef.current({ ...currentUser, isActive: data.isActive }, useStore.getState().token || undefined);
        }
        if (!data.isActive) {
          toast.error(
            langRef.current === "en"
              ? "⚠️ Your pharmacy account has been suspended by administration."
              : "⚠️ تم إيقاف/تجميد حساب الصيدلية من قبل الإدارة.",
            { duration: 8000 }
          );
        } else {
          toast.success(
            langRef.current === "en"
              ? "✅ Your pharmacy account has been reactivated."
              : "✅ تم إعادة تنشيط حساب الصيدلية بنجاح.",
            { duration: 6000 }
          );
        }
      }
    });

    // 🔔 Listen for subscription approval
    newSocket.on("subscription_approved", (data) => {
      // Update the user in store to remove read-only mode instantly
      const currentUser = userRef.current;
      if (currentUser) {
        loginFnRef.current({
          ...currentUser,
          isReadOnly: false,
          subscriptionType: data.subscriptionType || currentUser.subscriptionType,
        });
      }
      toast.success(
        langRef.current === "en" ? "🎉 Subscription activated successfully! You can now use the full system." : "🎉 تم تفعيل اشتراكك بنجاح! يمكنك الآن استخدام النظام بالكامل.",
        { duration: 6000 },
      );
    });

    newSocket.on("new_notification", (data) => {
      // Force SWR to re-fetch notifications immediately
      mutate(
        (key) => typeof key === "string" && key.includes("/notifications"),
        undefined,
        { revalidate: true }
      );
      
      const currentLang = langRef.current;
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            style={{ direction: currentLang === "en" ? "ltr" : "rtl" }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5 text-2xl">
                  {data.type === "low_stock"
                    ? "📦"
                    : data.type === "expiring"
                    ? "⏰"
                    : data.type === "staff"
                    ? "👤"
                    : data.type === "debt_payment"
                    ? "💰"
                    : data.type === "credit_sale" || data.type === "debt"
                    ? "💸"
                    : data.type === "system_alert"
                    ? "📢"
                    : "💡"}
                </div>
                <div className={`ml-3 flex-1 ${currentLang === "en" ? "ml-3" : "mr-3"}`}>
                  <p className="text-sm font-bold text-ink">
                    {data.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {data.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-mint-line">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-teal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currentLang === "en" ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        ),
        { duration: 6000, position: "top-center" }
      );
    });

    newSocket.on("disconnect", () => {
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.pharmacy_id, setIsMaintenanceMode]);

  return (
    <>
      <MaintenanceOverlay />
      {children}
    </>
  );
}
