const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Reduce header padding
code = code.replace(
  'flex items-center justify-between px-6 py-5 border-b border-mint-line',
  'flex items-center justify-between px-5 py-3.5 border-b border-mint-line'
);

// 2. Make h2 smaller
code = code.replace(
  'text-[20px] font-black text-ink',
  'text-[17px] font-black text-ink'
);

// 3. Reduce body padding and space-y
code = code.replace(
  'flex-1 overflow-y-auto px-6 py-5 space-y-5',
  'flex-1 overflow-y-auto px-5 py-4 space-y-4'
);

// 4. Make type selector buttons more compact (p-4 -> p-3)
code = code.replace(
  /className={`p-4 rounded-2xl border-2 text-right/g,
  'className={`p-3 rounded-xl border-2 text-right'
);

// 5. Smaller type selector text
code = code.replace(
  /text-\[15px\] font-black mb-1/g,
  'text-[13px] font-black mb-0.5'
);

// 6. Reduce select/input py-3 to py-2
code = code.replace(
  /rounded-xl px-4 py-3 text-\[14px\] font-bold text-ink outline-none focus:border-primary transition-colors/g,
  'rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary transition-colors'
);
code = code.replace(
  /rounded-xl px-4 py-3 text-\[14px\] outline-none focus:border-primary transition-colors/g,
  'rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors'
);

// 7. Make search bar more compact
code = code.replace(
  'flex items-center gap-3 bg-bg border border-mint-line rounded-xl px-4 py-3 focus-within:border-primary transition-colors',
  'flex items-center gap-2 bg-bg border border-mint-line rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors'
);

// 8. Reduce footer padding
code = code.replace(
  'px-6 py-4 border-t border-mint-line flex gap-3',
  'px-5 py-3 border-t border-mint-line flex gap-3'
);

// 9. Reduce footer button height
code = code.replace(
  /flex-1 bg-primary text-white font-black py-4 rounded-2xl/,
  'flex-1 bg-primary text-white font-black py-3 rounded-2xl'
);
code = code.replace(
  /px-6 py-4 bg-bg text-ink font-bold rounded-2xl/,
  'px-5 py-3 bg-bg text-ink font-bold rounded-2xl'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Compacted modal!');
