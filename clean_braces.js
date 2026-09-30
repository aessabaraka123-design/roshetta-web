const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace(/    \}\r?\n  \}\);\r?\n\}\);\r?\n\r?\nconst handleNotFound/g, '\nconst handleNotFound');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
