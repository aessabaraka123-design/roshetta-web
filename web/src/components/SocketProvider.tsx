"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "@/store";
import { mutate } from "swr";
import toast from "react-hot-toast";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const loginFn = useStore((state) => state.login);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user || !user.pharmacy_id) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
      {
        transports: ["websocket"],
        autoConnect: true,
      },
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
      newSocket.emit("join_pharmacy", user.pharmacy_id);
    });

    newSocket.on("sync_update", (data) => {
      console.log("Realtime sync update received:", data);

      mutate(
        (key) => typeof key === "string" && key.includes("/api/pharmacies"),
        undefined,
        { revalidate: true },
      );
    });

    // 🔔 Listen for subscription approval
    newSocket.on("subscription_approved", (data) => {
      console.log("Subscription approved!", data);
      // Update the user in store to remove read-only mode instantly
      if (user) {
        loginFn({
          ...user,
          isReadOnly: false,
          subscriptionType: data.subscriptionType || user.subscriptionType,
        });
      }
      toast.success(
        language === "en" ? "🎉 Subscription activated successfully! You can now use the full system." : "🎉 تم تفعيل اشتراكك بنجاح! يمكنك الآن استخدام النظام بالكامل.",
        { duration: 6000 },
      );
    });

    newSocket.on("new_notification", (data) => {
      console.log("New realtime notification:", data);
      
      // Force SWR to re-fetch notifications immediately
      mutate(
        (key) => typeof key === "string" && key.includes("/notifications"),
        undefined,
        { revalidate: true }
      );
      
      // Play a sound? Maybe just a toast for now
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            style={{ direction: language === "en" ? "ltr" : "rtl" }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5 text-2xl">
                  {data.type === "system_alert" ? "📢" : "💡"}
                </div>
                <div className={`ml-3 flex-1 ${language === "en" ? "ml-3" : "mr-3"}`}>
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
                {language === "en" ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        ),
        { duration: 6000, position: "top-center" }
      );
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return <>{children}</>;
}
