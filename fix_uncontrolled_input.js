const fs = require('fs');

let pageCode = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// The React warning complains about transitioning from undefined to a value for controlled components.
// We must provide a fallback like `?? ''` so the input always has a defined value.

pageCode = pageCode.replace(
  /value=\{item\.qty\}/g,
  "value={item.qty ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.purchase_price\}/g,
  "value={item.purchase_price ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.sell_price\}/g,
  "value={item.sell_price ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.part1_qty\}/g,
  "value={item.part1_qty ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.part1_price\}/g,
  "value={item.part1_price ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.part2_qty\}/g,
  "value={item.part2_qty ?? ''}"
);

pageCode = pageCode.replace(
  /value=\{item\.part2_price\}/g,
  "value={item.part2_price ?? ''}"
);

fs.writeFileSync('web/src/app/purchases/page.tsx', pageCode, 'utf8');
console.log("Added nullish coalescing operators to fix React uncontrolled input warnings.");
