"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/store";
import { API_BASE_URL } from "@/lib/config";

export default function MaintenanceOverlay() {
  const isMaintenanceMode = useStore((state) => state.isMaintenanceMode);
  const setIsMaintenanceMode = useStore((state) => state.setIsMaintenanceMode);
  const language = useStore((state) => state.language);
  const isEn = language === "en";

  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [supportPhone, setSupportPhone] = useState("+970599000000");

  // Fetch support contact details if available
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings?.whatsappNumber) {
          setSupportPhone(d.settings.whatsappNumber);
        } else if (d?.settings?.devWhatsapp) {
          setSupportPhone(d.settings.devWhatsapp);
        }
      })
      .catch(() => {});
  }, []);

  const checkServerStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/status?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.isMaintenance === false) {
          setIsMaintenanceMode(false);
          setChecking(false);
          return;
        }
      }
    } catch (e) {
      // Server down or still in maintenance
    }
    setChecking(false);
    setCountdown(6);
  }, [setIsMaintenanceMode]);

  // Auto-polling countdown while in maintenance mode
  useEffect(() => {
    if (!isMaintenanceMode) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkServerStatus();
          return 6;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMaintenanceMode, checkServerStatus]);

  if (!isMaintenanceMode) return null;

  const whatsappClean = supportPhone.replace(/[^0-9+]/g, "");
  const whatsappUrl = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
    isEn
      ? "Hello, I am inquiring about the scheduled system maintenance."
      : "مرحباً، أستفسر بخصوص موعد انتهاء صيانة النظام."
  )}`;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/95 backdrop-blur-2xl text-white select-none overflow-y-auto"
      style={{ animation: "fadeIn 0.3s ease-out" }}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 sm:w-96 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 sm:w-96 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-700/60 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-3xl p-6 sm:p-10 text-center backdrop-blur-md overflow-hidden">
        {/* Top Glowing Border Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 animate-pulse" />

        {/* Animated Icon Badge */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/5 border border-amber-500/40 flex items-center justify-center shadow-inner">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 animate-[spin_8s_linear_infinite]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-4 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>
            {isEn
              ? "System Under Maintenance & Upgrades"
              : "النظام حالياً في وضع الصيانة والتحديثات"}
          </span>
        </div>

        {/* Heading & Details */}
        <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-3 tracking-tight">
          {isEn ? "We'll Be Right Back!" : "نقوم بتطوير وتحديث الخادم حالياً"}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          {isEn
            ? "Our engineering team is currently performing scheduled system updates to improve performance, security, and add new features. All your data is completely safe."
            : "يقوم الفريق الهندسي حالياً بإجراء تحسينات شاملة لرفع سرعة الخوادم واستقرارها وإضافة ميزات جديدة. جميع بياناتك بأمان وسنعاود العمل تلقائياً فور الانتهاء."}
        </p>

        {/* Real-time Status Box */}
        <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-4 mb-6 text-xs text-slate-400 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-400">
              {isEn ? "Server Status" : "حالة السيرفر"}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {isEn ? "Maintenance Active" : "مغلق للصيانة مؤقتاً"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-400">
              {isEn ? "Auto-Reconnect" : "إعادة المحاولة التلقائية"}
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {isEn ? `in ${countdown}s` : `خلال ${countdown} ثوانٍ`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={checkServerStatus}
            disabled={checking}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isEn ? "Checking Server..." : "جاري فحص السيرفر..."}</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{isEn ? "Check Status Now" : "فحص حالة الاتصال الآن"}</span>
              </>
            )}
          </button>

          {whatsappClean && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-slate-200 hover:text-white font-semibold py-3 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>
                {isEn ? "Contact Support on WhatsApp" : "التواصل مع الدعم الفني عبر واتساب"}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
