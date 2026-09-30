const fs = require('fs');
let txt = fs.readFileSync('original_pricing.txt', 'utf8');
// txt is wrapped in quotes
if (txt.startsWith('"') && txt.endsWith('"')) {
  txt = JSON.parse(txt);
}
fs.writeFileSync('original_pricing.tsx', txt);
