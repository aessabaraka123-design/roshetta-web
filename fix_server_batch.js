const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// For PUT /inventory/:itemId
const putInventoryRegex = /branch_id \|\| null,\n\s*units \|\| null,\n\s*req\.body\.isControlled \? 1 : 0,\n\s*itemId,/g;
code = code.replace(putInventoryRegex, `branch_id || null,\n      units || null,\n      req.body.batch_number || "",\n      req.body.isControlled ? 1 : 0,\n      itemId,`);

// Also update POST /inventory to save batch_number just in case
const postInventoryQuery = /"INSERT INTO inventory \(id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, syncStatus\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, 'synced'\)",/g;
code = code.replace(postInventoryQuery, `"INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",`);

const postInventoryArgs = /finalExpiry,\n\s*units \|\| null,\n\s*\],/g;
code = code.replace(postInventoryArgs, `finalExpiry,\n      units || null,\n      req.body.batch_number || "",\n    ],`);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Fixed server.js');
