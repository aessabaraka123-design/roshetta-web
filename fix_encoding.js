const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');
code = code.replace(/form\.append\("caption",.*?\);/, 'form.append("caption", "?? Â–Â ‰”Œ… «Õ Ì«ÿÌ… „ÃœÊ·…\\n?? «· «—ÌŒ: " + new Date().toLocaleString("ar-EG"));');
code = code.replace(/console\.log\(\?\? Local Backup completed successfully: \);/g, 'console.log("? Local Backup completed successfully: " + backupFileName);');
code = code.replace(/console\.error\("\? Local Backup failed:", err\);/g, 'console.error("? Local Backup failed:", err);');
fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Fixed!");
