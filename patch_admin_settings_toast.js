const fs = require('fs');
let c = fs.readFileSync('web/src/app/admin/settings/page.tsx', 'utf8');

c = c.replace(
  'currentStatus !== 0\n              ? "تم تعليق الصيدلية بنجاح"\n              : "تم تنشيط الصيدلية بنجاح"',
  'currentStatus !== 0\n              ? (language === "en" ? "Pharmacy suspended successfully" : "تم تعليق الصيدلية بنجاح")\n              : (language === "en" ? "Pharmacy activated successfully" : "تم تنشيط الصيدلية بنجاح")'
);

fs.writeFileSync('web/src/app/admin/settings/page.tsx', c, 'utf8');
console.log('Fixed multiline toast in admin settings');
