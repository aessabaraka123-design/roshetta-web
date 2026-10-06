const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  /"إجمالي \{language === "en" \? "Remaining" : "المتبقي"\}"/g,
  'language === "en" ? "Total Remaining" : "إجمالي المتبقي"'
);

// wait, let's also fix "{language === "en" ? "Grand Total" : "{language === "en" ? "Grand Total" : "الإجمالي الكلي"}"}" if it exists!
c = c.replace(
  /\{language === "en" \? "Grand Total" : "\{language === "en" \? "Grand Total" : "الإجمالي الكلي"\}"\}/g,
  '{language === "en" ? "Grand Total" : "الإجمالي الكلي"}'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed syntax errors');
