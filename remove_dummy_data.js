const fs = require('fs');

let posCode = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');
posCode = posCode.replace(/"صيدلية العودة"/g, '""');
posCode = posCode.replace(/"علي علي"/g, '""');
// Actually, for employee, we want: user?.managerName || ""
posCode = posCode.replace(/user\?.username\s*\|\|\s*""/g, 'user?.managerName || user?.username || ""');
fs.writeFileSync('web/src/app/pos/page.tsx', posCode, 'utf8');
console.log("Fixed dummy data in pos/page.tsx");

let printCode = fs.readFileSync('web/src/app/print-settings/page.tsx', 'utf8');
printCode = printCode.replace(/"صيدلية العودة"/g, '"اسم الصيدلية"');
printCode = printCode.replace(/"علي علي"/g, '"اسم الموظف"');
fs.writeFileSync('web/src/app/print-settings/page.tsx', printCode, 'utf8');
console.log("Fixed dummy data in print-settings/page.tsx");
