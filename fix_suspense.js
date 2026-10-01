const fs = require('fs');

// 1. pos/page.tsx
let f1 = 'web/src/app/pos/page.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace('export const dynamic = "force-dynamic";', ''); // remove old mistake
c1 = c1.replace('import { useSearchParams', 'import { Suspense } from "react";\nimport { useSearchParams');
c1 = c1.replace('export default function POS() {', 'function POSContent() {');
c1 += '\n\nexport default function POS() {\n  return (\n    <Suspense fallback={<div className="p-8 text-center text-ink-soft">جاري التحميل...</div>}>\n      <POSContent />\n    </Suspense>\n  );\n}\n';
fs.writeFileSync(f1, c1, 'utf8');

// 2. register/page.tsx
let f2 = 'web/src/app/register/page.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace('export const dynamic = "force-dynamic";', ''); // remove old mistake
c2 = c2.replace('import { useSearchParams', 'import { Suspense } from "react";\nimport { useSearchParams');
c2 = c2.replace('export default function RegisterPage() {', 'function RegisterPageContent() {');
c2 += '\n\nexport default function RegisterPage() {\n  return (\n    <Suspense fallback={<div className="p-8 text-center text-ink-soft">جاري التحميل...</div>}>\n      <RegisterPageContent />\n    </Suspense>\n  );\n}\n';
fs.writeFileSync(f2, c2, 'utf8');

console.log('Wrapped with Suspense');
