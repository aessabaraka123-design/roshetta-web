const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const FOLDER_ID = "1ME-haVpIjlbvbg4GTJHXMZ6hcNXmQoVq";
const key = require("./credentials.json");

async function uploadBackup() {
  try {
    const jwtClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"]
    });
    
    await jwtClient.authorize();
    const drive = google.drive({ version: "v3", auth: jwtClient });
    
    const testFilePath = path.join(__dirname, "test_backup.txt");
    fs.writeFileSync(testFilePath, "This is a test backup from Roshetta Server.");

    const fileMetadata = {
      name: "test_backup.txt",
      parents: [FOLDER_ID],
    };
    
    const media = {
      mimeType: "text/plain",
      body: fs.createReadStream(testFilePath),
    };

    console.log("Starting upload...");
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log("✅ File uploaded successfully. File ID:", response.data.id);
    fs.unlinkSync(testFilePath);
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
  }
}

uploadBackup();

