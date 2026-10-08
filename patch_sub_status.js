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
      res.json({ success: true, status: row ? row.status : null });
    }
  );
});

app.put("/api/pharmacies/:id/subscription-request",`;

if (!server.includes('app.get("/api/pharmacies/:id/subscription-status"')) {
  server = server.replace('// Update existing subscription request (from read-only mode)\napp.put("/api/pharmacies/:id/subscription-request",', injection);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log('Added subscription-status endpoint to server.js');
} else {
  console.log('Endpoint already exists');
}
