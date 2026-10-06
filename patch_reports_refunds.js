const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const targetLoop = `      (rows || []).forEach((sale) => {
        const saleTotal = sale.total || 0;
        totalRevenue += saleTotal;`;

const newLoop = `      (rows || []).forEach((sale) => {
        if (sale.status === "refunded") return; // Skip fully refunded sales
        const saleTotal = sale.total || 0;
        totalRevenue += saleTotal;`;

if (code.includes(targetLoop)) {
  code = code.replace(targetLoop, newLoop);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log("Patched server.js to exclude refunded sales from reports");
} else {
  console.log("Could not find target loop in server.js");
}
