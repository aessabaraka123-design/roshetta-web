const fs = require('fs');
let content = fs.readFileSync('web/src/app/notifs/page.tsx', 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('web/src/app/notifs/page.tsx', content, 'utf8');
console.log('Fixed syntax error in notifs page');
