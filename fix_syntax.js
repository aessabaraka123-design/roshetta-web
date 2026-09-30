const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const stray = `
  // ==========================================
  // Smart Purchases
  // ==========================================
});`;

const fix = `
  // ==========================================
  // Smart Purchases
  // ==========================================`;

if (code.includes(stray)) {
  code = code.replace(stray, fix);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log('Fixed stray syntax error.');
} else {
  console.log('Stray syntax error not found.');
}
