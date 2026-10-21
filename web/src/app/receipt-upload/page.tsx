"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import RoshettaLogo from "@/components/RoshettaLogo";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ReceiptUpload() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);

  const [payMethod, setPayMethod] = useState<"bank" | "palpay" | "jawwal">(
    "bank",
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [transferName, setTransferName] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [plan, setPlan] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan");
      if (p) return p;
    }
    return user?.subscriptionType && user.subscriptionType !== "free"
      ? user.subscriptionType
      : "monthly";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan");
      if (p) setPlan(p);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      const hasStored =
        typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
      return;
    }

    if (user?.pharmacy_id) {
      fetch(
        API_BASE_URL +
          `/api/pharmacies/${user.pharmacy_id}/subscription-status`,
      )
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.plan_type) {
            const urlPlan = new URLSearchParams(window.location.search).get(
              "plan",
            );
            if (!urlPlan) {
              setPlan(d.plan_type);
            }
          }
        })
        .catch(() => {});
    }

    fetch(API_BASE_URL + "/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAdminSettings(d.settings);
      })
      .catch(() => {});

    fetch(API_BASE_URL + "/api/subscription-plans")
      .then((r) => r.json())
      .then((data) => {
        const rawPlans = data.plans || (Array.isArray(data) ? data : []);
        const formattedPlans = rawPlans.map((p: any) => {
          let parsedFeatures: string[] = [];
          if (Array.isArray(p.features)) {
            parsedFeatures = p.features;
          } else if (typeof p.features === "string") {
            try {
              parsedFeatures = JSON.parse(p.features);
            } catch {
              parsedFeatures = [p.features];
            }
          }
          return {
            ...p,
            id: String(p.id || p.type),
            name: p.name,
            price: p.price ?? 0,
            oldPrice: p.oldPrice ?? null,
            features: parsedFeatures,
          };
        });
        setPlans(formattedPlans);

        const urlPlan = new URLSearchParams(window.location.search).get("plan");
        if (urlPlan) {
          setPlan(urlPlan);
        } else if (user?.subscriptionType && user.subscriptionType !== "free") {
          setPlan(user.subscriptionType);
        } else {
          const firstPaid = formattedPlans.find((p: any) => (p.price ?? 0) > 0);
          if (firstPaid) {
            setPlan(firstPaid.id);
          }
        }
      })
      .catch((err) => console.error("Error fetching plans", err));
  }, [user, router]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(
        language === "en"
          ? `Copied ${label} to clipboard!`
          : `تم نسخ ${label} إلى الحافظة!`,
        { icon: "📋" },
      );
    }
  };

  const selectedPlan = plans.find(
    (p) => p.id === plan || p.type === plan || p.name === plan,
  ) || {
    id: plan,
    name:
      plan === "annual"
        ? language === "en"
          ? "Annual Plan"
          : "الاشتراك السنوي"
        : plan === "lifetime"
          ? language === "en"
            ? "Lifetime License"
            : "الرخصة الدائمة"
          : language === "en"
            ? "Monthly Plan"
            : "الاشتراك الشهري",
    price: plan === "annual" ? 499 : plan === "lifetime" ? 1499 : 49,
    oldPrice: plan === "annual" ? 600 : plan === "lifetime" ? 2000 : 60,
    features: [
      language === "en" ? "Full access to inventory, POS & sales" : "إدارة شاملة للمخزون والمبيعات ونقطة البيع",
      language === "en" ? "FIFO batch & expiry tracking" : "نظام الدفعات (FIFO) وتتبع تواريخ الصلاحية بدقة",
      language === "en" ? "Multi-branch & staff permissions" : "دعم فروع متعددة وصلاحيات موظفين متقدمة",
      language === "en" ? "24/7 dedicated support & free updates" : "دعم فني متواصل 24/7 وتحديثات دورية مجانية",
    ],
  };

  const getCycleText = (pId: string) => {
    if (pId === "annual" || pId.includes("سنو")) {
      return language === "en" ? "Yearly" : "سنوياً";
    }
    if (pId === "lifetime" || pId.includes("حياة") || pId.includes("دائم")) {
      return language === "en" ? "Paid Once" : "تدفع لمرة واحدة";
    }
    return language === "en" ? "Monthly" : "شهرياً";
  };

  const handleSubmit = async () => {
    if (!receiptImage) {
      toast.error(
        language === "en"
          ? "Please upload the payment receipt image first"
          : "الرجاء رفع صورة إيصال الدفع أولاً",
      );
      return;
    }
    if (!transferName.trim() && !transferRef.trim()) {
      toast.error(
        language === "en"
          ? "Please enter either transferer name or transaction reference number"
          : "يرجى إدخال اسم المحوّل أو رقم المرجع على الأقل لتسريع الاعتماد",
      );
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user!.pharmacy_id}/subscription-request`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptImage,
            paymentMethod: payMethod,
            transferName,
            transferRef,
            plan,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(
          language === "en"
            ? "✅ Receipt submitted successfully! It will be reviewed by admin shortly."
            : "✅ تم إرسال الإيصال بنجاح! سيتم مراجعته وتفعيل الحساب من قبل المسؤول فوراً.",
        );
        router.push("/");
      } else {
        toast.error(
          data.error ||
            (language === "en" ? "Something went wrong" : "حدث خطأ ما"),
        );
      }
    } catch {
      toast.error(
        language === "en"
          ? "Failed to connect to the server"
          : "فشل الاتصال بالخادم",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir={language === "en" ? "ltr" : "rtl"}
      className="min-h-screen bg-[#F4F8FA] text-ink py-6 sm:py-10 px-3 sm:px-6 relative overflow-x-hidden font-sans"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal/5 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Top Navbar */}
        <header className="flex items-center justify-between mb-6 sm:mb-8 bg-white/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-mint-line shadow-sm">
          <RoshettaLogo showText={true} />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-primary transition-colors bg-bg hover:bg-mint-bg px-3.5 py-1.5 rounded-xl border border-mint-line"
          >
            <svg
              className={`w-4 h-4 ${language === "en" ? "" : "rotate-180"}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>{language === "en" ? "Back to Dashboard" : "العودة للرئيسية"}</span>
          </Link>
        </header>

        {/* Page Title & Intro */}
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal bg-teal-pale px-3.5 py-1 rounded-full mb-2.5 shadow-sm">
            🛡️ {language === "en" ? "Secure Checkout & Verification" : "إتمام الاشتراك والدفع الآمن"}
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-primary tracking-tight">
            {language === "en" ? "Confirm Payment & Upload Receipt" : "تأكيد الدفع ورفع إيصال الاشتراك"}
          </h1>
          <p className="text-sm sm:text-base text-ink-soft max-w-xl mx-auto mt-2 leading-relaxed font-medium">
            {language === "en"
              ? "Review your plan details, choose your preferred payment gateway, and submit your transfer proof for instant admin confirmation."
              : "راجع تفاصيل باقتك المختارة، ثم حول المبلغ عبر وسيلتك المفضلة وارفع الإيصال ليتم اعتماد اشتراكك وتفعيل الصيدلية فوراً."}
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* ========================================================= */}
          {/* SIDE A: Plan Summary & Transfer Account Info (5 Cols)      */}
          {/* ========================================================= */}
          <aside className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            {/* Selected Plan Summary Card */}
            <div className="bg-gradient-to-br from-[#1E3A5F] via-[#1B3654] to-[#112338] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/10 border border-slate-700/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-44 h-44 bg-teal/10 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[11px] font-black tracking-wider uppercase bg-teal/20 text-teal-light px-3 py-1 rounded-full border border-teal/30">
                  ⭐ {language === "en" ? "Selected Plan" : "الباقة المختارة"}
                </span>

                {/* Plan switcher button */}
                <Link
                  href="/upgrade-plan"
                  className="text-xs font-bold text-white/80 hover:text-white underline underline-offset-4 transition-colors"
                >
                  {language === "en" ? "Change Plan" : "تغيير الباقة"}
                </Link>
              </div>

              {/* Plan Title & Price */}
              <div className="relative z-10 mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
                  {selectedPlan.name}
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                    ₪{selectedPlan.price}
                  </span>
                  <span className="text-xs text-white/70 font-bold">
                    / {getCycleText(selectedPlan.id)}
                  </span>
                  {selectedPlan.oldPrice && (
                    <span className="text-sm font-mono text-white/40 line-through mr-2">
                      ₪{selectedPlan.oldPrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="border-t border-white/10 pt-4 space-y-2.5 relative z-10 text-xs sm:text-sm text-white/90">
                {(selectedPlan.features && selectedPlan.features.length > 0
                  ? selectedPlan.features
                  : [
                      language === "en"
                        ? "Full access to inventory, POS & sales"
                        : "إدارة شاملة للمخزون والمبيعات ونقطة البيع",
                      language === "en"
                        ? "FIFO batch & expiry tracking"
                        : "نظام الدفعات (FIFO) وتتبع تواريخ الصلاحية بدقة",
                      language === "en"
                        ? "Multi-branch & staff permissions"
                        : "دعم فروع متعددة وصلاحيات موظفين متقدمة",
                      language === "en"
                        ? "24/7 dedicated support & free updates"
                        : "دعم فني متواصل 24/7 وتحديثات دورية مجانية",
                    ]
                ).map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="text-emerald-400 shrink-0 mt-0.5">✔</span>
                    <span className="leading-relaxed font-medium">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Banking / Wallet Details Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-mint-line shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-mint-line">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {payMethod === "bank"
                      ? "🏦"
                      : payMethod === "palpay"
                        ? "💳"
                        : "📱"}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-primary">
                    {language === "en"
                      ? "Transfer Account Details"
                      : "معلومات حساب التحويل المباشر"}
                  </h3>
                </div>
                <span className="text-xs font-bold text-teal bg-teal-pale px-2.5 py-0.5 rounded-full">
                  {payMethod === "bank"
                    ? language === "en"
                      ? "Bank"
                      : "بنكي"
                    : payMethod === "palpay"
                      ? "PalPay"
                      : "Jawwal Pay"}
                </span>
              </div>

              {/* Bank Details */}
              {payMethod === "bank" && (
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                    <span className="text-ink-soft font-bold">
                      {language === "en" ? "Bank Name:" : "اسم البنك:"}
                    </span>
                    <span className="font-extrabold text-primary">
                      {adminSettings?.bankName || "بنك فلسطين"}
                    </span>
                  </div>

                  {adminSettings?.bankAccount && (
                    <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                      <div>
                        <div className="text-ink-soft text-[11px] font-bold">
                          {language === "en" ? "Account Number:" : "رقم الحساب:"}
                        </div>
                        <div
                          className="font-mono font-extrabold text-primary text-sm tracking-wider"
                          dir="ltr"
                        >
                          {adminSettings.bankAccount}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            adminSettings.bankAccount,
                            language === "en" ? "Account Number" : "رقم الحساب",
                          )
                        }
                        className="text-xs font-bold bg-white hover:bg-mint-bg text-primary px-3 py-1.5 rounded-lg border border-mint-line shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>📋</span>
                        <span>{language === "en" ? "Copy" : "نسخ"}</span>
                      </button>
                    </div>
                  )}

                  {adminSettings?.bankIban && (
                    <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                      <div className="max-w-[75%]">
                        <div className="text-ink-soft text-[11px] font-bold">
                          {language === "en" ? "IBAN:" : "الآيبان (IBAN):"}
                        </div>
                        <div
                          className="font-mono font-extrabold text-primary text-xs sm:text-sm tracking-tight break-all"
                          dir="ltr"
                        >
                          {adminSettings.bankIban}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            adminSettings.bankIban,
                            language === "en" ? "IBAN" : "الآيبان",
                          )
                        }
                        className="text-xs font-bold bg-white hover:bg-mint-bg text-primary px-3 py-1.5 rounded-lg border border-mint-line shadow-2xs transition-all active:scale-95 flex items-center gap-1 shrink-0"
                      >
                        <span>📋</span>
                        <span>{language === "en" ? "Copy" : "نسخ"}</span>
                      </button>
                    </div>
                  )}

                  {(adminSettings?.bankAccountName ||
                    adminSettings?.companyName) && (
                    <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                      <span className="text-ink-soft font-bold">
                        {language === "en" ? "Beneficiary Name:" : "اسم المستفيد:"}
                      </span>
                      <span className="font-extrabold text-primary text-end">
                        {adminSettings.bankAccountName ||
                          adminSettings.companyName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* PalPay Details */}
              {payMethod === "palpay" && (
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                    <div>
                      <div className="text-ink-soft text-[11px] font-bold">
                        {language === "en"
                          ? "PalPay Wallet Number:"
                          : "رقم محفظة بال باي (PalPay):"}
                      </div>
                      <div
                        className="font-mono font-extrabold text-primary text-sm sm:text-base tracking-wider"
                        dir="ltr"
                      >
                        {adminSettings?.walletNumber || "0590000000"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          adminSettings?.walletNumber || "",
                          language === "en" ? "Wallet Number" : "رقم المحفظة",
                        )
                      }
                      className="text-xs font-bold bg-white hover:bg-mint-bg text-primary px-3 py-1.5 rounded-lg border border-mint-line shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>📋</span>
                      <span>{language === "en" ? "Copy" : "نسخ"}</span>
                    </button>
                  </div>

                  {(adminSettings?.palpayName ||
                    adminSettings?.walletName ||
                    adminSettings?.bankAccountName ||
                    adminSettings?.companyName) && (
                    <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                      <span className="text-ink-soft font-bold">
                        {language === "en" ? "Beneficiary Name:" : "اسم المستفيد:"}
                      </span>
                      <span className="font-extrabold text-primary">
                        {adminSettings.palpayName ||
                          adminSettings.walletName ||
                          adminSettings.bankAccountName ||
                          adminSettings.companyName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Jawwal Pay Details */}
              {payMethod === "jawwal" && (
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                    <div>
                      <div className="text-ink-soft text-[11px] font-bold">
                        {language === "en"
                          ? "Jawwal Pay Wallet Number:"
                          : "رقم محفظة جوال باي (Jawwal Pay):"}
                      </div>
                      <div
                        className="font-mono font-extrabold text-primary text-sm sm:text-base tracking-wider"
                        dir="ltr"
                      >
                        {adminSettings?.walletNumber || "0590000000"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          adminSettings?.walletNumber || "",
                          language === "en" ? "Wallet Number" : "رقم المحفظة",
                        )
                      }
                      className="text-xs font-bold bg-white hover:bg-mint-bg text-primary px-3 py-1.5 rounded-lg border border-mint-line shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>📋</span>
                      <span>{language === "en" ? "Copy" : "نسخ"}</span>
                    </button>
                  </div>

                  {(adminSettings?.jawwalpayName ||
                    adminSettings?.walletName ||
                    adminSettings?.bankAccountName ||
                    adminSettings?.companyName) && (
                    <div className="flex items-center justify-between bg-bg p-3 rounded-xl border border-mint-line">
                      <span className="text-ink-soft font-bold">
                        {language === "en" ? "Beneficiary Name:" : "اسم المستفيد:"}
                      </span>
                      <span className="font-extrabold text-primary">
                        {adminSettings.jawwalpayName ||
                          adminSettings.walletName ||
                          adminSettings.bankAccountName ||
                          adminSettings.companyName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Support WhatsApp Pill */}
              <div className="mt-4 pt-3 border-t border-mint-line flex items-center justify-between text-xs">
                <span className="text-ink-soft font-semibold">
                  {language === "en"
                    ? "Need help with payment?"
                    : "تواجه صعوبة أو استفسار؟"}
                </span>
                <a
                  href={`https://wa.me/${adminSettings?.whatsappNumber || "972590000000"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>💬</span>
                  <span>{language === "en" ? "WhatsApp Support" : "تواصل معنا"}</span>
                </a>
              </div>
            </div>
          </aside>

          {/* ========================================================= */}
          {/* SIDE B: Data Entry & Receipt Upload Form (7 Cols)         */}
          {/* ========================================================= */}
          <main className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 md:p-9 border border-mint-line shadow-sm order-2 lg:order-1">
            <div className="mb-6 pb-4 border-b border-mint-line">
              <h2 className="text-xl sm:text-2xl font-black text-primary flex items-center gap-2">
                <span>📝</span>
                <span>{language === "en" ? "Payment Proof Form" : "نموذج إثبات الدفع والتحويل"}</span>
              </h2>
              <p className="text-xs sm:text-sm text-ink-soft mt-1 font-medium">
                {language === "en"
                  ? "Select transfer method, enter verification info, and upload receipt image."
                  : "حدد وسيلة التحويل، وأدخل بيانات المطابقة، وأرفق صورة الإيصال ليتم الاعتماد."}
              </p>
            </div>

            {/* STEP 1: Select Payment Method */}
            <div className="mb-6">
              <label className="block text-xs sm:text-sm font-extrabold text-primary mb-2.5">
                {language === "en" ? "1. Select Payment Method" : "1. حدد طريقة الدفع والتحويل"}
              </label>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {[
                  {
                    key: "bank",
                    label: language === "en" ? "Bank Transfer" : "حوالة بنكية",
                    icon: "🏦",
                  },
                  {
                    key: "palpay",
                    label: language === "en" ? "PalPay" : "بال باي",
                    icon: "💳",
                  },
                  {
                    key: "jawwal",
                    label: language === "en" ? "Jawwal Pay" : "جوال باي",
                    icon: "📱",
                  },
                ].map((m) => {
                  const isActive = payMethod === m.key;
                  return (
                    <button
                      type="button"
                      key={m.key}
                      onClick={() => setPayMethod(m.key as any)}
                      className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 text-center active:scale-95 ${
                        isActive
                          ? "border-teal bg-teal-pale text-teal shadow-sm font-black"
                          : "border-mint-line bg-white hover:bg-bg text-ink-soft font-bold hover:border-teal/30"
                      }`}
                    >
                      <span className="text-2xl sm:text-3xl">{m.icon}</span>
                      <span className="text-xs sm:text-sm">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: Transfer Details (At least one required) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs sm:text-sm font-extrabold text-primary">
                  {language === "en" ? "2. Transfer Information" : "2. بيانات الحوالة والمطابقة"}
                </label>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  ⚡ {language === "en" ? "At least one required" : "مطلوب أحدهما على الأقل"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sender Name */}
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Sender / Account Name" : "اسم صاحب الحساب أو المحوّل"}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      language === "en"
                        ? "e.g. Ahmad Mohammad"
                        : "مثال: أحمد محمد خليل"
                    }
                    value={transferName}
                    onChange={(e) => setTransferName(e.target.value)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all text-ink placeholder:text-ink-soft/40"
                  />
                </div>

                {/* Transfer Ref Number */}
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1.5">
                    {language === "en" ? "Reference / Transaction ID" : "رقم المرجع / رقم العملية"}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      language === "en" ? "e.g. 987654321" : "مثال: 987654321"
                    }
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all text-ink placeholder:text-ink-soft/40 font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: Receipt Image Upload */}
            <div className="mb-6">
              <label className="block text-xs sm:text-sm font-extrabold text-primary mb-2.5">
                {language === "en" ? "3. Attach Receipt Image" : "3. صورة إشعار أو إيصال التحويل"}
              </label>

              <label
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-5 sm:p-7 cursor-pointer transition-all ${
                  receiptImage
                    ? "border-emerald-500 bg-emerald-50/40"
                    : "border-mint-line bg-bg hover:bg-mint-bg hover:border-teal/50"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 8 * 1024 * 1024) {
                      toast.error(
                        language === "en"
                          ? "Image size is too large (max 8MB)"
                          : "حجم الصورة كبير جداً (الحد الأقصى 8 ميجابايت)",
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () =>
                      setReceiptImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />

                {receiptImage ? (
                  <div className="w-full flex flex-col items-center text-center">
                    <div className="relative max-h-56 max-w-full overflow-hidden rounded-xl border border-emerald-200 shadow-sm mb-3">
                      <img
                        src={receiptImage}
                        alt="Receipt preview"
                        className="max-h-52 w-auto object-contain rounded-xl"
                      />
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full mb-1">
                      <span>✅</span>
                      <span>
                        {language === "en"
                          ? "Receipt loaded successfully"
                          : "تم تجهيز الإيصال بنجاح"}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-soft font-bold hover:underline">
                      {language === "en"
                        ? "Click to choose a different image"
                        : "انقر لاختيار صورة أخرى"}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-mint-line shadow-sm flex items-center justify-center text-2xl mb-3 text-primary">
                      📷
                    </div>
                    <div className="text-sm font-extrabold text-primary mb-1">
                      {language === "en"
                        ? "Click here to upload payment receipt"
                        : "انقر هنا لاختيار صورة إيصال الدفع"}
                    </div>
                    <p className="text-xs text-ink-soft max-w-xs font-medium">
                      {language === "en"
                        ? "JPG, PNG or WebP image showing transaction details clearly (Max 8MB)"
                        : "صورة واضحة لإشعار البنك أو المحفظة بصيغة JPG أو PNG"}
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  !receiptImage ||
                  (!transferName.trim() && !transferRef.trim())
                }
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary active:scale-[0.99] transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>
                      {language === "en"
                        ? "Submitting receipt..."
                        : "جاري إرسال الإيصال..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>
                      {language === "en"
                        ? "Submit Receipt for Admin Approval"
                        : "إرسال الإيصال لاعتماد الاشتراك"}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center mt-3 text-[11px] text-ink-soft font-medium flex items-center justify-center gap-1.5">
                <span>🔒</span>
                <span>
                  {language === "en"
                    ? "Your submission is secure. Admin will verify receipt and activate your account."
                    : "بياناتك مشفرة ومحمية. سيقوم المسؤول بمراجعة الإيصال وتفعيل الحساب فوراً."}
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
