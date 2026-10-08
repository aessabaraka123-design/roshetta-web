const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const injection = `// Update existing subscription request (from read-only mode)
app.get("/api/pharmacies/:id/subscription-status", (req, res) => {
  const { id: pharmacy_id } = req.params;
  db.get(
    "SELECT status FROM subscription_requests WHERE pharmacy_id = ? ORDER BY createdAt DESC LIMIT 1",
    [pharmacy_id],
    (err, row) => {
      if (err) return handleError(res, err);
      db.get("SELECT whatsappNumber FROM admin_settings LIMIT 1", (err2, settings) => {
        let whatsapp = "972590000000";
        if (settings && settings.whatsappNumber) {
          whatsapp = settings.whatsappNumber.replace(/[^0-9+]/g, '');
        }
        res.json({ success: true, status: row ? row.status : null, whatsapp });
      });
    }
  );
});

app.put("/api/pharmacies/:id/subscription-request",`;

const regexString = "// Update existing subscription request \\(from read-only mode\\)[\\s\\S]*?app\\.put\\(\"/api/pharmacies/:id/subscription-request\",";
const regex = new RegExp(regexString);

if (!server.includes('app.get("/api/pharmacies/:id/subscription-status"')) {
  if (regex.test(server)) {
    server = server.replace(regex, injection);
    fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
    console.log('Successfully injected subscription-status with WhatsApp!');
  } else {
    console.log('Regex did not match.');
  }
} else {
  console.log('Endpoint already exists');
}
