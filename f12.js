const fs = require('fs');
let nCode = fs.readFileSync('C:/roshetta_app/src/screens/core/NotificationsScreen.js', 'utf8');
nCode = nCode.replace(
  "s.date?.startsWith(todayStr)",
  "s.date?.startsWith(todayStr) && s.status !== 'refunded' && s.paymentMethod !== require('../../i18n').t('pay_off_a_debt')"
);
fs.writeFileSync('C:/roshetta_app/src/screens/core/NotificationsScreen.js', nCode, 'utf8');

let sCode = fs.readFileSync('C:/roshetta_app/src/screens/reports/SalesLogScreen.js', 'utf8');
if (!sCode.includes("sale.status !== 'refunded'")) {
  sCode = sCode.replace(
    "const totalRevenue = filtered.reduce((s, sale) => s + (Number(sale.total) || 0), 0);",
    "const totalRevenue = filtered.filter(sale => sale.status !== 'refunded').reduce((s, sale) => s + (Number(sale.total) || 0), 0);"
  );
  fs.writeFileSync('C:/roshetta_app/src/screens/reports/SalesLogScreen.js', sCode, 'utf8');
}
