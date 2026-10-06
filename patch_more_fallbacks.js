const fs = require('fs');
let c = fs.readFileSync('web/src/app/more/page.tsx', 'utf8');

c = c.replace(
  '{user?.managerName || "مدير النظام"}',
  '{user?.managerName || (language === "en" ? "System Manager" : "مدير النظام")}'
);

c = c.replace(
  '{user?.pharmacyName || "الصيدلية"}',
  '{user?.pharmacyName || (language === "en" ? "Pharmacy" : "الصيدلية")}'
);

fs.writeFileSync('web/src/app/more/page.tsx', c, 'utf8');
console.log('Fixed fallbacks');
