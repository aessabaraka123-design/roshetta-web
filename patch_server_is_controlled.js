const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Patch POST inventory
code = code.replace(
  '    branch_id,\n    units,\n  } = req.body;',
  '    branch_id,\n    units,\n    isControlled,\n  } = req.body;'
);

code = code.replace(
  "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",
  "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, isControlled, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')"
);

code = code.replace(
  '      req.body.batch_number || "",\n    ],',
  '      req.body.batch_number || "",\n      isControlled ? 1 : 0,\n    ],'
);


// Patch PUT inventory
code = code.replace(
  '    branch_id,\n    units,\n    batches,\n  } = req.body;\n  const finalPrice',
  '    branch_id,\n    units,\n    batches,\n    isControlled,\n  } = req.body;\n  const finalPrice'
);

code = code.replace(
  "UPDATE inventory SET barcode=?, name=?, scientificName=?, category=?, price=?, cost=?, qty=?, minQty=?, expiry=?, branch_id=?, units=?, batch_number=?, batches=?, syncStatus='synced' WHERE id=? AND pharmacy_id=?",
  "UPDATE inventory SET barcode=?, name=?, scientificName=?, category=?, price=?, cost=?, qty=?, minQty=?, expiry=?, branch_id=?, units=?, batch_number=?, batches=?, isControlled=?, syncStatus='synced' WHERE id=? AND pharmacy_id=?"
);

code = code.replace(
  '      batches ? JSON.stringify(batches) : null,\n      itemId,',
  '      batches ? JSON.stringify(batches) : null,\n      isControlled ? 1 : 0,\n      itemId,'
);

// We also need to fetch isControlled in GET endpoints.
// But wait, the GET endpoints usually do `SELECT * FROM inventory`, so `isControlled` will be fetched automatically.
// Let's verify this.

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Patched server.js for isControlled");
