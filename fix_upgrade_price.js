const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', 'utf8');

code = code.replace(/price: settings\?\.monthlyPrice \|\| 49,/g, "price: customPrice != null ? customPrice : (settings?.monthlyPrice || 49),");
code = code.replace(/price: settings\?\.annualPrice \|\| 499,/g, "price: customPrice != null ? customPrice * 10 : (settings?.annualPrice || 499),");

fs.writeFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', code, 'utf8');
