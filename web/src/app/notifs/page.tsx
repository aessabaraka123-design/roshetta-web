"use client";

import AppBar from "@/components/AppBar";
import { useStore } from "@/store";

export default function Notifications() {
  const language = useStore((state: any) => state.language);

  const notifs = [
    {
      id: 1,
      type: "coral",
      icon: "⏰",
      title: language === 'en' ? "Augmentin 1g nearing expiration" : "أوجمنتين ١g قارب على الانتهاء",
      desc: language === 'en' ? "3 days left until expiration — Main Branch" : "باقي ٣ أيام على الصلاحية — الفرع الرئيسي",
      time: language === 'en' ? "10 mins ago" : "قبل ١٠ دقائق",
    },
    {
      id: 2,
      type: "amber",
      icon: "📦",
      title: language === 'en' ? "Ventolin inhaler out of stock" : "فنتولين بخاخ نفدت الكمية",
      desc: language === 'en' ? "Eastern District Branch — Supply request recommended" : "فرع الحي الشرقي — يُنصح بطلب توريد",
      time: language === 'en' ? "1 hour ago" : "قبل ساعة",
    },
    {
      id: 3,
      type: "teal",
      icon: "🔁",
      title: language === 'en' ? "Chronic medication renewal" : "تجديد دواء مزمن",
      desc: language === 'en' ? "Heba Salama Metformin renewal due in two days" : "هبة سلامة موعد تجديد ميتفورمين خلال يومين",
      time: language === 'en' ? "Today 8:00 AM" : "اليوم ٨:٠٠ ص",
    },
    {
      id: 4,
      type: "primary",
      icon: "✅",
      title: language === 'en' ? "Al-Balad Branch inventory completed" : "اكتمل جرد فرع البلد",
      desc: language === 'en' ? "Full match with system record" : "تطابق كامل مع سجل النظام",
      time: language === 'en' ? "Yesterday" : "أمس",
    },
  ];

  const getColorClasses = (type: string) => {
    switch (type) {
      case "coral":
        return "border-r-coral bg-coral-pale";
      case "amber":
        return "border-r-amber bg-amber-pale";
      case "teal":
        return "border-r-teal bg-teal-pale";
      default:
        return "border-r-mint-line bg-primary-pale";
    }
  };

  return (
    <div className="max-w-3xl">
      <AppBar title={language === 'en' ? "Notifications" : "الإشعارات"} showLogo={false} />

      <div className="flex flex-col gap-3 mt-4">
        {notifs.map((n) => {
          const colors = getColorClasses(n.type);
          return (
            <div
              key={n.id}
              className={`flex gap-4 bg-card border border-mint-line border-r-4 rounded-[12px] p-4 shadow-sm ${colors.split(" ")[0]}`}
            >
              <div
                className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[18px] ${colors.split(" ")[1]}`}
              >
                {n.icon}
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-ink">{n.title}</h4>
                <p className="text-[14px] text-ink-soft mt-1 leading-relaxed">
                  {n.desc}
                </p>
                <div className="text-[12px] text-[#A6B8AE] mt-2 font-mono">
                  {n.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
