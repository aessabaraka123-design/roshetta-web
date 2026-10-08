const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const checkEmailAPI = `
app.post("/api/auth/check-email", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });
  db.get("SELECT email FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (row) {
      return res.json({ exists: true });
    }
    return res.json({ exists: false });
  });
});
`;

if (!server.includes('/api/auth/check-email')) {
  server = server.replace('app.post("/api/auth/register", (req, res) => {', checkEmailAPI + '\napp.post("/api/auth/register", (req, res) => {');
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log('Added check-email endpoint to server.js');
} else {
  console.log('check-email endpoint already exists');
}
