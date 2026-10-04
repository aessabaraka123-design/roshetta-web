const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8').replace(/\r\n/g, '\n');

// POST Endpoint
const postTarget = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  db.run(
    "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",`;

const postReplace = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  
  // UNIQUE NAME CHECK POST
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

  db.run(
    "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",`;

const postEndTarget = `      res.json({
        success: true,
        itemId,
      });
    },
  );
});`;

const postEndReplace = `      res.json({
        success: true,
        itemId,
      });
    },
  );
  });
});`;


// PUT Endpoint
const putTarget = `  const finalExpiry = expiry || expiry_date || "";
  db.run(
    "UPDATE inventory SET barcode = ?, name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, branch_id = ?, units = ?, batch_number = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?",`;

const putReplace = `  const finalExpiry = expiry || expiry_date || "";

  // UNIQUE NAME CHECK PUT
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });
    }

  db.run(
    "UPDATE inventory SET barcode = ?, name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, branch_id = ?, units = ?, batch_number = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?",`;

const putEndTarget = `      res.json({
        success: true,
      });
    },
  );
});`;

const putEndReplace = `      res.json({
        success: true,
      });
    },
  );
  });
});`;


if (code.includes(postTarget) && code.includes(postEndTarget)) {
  code = code.replace(postTarget, postReplace);
  code = code.replace(postEndTarget, postEndReplace);
  console.log("Applied POST");
} else {
  console.log("Could not find POST targets");
}

if (code.includes(putTarget) && code.includes(putEndTarget)) {
  code = code.replace(putTarget, putReplace);
  code = code.replace(putEndTarget, putEndReplace);
  console.log("Applied PUT");
} else {
  console.log("Could not find PUT targets");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Done");
