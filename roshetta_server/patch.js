const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Fix CREATE TABLE
code = code.replace(
  /CREATE TABLE IF NOT EXISTS purchase_invoices \([\s]*id TEXT PRIMARY KEY,/,
  'CREATE TABLE IF NOT EXISTS purchase_invoices (\n      id TEXT PRIMARY KEY,\n      status TEXT DEFAULT \'completed\','
);

// 2. Fix POST /api/pharmacies/:id/purchase-invoices
const newPost = `app.post("/api/pharmacies/:id/purchase-invoices", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { supplier_id, supplier_name, items, total_cost, paid_amount, invoice_number, notes, branch_id, status } = req.body;
  const invId = "PINV-" + Date.now();
  const date = new Date().toISOString();
  const remaining = (total_cost || 0) - (paid_amount || 0);
  const invStatus = status || 'completed';
  
  db.run(
    "INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [invId, pharmacy_id, supplier_id || "", supplier_name, JSON.stringify(items || []), total_cost, paid_amount || 0, remaining, invoice_number || "", date, notes || "", branch_id || null, invStatus],
    function (err) {
      if (err) return handleError(res, err);
      if (invStatus === 'completed') {
        (items || []).forEach((item) => {
          db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
        });
        if (supplier_id && remaining > 0) {
          db.run("UPDATE suppliers SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND pharmacy_id = ?", [remaining, supplier_id, pharmacy_id]);
        }
      }
      res.json({ success: true, id: invId });
    }
  );
});

app.put("/api/pharmacies/:id/purchase-invoices/:invId/complete", (req, res) => {
  const { id: pharmacy_id, invId } = req.params;
  db.get("SELECT * FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?", [invId, pharmacy_id], (err, invoice) => {
    if (err) return handleError(res, err);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (invoice.status === 'completed') return res.json({ success: true });
    
    db.run("UPDATE purchase_invoices SET status = 'completed' WHERE id = ? AND pharmacy_id = ?", [invId, pharmacy_id], (err) => {
      if (err) return handleError(res, err);
      try {
        const items = JSON.parse(invoice.items || '[]');
        items.forEach((item) => {
          db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
        });
      } catch(e) {}
      if (invoice.supplier_id && invoice.remaining > 0) {
        db.run("UPDATE suppliers SET balance = COALESCE(balance, 0) + ? WHERE id = ? AND pharmacy_id = ?", [invoice.remaining, invoice.supplier_id, pharmacy_id]);
      }
      res.json({ success: true });
    });
  });
});`;

const postRegex = /app\.post\("\/api\/pharmacies\/:id\/purchase-invoices"[\s\S]*?\/\/.*مستقبلي\)\r?\n\}\);/g;
if(postRegex.test(code)) {
  code = code.replace(postRegex, newPost);
  fs.writeFileSync('server.js', code, 'utf8');
  console.log('Successfully patched server.js!');
} else {
  console.log('Failed to match POST purchase-invoices regex!');
}
`;
