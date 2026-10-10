const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');
const lines = code.split('\n');
const endpoints = lines.filter(line => line.match(/app\.(get|post|put|delete)\(/)).map(line => line.trim());
console.log(endpoints.join('\n'));
