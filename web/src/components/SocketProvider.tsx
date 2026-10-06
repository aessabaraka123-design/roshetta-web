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

    newSocket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return <>{children}</>;
}
