const fs = require('fs');
let c = fs.readFileSync('web/src/app/more/page.tsx', 'utf8');

// Inject the translation dictionary inside the component
c = c.replace(
  'const { t, language, setLanguage } = useStore();',
  `const { t, language, setLanguage } = useStore();
  const tLabel = (arLabel: string) => {
    if (language !== "en") return arLabel;
    const dict: Record<string, string> = {
      "الاشتراك والباقة": "Subscription & Plan",
      "الفروع والموظفين": "Branches & Staff",
      "تخصيص الفاتورة والطباعة": "Invoice & Print Settings",
      "التقارير والتحليلات": "Reports & Analytics",
      "الإشعارات": "Notifications",
      "الصلاحيات والأمان": "Permissions & Security",
      "الدعم الفني": "Technical Support"
    };
    return dict[arLabel] || arLabel;
  };`
);

// Replace {item.label} with {tLabel(item.label)}
c = c.replace(
  '{item.label}',
  '{tLabel(item.label)}'
);

// Translate "ترقية" (Upgrade) tag
c = c.replace(
  '<span className="ml-2 text-[10px] bg-amber text-white px-2 py-0.5 rounded-full inline-block animate-pulse">\n                    ترقية\n                  </span>',
  '<span className="ml-2 text-[10px] bg-amber text-white px-2 py-0.5 rounded-full inline-block animate-pulse">\n                    {language === "en" ? "Upgrade" : "ترقية"}\n                  </span>'
);

// Replace page title "الإعدادات"
c = c.replace(
  '<h2 className="text-[20px] font-bold text-primary">الإعدادات</h2>',
  '<h2 className="text-[20px] font-bold text-primary">{language === "en" ? "Settings" : "الإعدادات"}</h2>'
);

// Replace user fallbacks
c = c.replace(
  '{user?.managerName || "مدير الصيدلية"}',
  '{user?.managerName || (language === "en" ? "Pharmacy Manager" : "مدير الصيدلية")}'
);
c = c.replace(
  '{user?.pharmacyName || "صيدلية"}',
  '{user?.pharmacyName || (language === "en" ? "Pharmacy" : "صيدلية")}'
);

// Replace logout
c = c.replace(
  '<div className="text-[15px] font-bold text-coral">تسجيل الخروج</div>',
  '<div className="text-[15px] font-bold text-coral">{language === "en" ? "Logout" : "تسجيل الخروج"}</div>'
);

fs.writeFileSync('web/src/app/more/page.tsx', c, 'utf8');
console.log('Translated the "More" page!');
