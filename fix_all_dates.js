const fs = require('fs');

const files = [
  'web/src/app/customers/page.tsx',
  'web/src/app/expenses/page.tsx',
  'web/src/app/owner-support/page.tsx',
  'web/src/app/page.tsx',
  'web/src/app/pos/page.tsx',
  'web/src/app/print-settings/page.tsx',
  'web/src/app/purchases/page.tsx',
  'web/src/app/returns/page.tsx',
  'web/src/app/sales/page.tsx',
  'web/src/app/shifts/page.tsx',
  'web/src/app/suppliers/page.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/"ar-EG"/g, 'language === "en" ? "en-US" : "ar-EG"');
  fs.writeFileSync(f, c, 'utf8');
});

console.log('Fixed dates globally');
