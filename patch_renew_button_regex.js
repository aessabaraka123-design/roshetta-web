const fs = require('fs');
let c = fs.readFileSync('web/src/app/my-subscription/page.tsx', 'utf8');

c = c.replace(/onClick=\{\(\) => \{\s+toast\.success\([\s\S]*?\);\s+\}\}/, 'onClick={() => router.push("/receipt-upload")}');

fs.writeFileSync('web/src/app/my-subscription/page.tsx', c, 'utf8');
console.log('Fixed Renew button in my-subscription using regex');
