const fs = require('fs');
let c = fs.readFileSync('web/src/app/upgrade-plan/page.tsx', 'utf8');

c = c.replace(
  /const handleUpgrade = \(planName: string\) => \{[\s\S]*?\}\;/m,
  'const handleUpgrade = (planName: string) => {\n    router.push("/receipt-upload");\n  };'
);

fs.writeFileSync('web/src/app/upgrade-plan/page.tsx', c, 'utf8');
console.log('Fixed handleUpgrade in upgrade-plan');
