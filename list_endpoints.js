const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');
const regex = /app\.(get|post|put|delete)\(['"]([^'"]+)['"]/g;
let match;
const endpoints = [];
while ((match = regex.exec(code)) !== null) {
  endpoints.push(match[1].toUpperCase() + ' ' + match[2]);
}
fs.writeFileSync('endpoints.txt', endpoints.join('\n'));
console.log('Endpoints written to endpoints.txt');
