const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('/api/pharmacies/:id/inventory') && l.includes('app.post'));
console.log(lines.slice(start, start + 30).join('\n'));
