const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  '"{language === "en" ? "Remaining" : "المتبقي"} (دين):"',
  '"المتبقي (دين):"'
);

c = c.replace(
  '{language === \'en\' ? "Total Remaining" : language === "en" ? "Total Remaining" : "إجمالي المتبقي"}',
  '{language === "en" ? "Total Remaining" : "إجمالي المتبقي"}'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed syntax errors 2');
