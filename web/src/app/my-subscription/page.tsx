"use client";

import AppBar from "@/components/AppBar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function MySubscription() {
  const router = useRouter();

  // Mock current subscription data
  const currentSub = {
    planName: "الرخصة السنوية",
    status: "active", // active, expiring, expired
    expiryDate: "2024-11-05",
    daysLeft: 87,
    maxBranches: 3,
    currentBranches: 3,
    price: "₪ 1,200",
  };

  return (
    <>
      <AppBar title="تفاصيل الاشتراك والباقة" backHref="/more" />
      <main className="max-w-4xl mx-auto p-4 pb-24 mt-4 space-y-6">
        {/* Current Plan Overview Card */}
        <div className="bg-white rounded-3xl p-6 border border-mint-line shadow-sm relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="text-[13px] font-bold text-ink-soft mb-1">
                باقتك الحالية
              </div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[28px] font-black text-primary">
                  {currentSub.planName}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-bold border ${
                    currentSub.status === "active"
                      ? "bg-teal-pale text-teal border-teal/20"
                      : currentSub.status === "expiring"
                        ? "bg-amber-pale text-amber border-amber/20"
                        : "bg-coral-pale text-coral border-coral/20"
                  }`}
                >
                  {currentSub.status === "active"
                    ? "فعال"
                    : currentSub.status === "expiring"
                      ? "ينتهي قريباً"
                      : "منتهي"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[13px] text-ink-soft font-bold mb-1">
                    تاريخ الانتهاء
                  </div>
                  <div className="text-[16px] font-black text-ink">
                    {currentSub.expiryDate}
                  </div>
                  <div
                    className={`text-[12px] font-bold mt-1 ${currentSub.daysLeft > 30 ? "text-teal" : "text-coral"}`}
                  >
                    (متبقي {currentSub.daysLeft} يوماً)
                  </div>
                </div>
                <div>
                  <div className="text-[13px] text-ink-soft font-bold mb-1">
                    الفروع المستخدمة
                  </div>
                  <div className="text-[16px] font-black text-ink">
                    {currentSub.currentBranches} / {currentSub.maxBranches}
                  </div>
                  <div className="text-[12px] font-bold text-ink-soft mt-1">
                    الحد الأقصى {currentSub.maxBranches} فروع
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-pale text-primary rounded-2xl p-4 flex flex-col items-center justify-center min-w-[120px]">
              <div className="text-[12px] font-bold mb-1">تكلفة التجديد</div>
              <div className="text-[20px] font-black">{currentSub.price}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => {
              toast.success("تم تجديد اشتراكك بنجاح للعام القادم!");
            }}
            className="bg-primary text-white font-bold py-4 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-colors flex items-center justify-center gap-2 text-[16px]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            تجديد الاشتراك الحالي
          </button>

          <button
            onClick={() => router.push("/upgrade-plan")}
            className="bg-amber-pale text-amber-dark border border-amber/30 font-bold py-4 rounded-xl shadow-sm hover:bg-amber hover:text-white transition-colors flex items-center justify-center gap-2 text-[16px]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            ترقية إلى باقة أعلى
          </button>
        </div>

        {/* Plan Features */}
        <div className="bg-white rounded-3xl p-6 border border-mint-line shadow-sm">
          <h3 className="text-[18px] font-black text-primary mb-4">
            مميزات باقتك الحالية
          </h3>
          <ul className="space-y-3">
            {[
              "إدارة الفروع (حتى 3 فروع)",
              "نقاط البيع السريعة (POS)",
              "إدارة المخزون والتنبيهات المتقدمة",
              "تقارير مبيعات وأرباح مفصلة",
              "دعم فني على مدار الساعة",
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-pale text-teal flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-[14px] font-semibold text-ink">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
