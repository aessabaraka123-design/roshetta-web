const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
let inDash = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.get("/api/pharmacies/:id/dashboard"')) inDash = true;
  if (inDash) {
    if (lines[i].includes('Profit')) console.log('Found Profit at line', i + 1, lines[i]);
    if (lines[i].includes('res.json')) break;
  }
}
