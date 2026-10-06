const fs = require('fs');
let c = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

c = c.replace(
  'بيانات الدخول للموظفين',
  '{language === "en" ? "Staff Login Credentials" : "بيانات الدخول للموظفين"}'
);
c = c.replace(
  'بيانات سرية 🔒',
  '{language === "en" ? "Confidential 🔒" : "بيانات سرية 🔒"}'
);

fs.writeFileSync('web/src/app/admin/page.tsx', c, 'utf8');
console.log('Fixed staff credentials header strings properly');
