const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', 'utf8');

const plansTarget = "  const plans = [";
const parseBlock = "  const sm = serverPlans.find(p => p.id === 'monthly') || {};\n  const sa = serverPlans.find(p => p.id === 'annual') || {};\n  const sl = serverPlans.find(p => p.id === 'lifetime') || {};\n\n  const plans = [";
code = code.replace(plansTarget, parseBlock);

code = code.replace(/price: customPrice != null \? customPrice : \(settings\?\.monthlyPrice \|\| 49\),/g, "price: customPrice != null ? customPrice : (sm.price || 49),");
code = code.replace(/oldPrice: settings\?\.monthlyOldPrice,/g, "oldPrice: sm.oldPrice || null,");

code = code.replace(/price: customPrice != null \? customPrice \* 10 : \(settings\?\.annualPrice \|\| 499\),/g, "price: customPrice != null ? customPrice * 10 : (sa.price || 499),");
code = code.replace(/oldPrice: settings\?\.annualOldPrice,/g, "oldPrice: sa.oldPrice || null,");

code = code.replace(/price: settings\?\.lifetimePrice \|\| 1499,/g, "price: sl.price || 1499,");
code = code.replace(/oldPrice: settings\?\.lifetimeOldPrice,/g, "oldPrice: sl.oldPrice || null,");

fs.writeFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', code, 'utf8');
