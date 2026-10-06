const fs = require('fs');
let c = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

c = c.replace(
  '📄 راجع إيصالك',
  '📄 {language === "en" ? "Review Receipt" : "راجع إيصالك"}'
);

fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', c, 'utf8');
console.log('Fixed receipt button translation');
