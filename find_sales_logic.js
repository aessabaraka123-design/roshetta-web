const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
let inSales = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.post("/api/pharmacies/:id/sales"')) inSales = true;
  if (inSales) {
    console.log(i + 1, lines[i]);
    if (lines[i].includes('res.json({ success: true, id: saleId })')) break;
  }
}
