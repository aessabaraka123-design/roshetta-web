const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const regex = /const parsed = JSON\.parse\(med\.units\);\n\s*if \(parsed && parsed\.length > 0\) \{\n\s*setUnitModal\(\{ visible: true, med, units: parsed \}\);/;

const replacement = `const parsed = JSON.parse(med.units);
        if (parsed && parsed.length > 0) {
          const boxCount = parsed[0].count || 1;
          const unitsWithPrices = parsed.map(u => ({
            ...u,
            price: med.price * ((u.count || 1) / boxCount)
          }));
          setUnitModal({ visible: true, med, units: unitsWithPrices });`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
    console.log("SUCCESS: Patched pos/page.tsx to calculate unit prices");
} else {
    console.log("Could not find the target code in pos/page.tsx");
}
