const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const parts = code.split('// ==========================================');

parts[1] = parts[1].replace(/try\s*\{\s*await dbRun\((.*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');

code = parts.join('// ==========================================');
fs.writeFileSync('server.js', code, 'utf8');
console.log('Fixed parts');
