const fs = require('fs');
let content = fs.readFileSync('web/src/utils/export.ts', 'utf8');

// Fix the array strings
content = content.replace(
  '["التاريخ", "${language === "en" ? "Total Sales" : "إجمالي المبيعات"}", "إجمالي الربح"]',
  '["التاريخ", language === "en" ? "Total Sales" : "إجمالي المبيعات", language === "en" ? "Gross Profit" : "إجمالي الربح"]'
);

content = content.replace(
  '["التاريخ", "${language === "en" ? "Total Sales" : "إجمالي المبيعات"}", "${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}", "${language === "en" ? "Net Profit" : "صافي الربح"}"]',
  '["التاريخ", language === "en" ? "Total Sales" : "إجمالي المبيعات", language === "en" ? "Total Expenses" : "إجمالي المصروفات", language === "en" ? "Net Profit" : "صافي الربح"]'
);

fs.writeFileSync('web/src/utils/export.ts', content, 'utf8');
console.log('Fixed export.ts arrays');
