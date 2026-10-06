const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  'في المخزون: {formatQty(d.qty, d.units, language)}',
  '{language === "en" ? "In Stock:" : "في المخزون:"} {formatQty(d.qty, d.units, language)}'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed purchases text');
