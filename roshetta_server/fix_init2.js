const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const parts = code.split('// ==========================================');
// parts[0] has imports
// parts[1] has db init
// parts[2] has backup
// parts[3] has routes

parts[1] = parts[1].replace(/try\s*\{\s*await dbRun\((.*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');

code = parts.join('// ==========================================');
fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Fixed parts');
