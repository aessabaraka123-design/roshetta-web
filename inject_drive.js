const fs = require("fs");
let code = fs.readFileSync("roshetta_server/server.js", "utf-8");

const backupCode = `
// ==========================================
// Automated Backup System (Google Drive + Local)
// ==========================================
const cron = require("node-cron");
const { google } = require("googleapis");
const credentials = require("./credentials.json");

const FOLDER_ID = "1ME-haVpIjlbvbg4GTJHXMZ6hcNXmQoVq";
const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Helper function to upload to Drive
async function uploadToDrive(filePath, fileName) {
  try {
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"]
    });
    await jwtClient.authorize();
    const drive = google.drive({ version: "v3", auth: jwtClient });
    
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };
    const media = {
      mimeType: "application/x-sqlite3",
      body: fs.createReadStream(filePath),
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });
    console.log("✅ Backup uploaded to Google Drive. File ID:", response.data.id);
  } catch (error) {
    console.error("❌ Drive Upload failed:", error.message);
  }
}

// Run backup every day at midnight (00:00)
cron.schedule("0 0 * * *", () => {
  console.log("⏳ Starting daily backup...");
  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toTimeString().split(" ")[0].replace(/:/g, "-");
  const backupFileName = \`database_backup_\${date}_\${time}.sqlite\`;
  const backupFilePath = path.join(backupDir, backupFileName);
  
  fs.copyFile(path.join(__dirname, "database.sqlite"), backupFilePath, (err) => {
    if (err) {
      console.error("❌ Local Backup failed:", err);
    } else {
      console.log(\`✅ Local Backup completed successfully: \${backupFileName}\`);
      
      // Upload to Drive
      uploadToDrive(backupFilePath, backupFileName);
      
      // Auto-cleanup: Delete backups older than 7 days
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
                if (!err) console.log(\`🗑️ Deleted old local backup: \${file}\`);
              });
            }
          });
        });
      });
    }
  });
});
`;

code = code.replace(/(\/\/ ==========================================\n\/\/ Automated Backup System \(Cron\)\n\/\/ ==========================================\n[\s\S]*?\}\);\n\}\);\n\}\);\n)/, backupCode);
fs.writeFileSync("roshetta_server/server.js", code, "utf-8");
console.log("Done");

