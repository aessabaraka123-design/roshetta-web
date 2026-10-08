const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace('req.path === "/api/auth/register"', 'req.path === "/api/auth/register" || req.path === "/api/auth/check-email"');

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Bypassed auth for check-email');
