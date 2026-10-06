const fs = require('fs');

let rcpt = fs.readFileSync('web/src/app/receipt-upload/page.tsx', 'utf8');

rcpt = rcpt.replace(
  /if \(rawPlans\.length > 0\) \{\s*setPlan\(String\(rawPlans\[0\]\.id \|\| rawPlans\[0\]\.type\)\);\s*\}/g,
  `if (rawPlans.length > 0 && !new URLSearchParams(window.location.search).get('plan')) {
            setPlan(String(rawPlans[0].id || rawPlans[0].type));
          }`
);

fs.writeFileSync('web/src/app/receipt-upload/page.tsx', rcpt, 'utf8');
console.log('Fixed plan overwrite issue');
