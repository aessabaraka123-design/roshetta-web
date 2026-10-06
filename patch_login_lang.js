const fs = require('fs');
let c = fs.readFileSync('web/src/app/login/page.tsx', 'utf8');

c = c.replace(
  'const loginFn = useStore((state) => state.login);',
  'const loginFn = useStore((state) => state.login);\n  const language = useStore((state: any) => state.language);'
);

fs.writeFileSync('web/src/app/login/page.tsx', c, 'utf8');
console.log('Fixed language ReferenceError in login/page.tsx');
