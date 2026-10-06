const fs = require('fs');
let c = fs.readFileSync('web/src/app/more/page.tsx', 'utf8');

c = c.replace(
  'const setLanguage = useStore((state: any) => state.setLanguage);',
  `const setLanguage = useStore((state: any) => state.setLanguage);
  
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

fs.writeFileSync('web/src/app/more/page.tsx', c, 'utf8');
console.log('Injected tLabel successfully');
