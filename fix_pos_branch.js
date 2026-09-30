const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const regex = /\{branches\.length > 1 && user\?\.role === 'manager' && \(/g;
code = code.replace(regex, "{user?.role === 'manager' && branches.length > 0 && (");

fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
console.log("SUCCESS: Fixed POS branch selector visibility");
