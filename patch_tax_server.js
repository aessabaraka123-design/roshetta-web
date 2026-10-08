const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Database Migrations
const initDbStr = `            ];
            cols.forEach((col) => {
              const colName = col.split(" ")[0];
              db.run(
                \`ALTER TABLE pharmacies ADD COLUMN \${col}\`,
                (err) => {}
              );
            });`;
const initDbStrNew = `            ];
            cols.forEach((col) => {
              const colName = col.split(" ")[0];
              db.run(
                \`ALTER TABLE pharmacies ADD COLUMN \${col}\`,
                (err) => {}
              );
            });
            // Tax and discount schema
            db.run("ALTER TABLE pharmacies ADD COLUMN enableTax INTEGER DEFAULT 0", (err)=>{});
            db.run("ALTER TABLE pharmacies ADD COLUMN taxRate REAL DEFAULT 16", (err)=>{});
            db.run("ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0", (err)=>{});
            db.run("ALTER TABLE sales ADD COLUMN discount REAL DEFAULT 0", (err)=>{});
            db.run("ALTER TABLE sales ADD COLUMN tax REAL DEFAULT 0", (err)=>{});`;

server = server.replace(initDbStr, initDbStrNew);

// 2. Pharmacy Print/Settings Endpoint
// Look for print-settings PUT
const putPrintSettingsRegex = /app\.put\("\/api\/pharmacies\/:id\/print-settings", \(req, res\) => \{[\s\S]*?\}\);\n/g;
const newPutPrintSettings = `app.put("/api/pharmacies/:id/print-settings", (req, res) => {
  const { id } = req.params;
  const { receiptFooter, printerSize, showLogo, enableTax, taxRate } = req.body;
  db.run(
    "UPDATE pharmacies SET receiptFooter = ?, printerSize = ?, showLogo = ?, enableTax = ?, taxRate = ? WHERE id = ?",
    [receiptFooter, printerSize || "80mm", showLogo ? 1 : 0, enableTax ? 1 : 0, taxRate || 0, id],
    function (err) {
      if (err) return handleError(res, err);
      res.json({ success: true });
    },
  );
});\n`;
if (putPrintSettingsRegex.test(server)) {
    server = server.replace(putPrintSettingsRegex, newPutPrintSettings);
} else {
    console.log("Could not patch print-settings PUT!");
}

// 3. Sales POST Endpoint
const postSalesRegex = /app\.post\("\/api\/pharmacies\/:id\/sales", \(req, res\) => \{[\s\S]*?INSERT INTO sales \(id, pharmacy_id, items, total, paymentMethod, customer, date, cashierName, branchName, notes\)[\s\S]*?VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?\)",[\s\S]*?req\.body\.notes \|\| null,[\s\S]*?\],/g;
const newPostSales = `app.post("/api/pharmacies/:id/sales", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { items, paymentMethod, customerId, date, subtotal, discount, tax, total } = req.body;
  const saleId = req.body.id || "INV-" + Date.now();

  const customerObj = customerId
    ? JSON.stringify({
        id: customerId,
        name: req.body.customerName || "Unknown",
      })
    : null;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const cashierName = req.body.cashierName || "System";
    const branchName = req.body.branchName || "all";
    
    // First, verify we have the new columns, fallback if not
    db.run(
      \`INSERT INTO sales (id, pharmacy_id, items, subtotal, discount, tax, total, paymentMethod, customer, date, cashierName, branchName, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
      [
        saleId,
        pharmacy_id,
        JSON.stringify(items),
        subtotal || 0,
        discount || 0,
        tax || 0,
        total || req.body.total || 0,
        paymentMethod || "cash",
        customerObj,
        date,
        cashierName,
        branchName,
        req.body.notes || null,
      ],`;

if(postSalesRegex.test(server)) {
    server = server.replace(postSalesRegex, newPostSales);
} else {
    console.log("Could not patch sales POST!");
}

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched server.js schema and endpoints!");
