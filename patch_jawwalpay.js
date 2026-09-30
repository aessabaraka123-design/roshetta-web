const fs = require('fs');
let file = './roshetta_server/server.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('pm === "jawwal" || pm === "جوال باي"', 'pm === "jawwal" || pm === "jawwalpay" || pm === "جوال باي"');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed jawwalpay mapping');
