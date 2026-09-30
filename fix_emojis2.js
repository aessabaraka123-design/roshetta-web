const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

code = code.replace(/emoji: ".*?",/g, 'emoji: "⚠️",'); // Default everything to warning emoji

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
