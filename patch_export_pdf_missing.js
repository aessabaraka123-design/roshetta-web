const fs = require('fs');
let c = fs.readFileSync('web/src/utils/export.ts', 'utf8');

c = c.replace(
  'الأدوية الأكثر مبيعاً',
  '${language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}'
);

c = c.replace(
  '["اسم الدواء", "الكمية المباعة", "إجمالي الإيرادات"],',
  '[language === "en" ? "Medicine Name" : "اسم الدواء", language === "en" ? "Quantity Sold" : "الكمية المباعة", language === "en" ? "Total Revenue" : "إجمالي الإيرادات"],'
);

c = c.replace(
  'نظام روشتة</p>',
  '${language === "en" ? "Roshetta System" : "نظام روشتة"}</p>'
);

fs.writeFileSync('web/src/utils/export.ts', c, 'utf8');
console.log('Fixed missed PDF strings');
