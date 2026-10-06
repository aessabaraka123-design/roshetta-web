const fs = require('fs');
const filePath = 'web/src/app/admin/page.tsx';
let c = fs.readFileSync(filePath, 'utf8');

c = c.replace(/placeholder=language === "en" \? "([^"]+)" : "([^"]+)"/g, 'placeholder={language === "en" ? "$1" : "$2"}');
// And just in case for values:
c = c.replace(/value=language === "en" \? "([^"]+)" : "([^"]+)"/g, 'value={language === "en" ? "$1" : "$2"}');
// And any other attribute
c = c.replace(/([a-zA-Z]+)=language === "en" \? "([^"]+)" : "([^"]+)"/g, '$1={language === "en" ? "$2" : "$3"}');

fs.writeFileSync(filePath, c, 'utf8');
console.log('Fixed admin syntax error 2');
