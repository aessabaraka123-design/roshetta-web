const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Remove ALTER TABLE from print-settings PUT
server = server.replace(
  `  // Safe update: first add columns if missing just in case
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
  });`,
  `  db.run(
    "UPDATE pharmacies SET receiptFooter = ?, printerSize = ?, showLogo = ?, enableTax = ?, taxRate = ? WHERE id = ?",
    [receiptFooter, printerSize || "80mm", showLogo ? 1 : 0, enableTax ? 1 : 0, taxRate || 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    },
  );`
);

// 2. Remove ALTER TABLE from sales POST
server = server.replace(
  `    // Attempt to add cols dynamically if missing
    db.run("ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0", ()=>{});
    db.run("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0", ()=>{});
    db.run("ALTER TABLE sales ADD COLUMN tax REAL DEFAULT 0", ()=>{});

    db.run(
      \`INSERT INTO sales (id, pharmacy_id, items, subtotal, discount, tax, total, paymentMethod, customer, date, cashierName, branchName, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,`,
  `    db.run(
      \`INSERT INTO sales (id, pharmacy_id, items, subtotal, discount, tax, total, paymentMethod, customer, date, cashierName, branchName, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,`
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Cleaned up server.js routes perfectly!");
