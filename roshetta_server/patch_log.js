const fs = require('fs');
let file = fs.readFileSync('server.js', 'utf8');

file = file.replace(
  /const { email, password, role } = req\.body;\s*db\.get\("SELECT \* FROM admin_settings WHERE id = 1", \[\], \(err, admin\) => {/,
  `const { email, password, role } = req.body;
    db.get("SELECT * FROM admin_settings WHERE id = 1", [], (err, admin) => {
      console.log("LOGIN ATTEMPT:", {err, admin, reqEmail: email, reqPass: password});`
);

fs.writeFileSync('server.js', file);
