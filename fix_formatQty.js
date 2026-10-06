const fs = require('fs');

// 1. Update callers
const files = ['web/src/app/inventory/page.tsx', 'web/src/app/pos/page.tsx', 'web/src/app/purchases/page.tsx'];
files.forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/formatQty\(med\.qty,\s*med\.units\)/g, 'formatQty(med.qty, med.units, language)');
    c = c.replace(/formatQty\(d\.qty,\s*d\.units\)/g, 'formatQty(d.qty, d.units, language)');
    fs.writeFileSync(f, c, 'utf8');
});

// 2. Update formatQty.ts
let formatQtyCode = `export function formatQty(qty: number, unitsJson?: string | null, language: string = "ar"): string {
  const q = qty || 0;
  const tBox = language === "en" ? "Box" : "علبة";
  const tPart = language === "en" ? "Part" : "جزء";
  const tAnd = language === "en" ? " and " : " و ";

  const unitTranslations: Record<string, string> = {
    "علبة": "Box",
    "شريط": "Strip",
    "حبة": "Pill",
    "كرتونة": "Carton",
    "قطرة": "Drop",
    "امبولة": "Ampoule",
    "أمبولة": "Ampoule",
    "زجاجة": "Bottle",
    "كيس": "Sachet",
    "جرعة": "Dose"
  };

  if (unitsJson) {
    try {
      const parsedUnits = JSON.parse(unitsJson);
      if (parsedUnits && parsedUnits.length > 1) {
        const parts = [];

        for (let i = 0; i < parsedUnits.length; i++) {
          const unit = parsedUnits[i];
          const count = unit.count || 1;
          const val = parseFloat((q / count).toFixed(2));
          let uName = unit.name || (i === 0 ? tBox : tPart);
          
          if (language === "en" && unitTranslations[uName]) {
            uName = unitTranslations[uName];
          }

          parts.push(\`\${val} \${uName}\`);
        }

        return parts.join(tAnd);
      }
    } catch (e) {}
  }
  return \`\${q} \${tBox}\`;
}
`;

fs.writeFileSync('web/src/utils/formatQty.ts', formatQtyCode, 'utf8');
console.log('Fixed formatQty to handle DB dynamic unit translations and pass language argument');
