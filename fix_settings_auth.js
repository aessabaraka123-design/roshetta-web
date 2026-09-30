const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace(
  'if (req.path === "/login") return next(); // In case login is moved here',
  'if (req.path === "/login" || (req.path === "/settings" && req.method === "GET")) return next();'
);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
