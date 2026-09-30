const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const correctCode = \
// ==========================================
// Automated Backup System (Telegram + Local)
// ==========================================
const cron = require("node-cron");
const axios = require("axios");
const FormData = require("form-data");
const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const TELEGRAM_BOT_TOKEN = "8595340052:AAG-BJlDwY00jt4rK30Z4Oe6rnQEjBqY6mk";
const TELEGRAM_CHAT_ID = "5301822155";

async function sendBackupToTelegram(filePath, fileName) {
  try {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("document", fs.createReadStream(filePath), fileName);
    form.append("caption", "?? åÐå äÓÎÉ ÇÍÊíÇØíÉ ãÌÏæáÉ\\n?? ÇáÊÇÑíÎ: " + new Date().toLocaleString("ar-EG"));
    
    await axios.post("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendDocument", form, {
      headers: form.getHeaders(),
    });
    console.log("? Backup sent to Telegram successfully!");
  } catch (error) {
    console.error("? Telegram Backup failed:", error.message);
  }
}

// Run backup every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  console.log("? Starting daily backup...");
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = "database_backup_" + date + "_" + time + ".sqlite";
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.copyFile(path.join(__dirname, "roshetta.db"), backupFilePath, (err) => {
    if (err) {
      console.error("? Local Backup failed:", err);
    } else {
      console.log("? Local Backup completed successfully: " + backupFileName);
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
                if (!err) console.log("??? Deleted old local backup: " + file);
              });
            }
          });
        });
      });
    }
  });
});
\;

// Replace everything from the comment down to the end of the cron block
code = code.replace(/\/\/ ==========================================\r?\n\/\/ Automated Backup System[\s\S]*\}\);\r?\n\}\);\r?\n/g, correctCode + '\n');
fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Fixed totally!");
