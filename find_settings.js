const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('app.get("/api/admin/settings"')) {
    for (let j = i; j < i + 30; j++) console.log(j + 1, lines[j]);
  }
}
