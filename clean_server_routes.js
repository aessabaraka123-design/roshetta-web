const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Remove ALTER TABLE from print-settings PUT route and ensure it's clean
const regexPrint = /app\.put\("\/api\/pharmacies\/:id\/print-settings", \(req, res\) => \{[\s\S]*?\}\);/g;
const newPrintSettings = `app.put("/api/pharmacies/:id/print-settings", (req, res) => {
  const { id } = req.params;
  const { receiptFooter, printerSize, showLogo, enableTax, taxRate } = req.body;
  
  db.run(
    "UPDATE pharmacies SET receiptFooter = ?, printerSize = ?, showLogo = ?, enableTax = ?, taxRate = ? WHERE id = ?",
    [receiptFooter, printerSize || "80mm", showLogo ? 1 : 0, enableTax ? 1 : 0, taxRate || 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    }
  );
});`;

if(regexPrint.test(server)) {
    server = server.replace(regexPrint, newPrintSettings);
} else {
    console.log("Could not find print-settings route to clean");
}

// 2. Remove ALTER TABLE from sales POST route and fix columns
const regexSales = /\/\/ Attempt to add cols dynamically if missing[\s\S]*?req\.body\.notes \|\| null,\n      ],/g;
const newSalesPost = `    db.run(
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

if(regexSales.test(server)) {
    server = server.replace(regexSales, newSalesPost);
} else {
    console.log("Could not find sales POST route to clean");
}

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Cleaned up server.js routes!");
