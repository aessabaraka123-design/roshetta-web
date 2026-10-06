const fs = require('fs');
let c = fs.readFileSync('web/src/components/AppBar.tsx', 'utf8');

c = c.replace('عرض كل الإشعارات', '{language === "en" ? "View all notifications" : "عرض كل الإشعارات"}');

fs.writeFileSync('web/src/components/AppBar.tsx', c, 'utf8');
console.log('Fixed AppBar notifications text');
