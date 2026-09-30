const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const TELEGRAM_BOT_TOKEN = "8595340052:AAG-BJlDwY00jt4rK30Z4Oe6rnQEjBqY6mk";
const TELEGRAM_CHAT_ID = "5301822155";

async function sendBackupToTelegram() {
  try {
    const form = new FormData();
    form.append("chat_id", TELEGRAM_CHAT_ID);
    form.append("document", fs.createReadStream(path.join(__dirname, "database.sqlite")), "database_backup_test.sqlite");
    form.append("caption", "📦 هذه نسخة احتياطية تجريبية للبرنامج!\nتأكيداً لنجاح ربط النظام.\n\n⏰ التاريخ: " + new Date().toLocaleString("ar-EG"));
    
    await axios.post("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendDocument", form, {
      headers: form.getHeaders(),
    });
    console.log("✅ Backup sent to Telegram successfully!");
  } catch (error) {
    console.error("❌ Telegram Backup failed:", error.message);
  }
}

sendBackupToTelegram();

