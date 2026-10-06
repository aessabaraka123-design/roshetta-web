const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const targetStr = `    (rows || []).forEach((sale) => {
      const saleTotal = sale.total || 0;`;

const newStr = `    (rows || []).forEach((sale) => {
      if (sale.status === "refunded") return;
      const saleTotal = sale.total || 0;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Not found");
}
