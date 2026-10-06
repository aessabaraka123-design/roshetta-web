const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  'placeholder="{language === "en" ? "Optional" : "اختياري"}"',
  'placeholder={language === "en" ? "Optional" : "اختياري"}'
);

c = c.replace(
  'placeholder="{language === "en" ? "Search and add item..." : "...ابحث عن صنف وأضفه"}"',
  'placeholder={language === "en" ? "Search and add item..." : "...ابحث عن صنف وأضفه"}'
);

// wait, are there any others?
// "اختياري"
// "...ابحث عن صنف وأضفه"
// These are the only placeholders I replaced. 

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed quotes');
