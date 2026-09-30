const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const regex = /\{user\?\.role === 'manager' && branches\.length > 0 && \(\n\s*(<div className="mb-4 bg-white p-3 rounded-xl border border-mint-line shadow-sm flex items-center justify-between">[\s\S]*?<\/div>)\n\s*\)\}/g;

code = code.replace(regex, `$1`);

fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
console.log("SUCCESS: Removed condition for branch selector in POS");
