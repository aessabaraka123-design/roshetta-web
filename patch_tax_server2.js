const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Patch print-settings PUT
const oldPrintSettings = `app.put("/api/pharmacies/:id/print-settings", (req, res) => {
  const { id } = req.params;
  const { receiptFooter, printerSize, showLogo } = req.body;
  db.run(
    "UPDATE pharmacies SET receiptFooter = ?, printerSize = ?, showLogo = ? WHERE id = ?",
    [receiptFooter, printerSize || "80mm", showLogo ? 1 : 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );
});`;
const newPrintSettings = `app.put("/api/pharmacies/:id/print-settings", (req, res) => {
  const { id } = req.params;
  const { receiptFooter, printerSize, showLogo, enableTax, taxRate } = req.body;
  
  // Safe update: first add columns if missing just in case
  db.run("ALTER TABLE pharmacies ADD COLUMN enableTax INTEGER DEFAULT 0", () => {
    db.run("ALTER TABLE pharmacies ADD COLUMN taxRate REAL DEFAULT 16", () => {
       db.run(
        "UPDATE pharmacies SET receiptFooter = ?, printerSize = ?, showLogo = ?, enableTax = ?, taxRate = ? WHERE id = ?",
        [receiptFooter, printerSize || "80mm", showLogo ? 1 : 0, enableTax ? 1 : 0, taxRate || 0, id],
        function (err) {
          if (err) return handleError(res, err);
          res.json({
            success: true,
          });
        },
      );
    });
  });
});`;
server = server.replace(oldPrintSettings, newPrintSettings);


// 2. Patch Sales POST
const oldSalesPost = `    db.run(
      \`INSERT INTO sales (id, pharmacy_id, items, total, paymentMethod, customer, date, cashierName, branchName, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        saleId,
        pharmacy_id,
        JSON.stringify(items),
        req.body.total || 0,
        paymentMethod || "cash",
        customerObj,
        date,
        cashierName,
        branchName,
        req.body.notes || null,
      ],`;
const newSalesPost = `
    // Attempt to add cols dynamically if missing
    db.run("ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0", ()=>{});
    db.run("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0", ()=>{});
    db.run("ALTER TABLE sales ADD COLUMN tax REAL DEFAULT 0", ()=>{});

    db.run(
      \`INSERT INTO sales (id, pharmacy_id, items, subtotal, discount, tax, total, paymentMethod, customer, date, cashierName, branchName, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        saleId,
        pharmacy_id,
        JSON.stringify(items),
        req.body.subtotal || req.body.total || 0,
        req.body.discount || 0,
        req.body.tax || 0,
        req.body.total || 0,
        paymentMethod || "cash",
        customerObj,
        date,
        cashierName,
        branchName,
        req.body.notes || null,
      ],`;
server = server.replace(oldSalesPost, newSalesPost);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched server.js again!");
