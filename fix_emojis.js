const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

// Replace all emoji: "..." lines with safe replacements
code = code.replace(/emoji:\s*"[^"]*",\s*title:\s*require\("\.\.\/i18n"\)\.t\("cloud_sync"\)/g, 'emoji: "☁️",\ntitle: require("../i18n").t("cloud_sync")');
code = code.replace(/emoji:\s*"[^"]*",\s*tone:\s*"amber"/g, 'emoji: "⚠️",\ntone: "amber"');
code = code.replace(/emoji:\s*"[^"]*",\s*tone:\s*"coral"/g, 'emoji: "🚨",\ntone: "coral"');
code = code.replace(/emoji:\s*"[^"]*",\s*title:\s*\$\{item\.name\}  \+ require\("\.\.\/i18n"\)\.t\("out_of_stock"\)/g, 'emoji: "❌",\ntitle: ${item.name}  + require("../i18n").t("out_of_stock")');
code = code.replace(/emoji:\s*"[^"]*",\s*title:\s*\$\{item\.name\}  \+ require\("\.\.\/i18n"\)\.t\("almost_finished"\)/g, 'emoji: "⚠️",\ntitle: ${item.name}  + require("../i18n").t("almost_finished")');

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
