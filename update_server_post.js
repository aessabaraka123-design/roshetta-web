const fs = require('fs');
let serverCode = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Modifying POST endpoint
const postStart = serverCode.indexOf('app.post("/api/pharmacies/:id/inventory"');
const postQuery = `db.run(
    "INSERT INTO inventory`;

const postCheckStr = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();

  // UNIQUE NAME CHECK
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

    db.run(
      "INSERT INTO inventory`;

serverCode = serverCode.replace(
  `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  db.run(
    "INSERT INTO inventory`,
  postCheckStr
);

// Don't forget to close the bracket!
// Wait, the db.run in POST has a callback:
//       function (err) {
//         if (err) return handleError(res, err);
//         res.json({ success: true, id: itemId });
//       },
//     );
//   });
// So we need to add `});` to close the `db.get` callback.

// Let's use regex for a safer replacement.
