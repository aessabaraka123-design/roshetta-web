const fs = require('fs');

let page = fs.readFileSync('web/src/components/AppBar.tsx', 'utf8');

// Fix isRead property name
page = page.replace(
  /notif\.isRead/g,
  'notif.is_read'
);

page = page.replace(
  /\!n\.isRead/g,
  '!n.is_read'
);

// Fix message vs body
page = page.replace(
  /notif\.message/g,
  'notif.title'
);

fs.writeFileSync('web/src/components/AppBar.tsx', page, 'utf8');
console.log('Fixed AppBar notifications mapping');
