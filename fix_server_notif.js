const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Fix low_stock
code = code.replace(/type: "low_stock",\s*title: ".*?","/g, 'type: "low_stock",\n        emoji: "⚠️",\n        title: "نقص في المخزون",');
// Fix expiring
code = code.replace(/type: "expiring",\s*title: ".*?","/g, 'type: "expiring",\n        emoji: "⚠️",\n        title: "صنف قارب على الانتهاء",');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
