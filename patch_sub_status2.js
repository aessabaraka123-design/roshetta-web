const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldEndpoint = `app.get("/api/pharmacies/:id/subscription-status", (req, res) => {
  const { id: pharmacy_id } = req.params;
  db.get(
    "SELECT status FROM subscription_requests WHERE pharmacy_id = ? ORDER BY createdAt DESC LIMIT 1",
    [pharmacy_id],
    (err, row) => {
      if (err) return handleError(res, err);
      res.json({ success: true, status: row ? row.status : null });
    }
  );
});`;

const newEndpoint = `app.get("/api/pharmacies/:id/subscription-status", (req, res) => {
  const { id: pharmacy_id } = req.params;
  db.get(
    "SELECT status FROM subscription_requests WHERE pharmacy_id = ? ORDER BY createdAt DESC LIMIT 1",
    [pharmacy_id],
    (err, row) => {
      if (err) return handleError(res, err);
      db.get("SELECT whatsappNumber FROM admin_settings LIMIT 1", (err2, settings) => {
        let whatsapp = "972590000000";
        if (settings && settings.whatsappNumber) {
          whatsapp = settings.whatsappNumber.replace(/[^0-9]/g, '');
        }
        res.json({ success: true, status: row ? row.status : null, whatsapp });
      });
    }
  );
});`;

if (server.includes(oldEndpoint)) {
  server = server.replace(oldEndpoint, newEndpoint);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log('Successfully updated subscription-status to include whatsappNumber');
} else {
  console.log('Endpoint not found');
}
