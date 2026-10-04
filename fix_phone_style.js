const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /style=\{errors\.phone \? \{ borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba\(239, 68, 68, 0\.15\)' \} : \{\}\}\s*onChange=\{\(e\) => \{([\s\S]*?)\}\}\s*style=\{\{ flex: 1 \}\}/,
  `onChange={(e) => {$1}}\n                        style={{ flex: 1, ...(errors.phone ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}) }}`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Fixed phone input style merging');
