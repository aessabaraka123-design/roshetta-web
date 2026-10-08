const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.put("/api/pharmacies/:id/sales/:saleId/refund"')) {
    console.log('Found full refund at line', i + 1);
    for (let j = i; j < i + 60; j++) {
      console.log(j + 1, lines[j]);
    }
  }
}
