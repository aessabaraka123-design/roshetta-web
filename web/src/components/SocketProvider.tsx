"use client";

import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useStore } from "@/store";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { SOCKET_BASE_URL } from "@/lib/config";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const loginFn = useStore((state) => state.login);

  const langRef = useRef(language);
  langRef.current = language;

  const userRef = useRef(user);
  userRef.current = user;

  const loginFnRef = useRef(loginFn);
  loginFnRef.current = loginFn;

  useEffect(() => {
    if (!user?.pharmacy_id) return;

    const newSocket = io(
      SOCKET_BASE_URL,
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    newSocket.on("connect", () => {
      newSocket.emit("join_pharmacy", user.pharmacy_id);
    });

    newSocket.on("sync_update", (data) => {
      if (data?.type === "shifts") {
        mutate(
          (key) =>
            typeof key === "string" &&
            (key.includes("/shifts") || key.includes("/api/pharmacies")),
          undefined,
          { revalidate: true }
        );
      } else {
        mutate(
          (key) => typeof key === "string" && key.includes("/api/pharmacies"),
          undefined,
          { revalidate: true },
        );
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
  }, [user?.pharmacy_id]);

  return <>{children}</>;
}
