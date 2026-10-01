const fs = require('fs');

let f2 = 'web/src/app/register/page.tsx';
let c2 = fs.readFileSync(f2, 'utf8');

// Replace original `export default function Register() {` with `function RegisterPageContent() {`
c2 = c2.replace('export default function Register() {', 'function RegisterPageContent() {');

// Remove duplicate `export default function RegisterPage()` blocks if any
const duplicateRegex = /export default function RegisterPage\(\) \{\s+return \(\s+<Suspense fallback=\{<div className="p-8 text-center text-ink-soft">جاري التحميل...<\/div>\}>\s+<RegisterPageContent \/>\s+<\/Suspense>\s+\);\s+\}/g;
let matchCount = (c2.match(duplicateRegex) || []).length;
if (matchCount > 1) {
    c2 = c2.replace(duplicateRegex, (match, offset, str) => {
        // Only replace the first occurrence (or last, let's just keep one at the end)
        return '';
    });
    c2 += '\n\nexport default function RegisterPage() {\n  return (\n    <Suspense fallback={<div className="p-8 text-center text-ink-soft">جاري التحميل...</div>}>\n      <RegisterPageContent />\n    </Suspense>\n  );\n}\n';
}

fs.writeFileSync(f2, c2, 'utf8');

let f3 = 'web/next.config.ts';
let c3 = fs.readFileSync(f3, 'utf8');
c3 = c3.replace(/,\n  eslint: \{\n    \/\/ Warning: This allows production builds to successfully complete even if\n    \/\/ your project has ESLint errors.\n    ignoreDuringBuilds: true,\n  \}/g, '');
fs.writeFileSync(f3, c3, 'utf8');

console.log('Fixed syntax and config');
