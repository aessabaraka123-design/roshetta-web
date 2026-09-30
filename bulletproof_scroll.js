const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Force strict height on the modal wrapper (90vh) and remove confusing flex-growth constraints
code = code.replace(
  /className="relative bg-white rounded-3xl w-full max-w-4xl [^"]* flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden"/g,
  'className="relative bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden"'
);

// 2. Ensure the split panels body has overflow-hidden to bound the scroll
code = code.replace(
  /<div className="flex flex-1 min-h-0">/g,
  '<div className="flex flex-1 min-h-0 overflow-hidden">'
);

// 3. Ensure the left panel (Items panel) bounds its children properly
code = code.replace(
  /<div className="flex-1 flex flex-col min-w-0( min-h-0)?">/g,
  '<div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">'
);

// 4. Force the search bar header to NEVER shrink or grow (shrink-0)
code = code.replace(
  /<div className="px-4 py-3 border-b border-mint-line bg-white">/g,
  '<div className="px-4 py-3 border-b border-mint-line bg-white shrink-0">'
);

// 5. Force the footer (Save/Cancel buttons) to NEVER shrink (shrink-0)
code = code.replace(
  /<div className="p-4 border-t border-mint-line bg-bg flex justify-between">/g,
  '<div className="p-4 border-t border-mint-line bg-bg flex justify-between shrink-0">'
);

// 6. Ensure the right panel (Controls) bounds properly
code = code.replace(
  /<div className="w-72 shrink-0 bg-bg p-5 flex flex-col gap-4 border-l border-mint-line overflow-y-auto">/g,
  '<div className="w-72 shrink-0 bg-bg p-5 flex flex-col gap-4 border-l border-mint-line overflow-y-auto h-full">'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Flexbox scrolling completely restructured and bulletproofed!');
