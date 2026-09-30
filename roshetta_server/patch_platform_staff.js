const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("roshetta.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS platform_staff (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT * FROM admin_settings WHERE id = 1", (err, admin) => {
    if (err) {
      console.error(err);
      return;
    }
    if (admin) {
      db.get("SELECT * FROM platform_staff WHERE role = 'owner'", (err, owner) => {
        if (!owner) {
          db.run(
            `INSERT INTO platform_staff (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
            ['superadmin-owner', admin.systemName || 'المدير العام', admin.adminEmail, admin.adminPassword, 'owner'],
            (err) => {
              if (err) console.error("Error migrating owner:", err);
              else console.log("Owner migrated successfully.");
            }
          );
        } else {
          console.log("Owner already exists in platform_staff.");
        }
      });
    }
  });
});

setTimeout(() => db.close(), 1000);
