const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const target = 'app.post("/api/pharmacies/:id/purchase-invoices"';
const injection = \pp.get("/api/pharmacies/:id/purchase-invoices", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { branch_id } = req.query;
  let query = "SELECT * FROM purchase_invoices WHERE pharmacy_id = ?";
  let params = [pharmacy_id];
  if (branch_id && branch_id !== 'all') {
    query += " AND branch_id = ?";
    params.push(branch_id);
  }
  query += " ORDER BY date DESC";
  db.all(query, params, (err, rows) => {
    if (err) return handleError(res, err);
    res.json({ success: true, invoices: rows || [] });
  });
});\n\n\ + target;

code = code.replace(target, injection);

// Also modify the POST endpoint to save the branch_id
const postTarget = \    const invId = "PINV-" + Date.now();
    const date = new Date().toISOString();
    const remaining = (total_cost || 0) - (paid_amount || 0);
    db.run(
      \\\INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\\,
      [
        invId,
        pharmacy_id,
        supplier_id || "",
        supplier_name,
        JSON.stringify(items || []),
        total_cost,
        paid_amount || 0,
        remaining,
        invoice_number || "",
        date,
        notes || "",
      ],\;

const postInjection = \    const { branch_id } = req.body;
    const invId = "PINV-" + Date.now();
    const date = new Date().toISOString();
    const remaining = (total_cost || 0) - (paid_amount || 0);
    db.run(
      \\\INSERT INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\\\,
      [
        invId,
        pharmacy_id,
        supplier_id || "",
        supplier_name,
        JSON.stringify(items || []),
        total_cost,
        paid_amount || 0,
        remaining,
        invoice_number || "",
        date,
        notes || "",
        branch_id || null,
      ],\;
      
code = code.replace(postTarget, postInjection);

fs.writeFileSync('roshetta_server/server.js', code);
console.log('Done!');
