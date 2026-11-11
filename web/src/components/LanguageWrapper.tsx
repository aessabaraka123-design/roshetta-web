"use client";

import { rehydrateClientStore, useStore } from "@/store";
import { useEffect, useState } from "react";
import { installToastLocalization } from "@/lib/errorTranslations";

export default function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const language = useStore((state: any) => state.language);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    installToastLocalization();
    rehydrateClientStore();
    setMounted(true);
  }, []);

  const activeLang = mounted ? (language || "ar") : "ar";

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dir = activeLang === "en" ? "ltr" : "rtl";
    document.documentElement.lang = activeLang;
  }, [mounted, activeLang]);

  return (
    <div
      dir={activeLang === "en" ? "ltr" : "rtl"}
      className="w-full min-h-screen flex text-start"
      style={mounted ? undefined : { visibility: "hidden" }}
    >
      {children}
    </div>
  );
}
