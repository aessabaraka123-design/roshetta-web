const fs = require('fs');
let lines = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8').split('\n');

lines[283] = '          form.status === "draft"';
lines[284] = '            ? (language === "en" ? "Draft order saved!" : "تم حفظ الطلبية المبدئية!")';
lines[285] = '            : (language === "en" ? "Purchase invoice saved!" : "تم حفظ فاتورة المشتريات!"),';

fs.writeFileSync('web/src/app/purchases/page.tsx', lines.join('\n'), 'utf8');
console.log('Fixed multiline toast');
