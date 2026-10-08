const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.post("/api/pharmacies/:id/shifts/open"')) {
    console.log('Found open shift at line', i + 1);
    for (let j = i; j < i + 40; j++) {
      console.log(j + 1, lines[j]);
    }
  }
  if (lines[i].includes('app.post("/api/pharmacies/:id/shifts/:shiftId/close"')) {
    console.log('Found close shift at line', i + 1);
    for (let j = i; j < i + 100; j++) {
      console.log(j + 1, lines[j]);
      if (lines[j].includes('});') && lines[j-1] && lines[j-1].includes('res.json')) break;
    }
  }
}
