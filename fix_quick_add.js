const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

code = code.replace(
  'strips_per_box: 10, pills_per_strip: 10, price_per_strip: 0, price_per_pill: 0, purchase_price: 0, unit_size: 100',
  "purchase_price: 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0"
);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Fixed Quick Add Schema');
