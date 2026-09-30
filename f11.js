const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/reports/DashboardScreen.js', 'utf8');
code = code.replace(
  "const _todaysSales = branchSales.filter(s => s.date?.startsWith(todayStr) && s.paymentMethod !== t('pay_off_a_debt'));",
  "const _todaysSales = branchSales.filter(s => s.date?.startsWith(todayStr) && s.paymentMethod !== t('pay_off_a_debt') && s.status !== 'refunded');"
);
code = code.replace(
  "const yesterdaySales = branchSales.filter(s => s.date?.startsWith(yesterdayStr) && s.paymentMethod !== t('pay_off_a_debt'));",
  "const yesterdaySales = branchSales.filter(s => s.date?.startsWith(yesterdayStr) && s.paymentMethod !== t('pay_off_a_debt') && s.status !== 'refunded');"
);
fs.writeFileSync('C:/roshetta_app/src/screens/reports/DashboardScreen.js', code, 'utf8');
