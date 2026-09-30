const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

// Replace the AlwaysData URL with the local IP
code = code.replace(/export const API_BASE = 'https:\/\/aessaaessa\.alwaysdata\.net';/g, "export const API_BASE = 'http://10.88.52.212:3001';");

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
console.log('Done replacing API_BASE');
