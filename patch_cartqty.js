const fs = require('fs');
let code = fs.readFileSync('superadmin/assets/app.js', 'utf8');

code = code.replace(/\$\{item\.qty \|\| 1\}/g, "${item.cartQty || item.quantity || item.qty || 1}");

fs.writeFileSync('superadmin/assets/app.js', code, 'utf8');
console.log('Fixed cartQty mapping.');
