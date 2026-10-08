const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
let inReport = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.get("/api/pharmacies/:id/reports"')) inReport = true;
  if (inReport) {
    console.log(i + 1, lines[i]);
    if (lines[i].includes('let items = [];')) break;
  }
}
