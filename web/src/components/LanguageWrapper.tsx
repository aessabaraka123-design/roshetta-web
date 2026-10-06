"use client";

import { useStore } from "@/store";
import { useEffect, useState } from "react";

export default function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const language = useStore((state: any) => state.language);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    document.documentElement.lang = language || "ar";
  }, [language]);

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <div dir={language === "en" ? "ltr" : "rtl"} className="w-full min-h-screen flex text-start">
      {children}
    </div>
  );
}
