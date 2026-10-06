const fs = require('fs');
['web/src/components/Sidebar.tsx', 'web/src/components/AppBar.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\\\${/g, '${');
  c = c.replace(/\\`/g, '`');
  fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed');
