const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// Using inline styles to bypass Tailwind constraints and force an absolute explicit height bounded strictly by the screen.

// Replace line 288-290
code = code.replace(
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">',
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">'
);

code = code.replace(
  '<div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-full h-[750px] max-h-full flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden">',
  '<div className="relative bg-white rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden" style={{ height: "min(85vh, 750px)" }}>'
);

// Search bar: Ensure shrink-0 is there. It already is in our last script, but let's double check.
if (!code.includes('<div className="px-4 py-3 border-b border-mint-line bg-white shrink-0">')) {
    code = code.replace('<div className="px-4 py-3 border-b border-mint-line bg-white">', '<div className="px-4 py-3 border-b border-mint-line bg-white shrink-0">');
}

// Footer: Ensure shrink-0 is there.
code = code.replace(
  '<div className="px-6 py-3.5 border-t border-mint-line bg-white flex gap-3">',
  '<div className="px-6 py-3.5 border-t border-mint-line bg-white flex gap-3 shrink-0">'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Fixed CSS inline');
