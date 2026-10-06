const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  '"✅ {language === "en" ? "Save and Enter to Stock" : "حفظ وإدخال للمخزون"}"',
  'language === "en" ? "✅ Save and Enter to Stock" : "✅ حفظ وإدخال للمخزون"'
);

// wait, are there any other similar bugs?
c = c.replace(
  '"💾 حفظ كطلبية مبدئية"',
  'language === "en" ? "💾 Save as Draft" : "💾 حفظ كطلبية مبدئية"'
);

c = c.replace(
  '"✅ تسجيل الفاتورة وإدخالها للمخزون"',
  'language === "en" ? "✅ Register and Enter to Stock" : "✅ تسجيل الفاتورة وإدخالها للمخزون"'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed quotes 2');
