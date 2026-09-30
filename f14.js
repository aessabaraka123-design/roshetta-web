const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');
code = code.replace(/emoji:\s*'.*?',/, "emoji: '🔄',");
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
