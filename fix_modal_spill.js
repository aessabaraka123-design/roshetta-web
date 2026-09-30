const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// The issue is likely the `p-4 py-6` wrapper interacting weirdly with `h-[90vh]` in standard laptop screens.
// I'll change it to use strict styles avoiding top/bottom bleeding.

code = code.replace(
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 py-6">',
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">'
);

code = code.replace(
  'className="relative bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden"',
  'className="relative bg-white rounded-3xl w-full max-w-4xl max-h-full h-[700px] flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden"'
);

// Actually, to make it completely safe and fixed height that scrolls internally:
// `max-h-[calc(100vh-2rem)] h-[700px]` - it will be exactly 700px unless the screen is smaller than 700px, in which case it shrinks to the screen size (minus padding).

code = code.replace(
  'h-[700px]',
  'h-[750px] max-h-full' // it's constrained by the parent padding anyway.
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Applied strict max-h-full constraint');
