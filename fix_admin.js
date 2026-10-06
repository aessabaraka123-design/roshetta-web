const fs = require('fs');
const filePath = 'web/src/app/admin/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace('value=language === "en" ? "Sundries" : "نثريات"', 'value="نثريات"');

fs.writeFileSync(filePath, c, 'utf8');
console.log('Fixed admin syntax error');
