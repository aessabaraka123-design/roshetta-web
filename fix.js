const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');
code = code.replace(/addNotification\?\.\[{\S\s]*?tone: 'amber',\s*\}\);/, `addNotification?.({
      emoji: '\\u23EA3\\uFE0?',
      title: \${t('str_szikpg1')}\${foundSale.id}`,
      body: \${selected.map(i => i.name).join(t('str_8798'))} \${t('str_c6cjarx')} \${REASONS[reason]} - \${totalRefund.toFixed(2)} \\u20AA`,
      tone: 'amber',
    });`);
fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
