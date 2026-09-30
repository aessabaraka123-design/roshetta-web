const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const oldHandle = `status: "completed"`;
const newHandle = `status: inv.status || "completed"`;

code = code.replace(oldHandle, newHandle);
fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
