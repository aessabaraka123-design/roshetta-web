const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Fix POST
server = server.replace(
  'db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {',
  'db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND IFNULL(branch_id, \'\') = ?", [pharmacy_id, name, branch_id || ""], (err, row) => {'
);

// Fix PUT
server = server.replace(
  'db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {',
  'db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND IFNULL(branch_id, \'\') = ? AND id != ?", [pharmacy_id, name, branch_id || "", itemId], (err, row) => {'
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Fixed inventory unique name constraints to be branch-specific!');
