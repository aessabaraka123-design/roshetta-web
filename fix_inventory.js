const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /const inventory = inventoryData\?\.drugs \|\| \[\];/;

if (regex.test(code)) {
  code = code.replace(regex, 'const inventory = inventoryData?.inventory || [];');
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully updated inventory variable!');
} else {
  console.log('Failed to match inventoryData string in frontend.');
}
