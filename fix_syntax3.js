const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace(/console\.log\(\? Local Backup completed successfully: \);/g, 'console.log("? Local Backup completed successfully: " + backupFileName);');
code = code.replace(/console\.error\("\? Local Backup failed:", err\);/g, 'console.error("? Local Backup failed:", err);');
code = code.replace(/if \(!err\) console\.log\(".*? Deleted old local backup: " \+ file\);/g, 'if (!err) console.log("??? Deleted old local backup: " + file);');
code = code.replace(/console\.error\("\? Telegram Backup failed:", error\.message\);/g, 'console.error("? Telegram Backup failed:", error.message);');
code = code.replace(/console\.log\("\? Starting daily backup..."\);/g, 'console.log("? Starting daily backup...");');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Fixed totally!");
