const fs = require('fs');

let page = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

// 1. Subscription Title
page = page.replace(
  /الاشتراك السنوي \(Premium\)/,
  '{language === "en" ? "Annual Subscription (Premium)" : "الاشتراك السنوي (Premium)"}'
);

// 2. Subscription Subtitle
page = page.replace(
  /يسمح لك بإدارة حتى 5 فروع مع تقارير متقدمة\./,
  '{language === "en" ? "Allows you to manage up to 5 branches with advanced reports." : "يسمح لك بإدارة حتى 5 فروع مع تقارير متقدمة."}'
);

// 3. Branches Used value (with dir="ltr")
page = page.replace(
  /<div className="font-bold font-mono text-\[18px\]">\s*3 \/ 5\s*<\/div>/,
  '<div className="font-bold font-mono text-[18px]" dir="ltr">\n                            3 / 5\n                          </div>'
);

// 4. Next Renewal Date text
page = page.replace(
  /تاريخ التجديد القادم/,
  '{language === "en" ? "Next Renewal Date" : "تاريخ التجديد القادم"}'
);

// 5. Upgrade Plan Button
page = page.replace(
  /ترقية الباقة \(فروع أكثر\)/,
  '{language === "en" ? "Upgrade Plan (More Branches)" : "ترقية الباقة (فروع أكثر)"}'
);

// 6. Download Invoices Button
page = page.replace(
  /تحميل فواتير الاشتراك/,
  '{language === "en" ? "Download Invoices" : "تحميل فواتير الاشتراك"}'
);

fs.writeFileSync('web/src/app/admin/page.tsx', page, 'utf8');
console.log('Fixed admin dashboard subscription section');
