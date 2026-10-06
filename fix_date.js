const fs = require('fs');
let c = fs.readFileSync('web/src/app/page.tsx', 'utf8');

c = c.replace(/"ar-EG"/g, 'language === "en" ? "en-US" : "ar-EG"');
// Also, let's make sure the formatting of the date is robust
// And if there is any other place where the dash looks weird, maybe the dash should be replaced depending on language? No, dash is universal.

fs.writeFileSync('web/src/app/page.tsx', c, 'utf8');
console.log('Fixed date format locale');
