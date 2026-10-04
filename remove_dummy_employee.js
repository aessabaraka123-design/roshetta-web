const fs = require('fs');
let printCode = fs.readFileSync('web/src/app/print-settings/page.tsx', 'utf8');
printCode = printCode.replace(/>علي علي</g, '>اسم الموظف<');
fs.writeFileSync('web/src/app/print-settings/page.tsx', printCode, 'utf8');
console.log("Fixed dummy employee name in print-settings");
