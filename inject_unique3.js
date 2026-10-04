const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const postOriginal = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  db.run(
    "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",`;

const postNew = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();

  // UNIQUE NAME CHECK POST
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

  db.run(
    "INSERT INTO inventory (id, pharmacy_id, branch_id, barcode, name, scientificName, category, price, cost, qty, minQty, expiry, units, batch_number, syncStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')",`;

const postEndOriginal = `      req.body.batch_number || "",
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        itemId,
      });
    },
  );
});`;

const postEndNew = `      req.body.batch_number || "",
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
        itemId,
      });
    },
  );
  });
});`;

const putOriginal = `  const finalExpiry = expiry || expiry_date || "";
  db.run(
    "UPDATE inventory SET barcode = ?, name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, branch_id = ?, units = ?, batch_number = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?",`;

const putNew = `  const finalExpiry = expiry || expiry_date || "";

  // UNIQUE NAME CHECK PUT
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });
    }

  db.run(
    "UPDATE inventory SET barcode = ?, name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, branch_id = ?, units = ?, batch_number = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?",`;

const putEndOriginal = `      req.body.isControlled ? 1 : 0,
      itemId,
      pharmacy_id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});`;

const putEndNew = `      req.body.isControlled ? 1 : 0,
      itemId,
      pharmacy_id,
    ],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
  });
});`;

// Normalize line endings to \n to make sure replace works
code = code.replace(/\r\n/g, '\n');

if (code.includes(postOriginal) && code.includes(postEndOriginal)) {
  code = code.replace(postOriginal, postNew);
  code = code.replace(postEndOriginal, postEndNew);
  console.log("POST fixed");
} else {
  console.log("POST targets not found");
}

if (code.includes(putOriginal) && code.includes(putEndOriginal)) {
  code = code.replace(putOriginal, putNew);
  code = code.replace(putEndOriginal, putEndNew);
  console.log("PUT fixed");
} else {
  console.log("PUT targets not found");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Done");
