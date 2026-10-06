const fs = require('fs');
let lines = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8').split('\n');

lines[1009] = '                    {cartItems.length} {language === "en" ? "items added • Click on item to edit quantity and price" : "صنف مضاف • اضغط على الصنف لتعديل الكمية والسعر"}';
lines[1010] = ''; // remove 'والسعر'

fs.writeFileSync('web/src/app/purchases/page.tsx', lines.join('\n'), 'utf8');
console.log('Fixed multiline string');
