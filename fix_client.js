const fs = require('fs');

let files = ['web/src/app/pos/page.tsx', 'web/src/app/register/page.tsx'];
files.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace('export const dynamic = "force-dynamic";\n', '');
    c = c.replace('"use client";', '"use client";\n\nexport const dynamic = "force-dynamic";');
    fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed use client placement');
