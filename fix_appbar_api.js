const fs = require('fs');
let c = fs.readFileSync('web/src/components/AppBar.tsx', 'utf8');

c = c.replace(
  'api/pharmacies/${user.pharmacy_id}/notifs',
  'api/pharmacies/${user.pharmacy_id}/notifications'
);

c = c.replace(/notifsData\?\.notifs\?/g, 'notifsData?.notifications?');
c = c.replace(/notifsData\.notifs/g, 'notifsData.notifications');

fs.writeFileSync('web/src/components/AppBar.tsx', c, 'utf8');
console.log('Fixed AppBar API endpoint');
