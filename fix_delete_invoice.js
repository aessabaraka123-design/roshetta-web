const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldDelete = `app.delete("/api/pharmacies/:id/purchase-invoices/:invId", (req, res) => {
    const { id: pharmacy_id, invId } = req.params;
    db.run(
      "DELETE FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?",
      [invId, pharmacy_id],
      function (err) {
        if (err) return handleError(res, err);
        res.json({
          success: true,
        });
      },
    );`;

const newDelete = `app.delete("/api/pharmacies/:id/purchase-invoices/:invId", (req, res) => {
    const { id: pharmacy_id, invId } = req.params;
    db.get("SELECT * FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?", [invId, pharmacy_id], (err, invoice) => {
      if (err) return handleError(res, err);
      if (!invoice) return res.json({ success: true });
      
      if (invoice.status === 'completed') {
        try {
          const items = JSON.parse(invoice.items || '[]');
          items.forEach((item) => {
            db.run("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
          });
          if (invoice.supplier_id && invoice.remaining > 0) {
            db.run("UPDATE suppliers SET balance = MAX(0, COALESCE(balance, 0) - ?) WHERE id = ? AND pharmacy_id = ?", [invoice.remaining, invoice.supplier_id, pharmacy_id]);
          }
        } catch(e) {}
      }

      db.run("DELETE FROM purchase_invoices WHERE id = ? AND pharmacy_id = ?", [invId, pharmacy_id], function (err) {
        if (err) return handleError(res, err);
        res.json({ success: true });
      });
    });`;

if (code.includes(oldDelete)) {
  code = code.replace(oldDelete, newDelete);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log('Successfully patched DELETE endpoint in server.js');
} else {
  // try regex for weird whitespace
  const delRegex = /app\.delete\("\/api\/pharmacies\/:id\/purchase-invoices\/:invId", \(req, res\) => \{[\s\S]*?db\.run\([\s\S]*?"DELETE FROM purchase_invoices WHERE id = \? AND pharmacy_id = \?",[\s\S]*?\[invId, pharmacy_id\],[\s\S]*?function \(err\) \{[\s\S]*?if \(err\) return handleError\(res, err\);[\s\S]*?res\.json\(\{[\s\S]*?success: true,[\s\S]*?\}\);[\s\S]*?\},[\s\S]*?\);/m;
  
  if (delRegex.test(code)) {
    code = code.replace(delRegex, newDelete);
    fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
    console.log('Successfully patched DELETE endpoint in server.js (Regex)');
  } else {
    console.log('Failed to match DELETE endpoint in server.js');
  }
}
