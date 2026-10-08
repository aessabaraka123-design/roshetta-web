const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.resolve(__dirname, 'roshetta.db'));

db.run("UPDATE admin_settings SET adminEmail = 'admin@roshetta.com', adminPassword = 'admin123' WHERE id = 1", (err) => {
  if (err) console.error("Error updating:", err);
  else {
    db.get("SELECT adminEmail, adminPassword FROM admin_settings WHERE id = 1", (err2, row) => {
      console.log("Updated admin:", row);
    });
  }
});
