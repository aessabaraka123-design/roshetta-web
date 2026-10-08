const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.post("/api/pharmacies/:id/suppliers/:suppId/payment"')) {
    for (let j = i; j < i + 40; j++) {
      console.log(j + 1, lines[j]);
      if (lines[j].includes('});') && lines[j-1].includes('res.json')) break;
    }
    break;
  }
}
