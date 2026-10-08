const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('app.get("/api/pharmacies/:id/')) {
    console.log(i + 1, l.trim());
  }
});
