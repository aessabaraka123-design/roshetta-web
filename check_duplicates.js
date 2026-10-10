const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const hasInventory = code.includes('app.get("/api/pharmacies/:id/inventory"');
const hasPurchaseInvoices = code.includes('app.get("/api/pharmacies/:id/purchase-invoices"');
console.log('hasInventory:', hasInventory);
console.log('hasPurchaseInvoices:', hasPurchaseInvoices);
