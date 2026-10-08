const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.get("/api/pharmacies/:id/shifts"') || 
      lines[i].includes('app.post("/api/pharmacies/:id/shifts"') ||
      lines[i].includes('app.put("/api/pharmacies/:id/shifts"')) {
    console.log('Found endpoint at line', i + 1, lines[i].trim());
    for (let j = i; j < i + 150; j++) {
      if (lines[j].includes('});') && lines[j-1] && lines[j-1].includes('res.json')) {
        console.log(j + 1, lines[j]);
        break;
      }
      console.log(j + 1, lines[j]);
    }
  }
}
