const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const regex = /if \(parsed && parsed\.length > 0\) \{\s*setUnitModal\(\{ visible: true, med, units: parsed \}\);/g;

const replacement = `if (parsed && parsed.length > 0) {
          const boxCount = parsed[0].count || 1;
          const unitsWithPrices = parsed.map((u: any) => ({
            ...u,
            price: med.price * ((u.count || 1) / boxCount)
          }));
          setUnitModal({ visible: true, med, units: unitsWithPrices });`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
    console.log("SUCCESS: Patched pos/page.tsx");
} else {
    console.log("Still could not find it");
}
