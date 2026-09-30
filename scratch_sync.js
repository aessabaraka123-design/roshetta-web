const fs = require('fs');

let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const startIdx = code.indexOf('app.post("/api/pharmacies/:id/purchases",');
const endIdx = code.indexOf('app.get("/api/pharmacies/:id/batches"');

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end index!");
  process.exit(1);
}

const replacement = `app.post("/api/pharmacies/:id/purchases", (req, res) => {
  const { id } = req.params;
  const { supplier_id, supplier_name, items, total_cost, branch } = req.body;
  
  const invId = req.body.id || "PINV-" + Date.now();
  const date = new Date().toISOString();
  
  db.run(
    "INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [invId, id, supplier_id || "", supplier_name, JSON.stringify(items || []), total_cost, 0, total_cost, "", date, "", branch || "Main", "draft"],
    function (err) {
      if (err) return handleError(res, err);
      res.json({ success: true, id: invId });
    }
  );
});

app.delete("/api/pharmacies/:id/purchases/:orderId", (req, res) => {
  const { id, orderId } = req.params;
  db.get("SELECT status FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?", [orderId, id], (err, row) => {
    if (err) return handleError(res, err);
    if (row && row.status === "completed") return res.status(400).json({ success: false, error: "Cannot delete completed invoice" });
    db.run("DELETE FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?", [orderId, id], (err2) => {
      if (err2) return handleError(res, err2);
      res.json({ success: true });
    });
  });
});

app.put("/api/pharmacies/:id/purchases/:orderId", async (req, res) => {
  const { id, orderId } = req.params;
  const { status, items, supplierInvoiceNumber } = req.body;
  
  if (items && items.length > 0) {
    const total_cost = items.reduce((acc, i) => acc + i.qty * (i.cost || 0), 0);
    await new Promise((resolve) => {
      db.run("UPDATE purchase_invoices SET items = ?, total_cost = ?, remaining = ?, invoice_number = ? WHERE id = ? AND pharmacy_id = ?", 
        [JSON.stringify(items), total_cost, total_cost, supplierInvoiceNumber || "", orderId, id], resolve);
    });
  }

  if (status === "received") {
    try {
      const port = process.env.PORT || 3001;
      const resp = await fetch(\`http://localhost:\${port}/api/pharmacies/\${id}/purchase-invoices/\${orderId}/complete\`, { method: "PUT" });
      const data = await resp.json();
      if (!data.success) return res.status(500).json({ success: false, error: data.error });
      return res.json({ success: true });
    } catch(e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  } else {
    res.json({ success: true });
  }
});

`;

code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
fs.writeFileSync('roshetta_server/server.js', code);
console.log("Successfully replaced backend endpoints.");
