const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Add migration
code = code.replace(/"units TEXT",/, `"units TEXT",\n              "batch_number TEXT",`);

// 2. Update PUT /inventory
code = code.replace(/units = \?, isControlled = \? WHERE/, `units = ?, batch_number = ?, isControlled = ? WHERE`);
code = code.replace(/branch_id \|\| "",\n\s*units/g, `branch_id || "",\n      units,\n      req.body.batch_number || "",`);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Updated server.js");
