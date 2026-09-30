const fs = require('fs');
let serverJs = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Declare GLOBAL_MAINTENANCE and fetch it
const dbInitTarget = `  const db = new sqlite3.Database(dbPath, (err) => {`;
const dbInitReplacement = `
let GLOBAL_MAINTENANCE = false;

  const db = new sqlite3.Database(dbPath, (err) => {`;
serverJs = serverJs.replace(dbInitTarget, dbInitReplacement);

const insertSettingsTarget = `                    db.run(
                      "INSERT INTO admin_settings (id, adminEmail, adminPassword, systemName, isMaintenance, monthlyPrice, annualPrice, lifetimePrice) VALUES (1, 'admin@roshetta.com', 'admin123', 'نظام روشتة', 0, 49, 499, 1499)",
                    );
                  }
                },
              );`;
// Let's just find the end of db.serialize inside app.listen? No, at the end of db.serialize initialization.
const dbSerializeEndTarget = `      });
  });
  
  app.use("/api/pharmacies", (req, res, next) => {`;
const dbSerializeEndReplacement = `
        db.get("SELECT isMaintenance FROM admin_settings WHERE id = 1", (err, row) => {
          if (row) GLOBAL_MAINTENANCE = row.isMaintenance === 1;
        });
      });
  });

  app.use((req, res, next) => {
    if (GLOBAL_MAINTENANCE) {
      if (req.path.startsWith("/api/admin")) return next();
      if (req.path === "/api/auth/login") return next(); // Handled inside login
      return res.status(503).json({ success: false, error: "النظام حالياً في وضع الصيانة المغلق للتحديثات. يرجى المحاولة لاحقاً.", isMaintenance: true });
    }
    next();
  });
  
  app.use("/api/pharmacies", (req, res, next) => {`;
serverJs = serverJs.replace(dbSerializeEndTarget, dbSerializeEndReplacement);

// Wait, the previous replacement might fail if the regex/string is not exact. I'll use regex for the end target.
const regexSerialize = /\s*\}\);\n\s*\}\);\n\s*app\.use\("\/api\/pharmacies", \(req, res, next\) => \{/;
if (!regexSerialize.test(serverJs)) {
    console.log("Could not find serialize end");
}

// 2. Update GLOBAL_MAINTENANCE on save settings
const updateSettingsTarget = `const maintenanceVal = isMaintenance ? 1 : 0;
  db.run(
    \`UPDATE admin_settings SET `;
const updateSettingsReplacement = `const maintenanceVal = isMaintenance ? 1 : 0;
  GLOBAL_MAINTENANCE = maintenanceVal === 1;
  db.run(
    \`UPDATE admin_settings SET `;
serverJs = serverJs.replace(updateSettingsTarget, updateSettingsReplacement);

// 3. Update login route
const loginTarget = `      if (admin) {
        return res.json({
          success: true,
          user: {`;
const loginReplacement = `      if (admin) {
        return res.json({
          success: true,
          user: {`;

const afterAdminCheckTarget = `        }
      db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",`;

const afterAdminCheckReplacement = `        }
      
      if (GLOBAL_MAINTENANCE) {
        return res.status(503).json({ success: false, error: "النظام حالياً في وضع الصيانة المغلق للتحديثات. يرجى المحاولة لاحقاً.", isMaintenance: true });
      }

      db.get(
        "SELECT * FROM users WHERE email = ? AND password = ?",`;
serverJs = serverJs.replace(afterAdminCheckTarget, afterAdminCheckReplacement);

fs.writeFileSync('roshetta_server/server.js', serverJs);
console.log("Maintenance mode backend logic added.");
