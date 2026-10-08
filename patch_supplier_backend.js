const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldPaymentEndpoint = `app.post("/api/pharmacies/:id/suppliers/:suppId/payment", (req, res) => {
  const { id: pharmacy_id, suppId } = req.params;
  const amount = Number(req.body.amount) || 0;
  db.run(
    "UPDATE suppliers SET balance = COALESCE(balance, 0) - ? WHERE id = ? AND pharmacy_id = ?",
    [amount, suppId, pharmacy_id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});`;

const newPaymentEndpoint = `app.post("/api/pharmacies/:id/suppliers/:suppId/payment", (req, res) => {
  const { id: pharmacy_id, suppId } = req.params;
  const amount = Number(req.body.amount) || 0;
  const paymentMethod = req.body.paymentMethod || "كاش";
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    // 1. Deduct from supplier balance
    db.run(
      "UPDATE suppliers SET balance = COALESCE(balance, 0) - ? WHERE id = ? AND pharmacy_id = ?",
      [amount, suppId, pharmacy_id]
    );

    // 2. Only deduct from cash/drawer if paid in cash
    if (paymentMethod === "كاش" || paymentMethod === "cash" || paymentMethod === "نقدي") {
       db.get("SELECT name FROM suppliers WHERE id = ? AND pharmacy_id = ?", [suppId, pharmacy_id], (err, row) => {
          const supplierName = row ? row.name : suppId;
          const expId = "EXP-SUPP-" + Date.now() + Math.floor(Math.random()*1000);
          const desc = \`تسديد دفعة لمورد (Supplier Payment) - \${supplierName}\`;
          db.run(
            \`INSERT INTO expenses (id, pharmacy_id, description, amount, date, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)\`,
            [expId, pharmacy_id, desc, amount, new Date().toISOString(), "System/Supplier", "all"],
            (eErr) => {
              if (eErr) {
                db.run("ROLLBACK");
                return res.status(500).json({ success: false, error: eErr.message });
              }
              db.run("COMMIT", (err2) => {
                if (err2) return handleError(res, err2);
                res.json({ success: true });
              });
            }
          );
       });
    } else {
       // If paid by Bank, Cheque, etc., it doesn't leave the physical drawer, so no drawer expense is needed.
       // However, you could log it in a bank ledgers table later. For now, just commit.
       db.run("COMMIT", (err2) => {
          if (err2) return handleError(res, err2);
          res.json({ success: true });
       });
    }
  });
});`;

if (server.includes(oldPaymentEndpoint)) {
  server = server.replace(oldPaymentEndpoint, newPaymentEndpoint);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log("Patched backend supplier payment to integrate with expenses/shifts!");
} else {
  console.log("Could not find backend supplier payment string!");
}
