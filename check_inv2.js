const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const start = code.indexOf('app.get("/api/pharmacies/:id/purchase-invoices"');
console.log(code.substring(start, start + 500));
