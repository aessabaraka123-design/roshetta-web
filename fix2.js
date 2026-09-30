const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');
code = code.replace(/addNotification\?\.\[{\S\s]*?tone: 'amber',\s*\}\);/, "addNotification?.({\n      emoji: '\\u21A9',\n      title: `${t('str_szikpg1')}${foundSale.id}`,\n      body: `${selected.map(i => i.name).join(t('str_8798'))} ${t('str_c6cjarx')} ${REASONS[reason]} - ${totalRefund.toFixed(2)} \\u20AA`,\n      tone: 'amber',\n    });");
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
