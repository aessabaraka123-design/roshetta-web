const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /purchase_price: drug\.buyPrice \|\| 0/g;
if (regex.test(code)) {
  code = code.replace(regex, 'purchase_price: drug.cost || 0');
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully updated purchase_price property!');
} else {
  console.log('Failed to match purchase_price mapping.');
}
