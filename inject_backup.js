const fs = require("fs");
let code = fs.readFileSync("roshetta_server/server.js", "utf-8");

const backupCode = `
// ==========================================
// Automated Backup System (Cron)
// ==========================================
const cron = require("node-cron");
const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Run backup every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = \`database_backup_\${date}_\${time}.sqlite\`;
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.copyFile(path.join(__dirname, "database.sqlite"), backupFilePath, (err) => {
    if (err) {
      console.error("❌ Backup failed:", err);
    } else {
      console.log(\`✅ Backup completed successfully: \${backupFileName}\`);
      
      // Auto-cleanup: Delete backups older than 7 days
      fs.readdir(backupDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        files.forEach((file) => {
          const filePath = path.join(backupDir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtime.getTime() > sevenDays) {
              fs.unlink(filePath, (err) => {
                if (!err) console.log(\`🗑️ Deleted old backup: \${file}\`);
              });
            }
          });
        });
      });
    }
  });
});
`;

code = code.replace("const app = express();", "const app = express();\n" + backupCode);
fs.writeFileSync("roshetta_server/server.js", code, "utf-8");
console.log("Done");

