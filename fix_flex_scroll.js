const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// The main issue is the left panel container missing `min-h-0` when it acts as a flex column.
code = code.replace(
  '<div className="flex-1 flex flex-col min-w-0">',
  '<div className="flex-1 flex flex-col min-w-0 min-h-0">' // Added min-h-0 to allow the overflow-y-auto child to actually scroll
);

// We should also check the right panel, though it has overflow-y-auto directly on itself.
// Let's make sure the whole modal body split panels container has min-h-0. It does: `<div className="flex flex-1 min-h-0">`

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Fixed flexbox overflow issue!');
