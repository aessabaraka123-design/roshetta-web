const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');
code = code.replace(
  "image: { type: 'jpeg', quality: 1 },",
  "image: { type: 'jpeg', quality: 1 },\n                      pagebreak: { mode: 'avoid-all' },"
);
fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
console.log('Added pagebreak option');
