const fs = require('fs');

let page = fs.readFileSync('web/src/app/batches/page.tsx', 'utf8');

page = page.replace(
  'days < 0',
  'days !== null && days < 0'
);

page = page.replace(
  'days >= 0 && days <= 60',
  'days !== null && days >= 0 && days <= 60'
);

// We have multiple instances of this, so let's do a global replace
page = page.replace(/days < 0/g, 'days !== null && days < 0');
page = page.replace(/days >= 0 && days <= 60/g, 'days !== null && days >= 0 && days <= 60');

fs.writeFileSync('web/src/app/batches/page.tsx', page, 'utf8');
console.log('Fixed filter NaN logic');
