const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /setCartItems\(JSON\.parse\(inv\.items \|\| "\[\]"\)\);/;
if (regex.test(code)) {
  code = code.replace(regex, 'setCartItems(typeof inv.items === "string" ? JSON.parse(inv.items || "[]") : (inv.items || []));');
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully fixed JSON.parse error!');
} else {
  console.log('Could not find setCartItems regex');
}
