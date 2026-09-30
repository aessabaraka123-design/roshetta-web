const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', 'utf8');

// I will write a simple Node script to decode base64 of the Arabic strings and replace the garbage.
// The garbage is: {t('invoice')}{foundSale.id} ?? {foundSale.total?.toFixed(2)} ??
const badStringRegex = /\{t\('invoice'\)\}\{foundSale\.id\}[^\{]+\{foundSale\.total\?\.toFixed\(2\)\}[^\{]+/;

const replacement = "{t('invoice')}{foundSale.id} - {foundSale.total?.toFixed(2)} \u20AA";

code = code.replace(badStringRegex, replacement);

// There is also {foundSale.cashierName ? \ ?? \\ : ''}
const badCashierRegex = /\{foundSale\.cashierName \? \[^\$]+\$\{foundSale\.cashierName\}\ : ''\}/;
const cashierReplacement = "{foundSale.cashierName ?  -  : ''}";

code = code.replace(badCashierRegex, cashierReplacement);

fs.writeFileSync('C:/roshetta_app/src/screens/pos/ReturnsScreen.js', code, 'utf8');
