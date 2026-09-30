const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');
db.run("INSERT OR REPLACE INTO admin_settings (id, adminEmail, adminPassword, systemName, isMaintenance) VALUES (1, 'admin@roshetta.com', 'admin123', 'روشتة', 0)", (err) => {
  if (err) console.error(err);
  else console.log("Admin seeded!");
});
