const fs = require('fs');

let page = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

page = page.replace(
  /الفروع المستخدمة/,
  '{language === "en" ? "Branches Used" : "الفروع المستخدمة"}'
);

fs.writeFileSync('web/src/app/admin/page.tsx', page, 'utf8');
console.log('Fixed branches used translation');
