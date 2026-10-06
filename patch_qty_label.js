const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace('الكمية (علبة)', '{language === "en" ? "Quantity (Box)" : "الكمية (علبة)"}');

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed Box Qty label');
