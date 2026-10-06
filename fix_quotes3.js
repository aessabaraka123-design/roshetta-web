const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  /placeholder="\{language === "en" \? "Optional" : "اختياري"\}"/g,
  'placeholder={language === "en" ? "Optional" : "اختياري"}'
);

c = c.replace(
  /placeholder="\{language === "en" \? "Search and add item\.\.\." : "\.\.\.ابحث عن صنف وأضفه"\}"/g,
  'placeholder={language === "en" ? "Search and add item..." : "...ابحث عن صنف وأضفه"}'
);

c = c.replace(
  /"✅ \{language === "en" \? "Save and Enter to Stock" : "حفظ وإدخال للمخزون"\}"/g,
  'language === "en" ? "✅ Save and Enter to Stock" : "✅ حفظ وإدخال للمخزون"'
);


fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed quotes global');
