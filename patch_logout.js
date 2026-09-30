const fs = require('fs');
let text = fs.readFileSync('superadmin/assets/app.js', 'utf8');

text = text.replace(
  'function logout() {',
  'function logout() {\\n  tab(\\'dashboard\\');'
);

fs.writeFileSync('superadmin/assets/app.js', text);
