const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace(/await axios\.post\(https:\/\/api\.telegram\.org\/bot\/sendDocument, form, \{/g, 'await axios.post("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendDocument", form, {');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Fixed totally!");
