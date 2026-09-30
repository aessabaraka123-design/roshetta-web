const fs = require('fs');
let code = fs.readFileSync('C:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_server/server.js', 'utf8');

const target = 'const handleNotFound = (res) =>';
const insert = pp.post("/api/admin/backup", (req, res) => {
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = "manual_backup_" + date + "_" + time + ".sqlite";
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.copyFile(path.join(__dirname, "roshetta.db"), backupFilePath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    sendBackupToTelegram(backupFilePath, backupFileName);
    res.json({ success: true, message: "Backup requested successfully." });
  });
});

const handleNotFound = (res) =>;

code = code.replace(target, insert);

fs.writeFileSync('C:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_server/server.js', code, 'utf8');
