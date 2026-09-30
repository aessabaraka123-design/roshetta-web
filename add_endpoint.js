const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const backupFunction = `
async function runBackupTask() {
  console.log("⏳ Starting backup task...");
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = "database_backup_" + date + "_" + time + ".sqlite";
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.copyFile(path.join(__dirname, "roshetta.db"), backupFilePath, (err) => {
    if (err) {
      console.error("❌ Local Backup failed:", err);
    } else {
      console.log("✅ Local Backup completed successfully: " + backupFileName);
      sendBackupToTelegram(backupFilePath, backupFileName);
      fs.readdir(backupDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        files.forEach((file) => {
          if (!file.endsWith(".sqlite")) return;
          const filePath = path.join(backupDir, file);
          fs.stat(filePath, (err, stats) => {
            if (err) return;
            if (now - stats.mtime.getTime() > sevenDays) {
              fs.unlink(filePath, (err) => {
                if (!err) console.log("🗑️ Deleted old local backup: " + file);
              });
            }
          });
        });
      });
    }
  });
}

// Internal Cron Job (might not run if server sleeps)
cron.schedule("0 0 * * *", runBackupTask);

// API Endpoint to trigger backup externally
app.get('/api/backup', (req, res) => {
  runBackupTask();
  res.json({ success: true, message: "Backup triggered in background." });
});
`;

code = code.replace(/cron\.schedule\("0 0 \* \* \*", \(\) => \{[\s\S]*?\}\);\r?\n\}\);\r?\n\}\);\r?\n/, backupFunction);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Endpoint added!");
