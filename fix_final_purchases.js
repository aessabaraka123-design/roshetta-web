const fs = require('fs');
let lines = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('المورد{" "}')) {
    lines[i] = lines[i].replace('المورد{" "}', '{language === "en" ? "Supplier" : "المورد"} {" "}');
  }
  if (lines[i].includes('placeholder="ابحث عن صنف وأضفه..."')) {
    lines[i] = lines[i].replace('placeholder="ابحث عن صنف وأضفه..."', 'placeholder={language === "en" ? "Search and add item..." : "ابحث عن صنف وأضفه..."}');
  }
  if (lines[i].includes('{cartItems.length} صنف مضاف • اضغط على الصنف لتعديل الكمية')) {
    lines[i] = lines[i].replace('{cartItems.length} صنف مضاف • اضغط على الصنف لتعديل الكمية', '{cartItems.length} {language === "en" ? "items added • Click on item to edit quantity" : "صنف مضاف • اضغط على الصنف لتعديل الكمية"}');
  }
  if (lines[i].includes('"يجب تحديد المورد للفاتورة الفعلية"')) {
    lines[i] = lines[i].replace('"يجب تحديد المورد للفاتورة الفعلية"', 'language === "en" ? "Supplier must be selected for actual invoices" : "يجب تحديد المورد للفاتورة الفعلية"');
  }
}

fs.writeFileSync('web/src/app/purchases/page.tsx', lines.join('\n'), 'utf8');
console.log('Fixed missed text');
