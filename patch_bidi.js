const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Fix toast
c = c.replace(
  'toast("لا يوجد نواقص في هذا الفرع");',
  'toast(language === "en" ? "No shortages in this branch" : "لا يوجد نواقص في هذا الفرع");'
);

// 2. Fix 'اسم الجزء' on line 1361 (roughly)
// We'll just replace 'اسم الجزء' with '{language === "en" ? "Part name" : "اسم الجزء"}' globally 
// Note: one was already replaced, so replacing it might hit twice if we're not careful.
c = c.replace(
  />\s*اسم الجزء\s*<\/label>/g,
  '>{language === "en" ? "Part name" : "اسم الجزء"}</label>'
);

// 3. Fix 'سيتم إضافة للمخزون'
c = c.replace(
  '📦 سيتم إضافة للمخزون:{" "}',
  '📦 {language === "en" ? "Will be added to stock:" : "سيتم إضافة للمخزون:"} {" "}'
);

// 4. Inject tName helper function inside PurchasesPage (around line 70, where states are)
c = c.replace(
  'const [searchTerm, setSearchTerm] = useState("");',
  `const [searchTerm, setSearchTerm] = useState("");
  const tName = (name: string) => {
    if (language !== "en") return name;
    const dict: any = { "شريط": "Strip", "أمبولة": "Ampoule", "مغلف": "Sachet", "قطرة": "Drop", "حبة": "Pill", "مل": "ml", "غرام": "Gram", "علبة": "Box" };
    return dict[name] || name;
  };`
);

// 5. Fix the templates to use tName
c = c.replace(/\{language === "en" \? \`How many \$\{p1Name\}s in a box\?\` : \`كم \$\{p1Name\} في العلبة؟\`\}/g, '{language === "en" ? `How many ${tName(p1Name)}s in a box?` : `كم ${p1Name} في العلبة؟`}');
c = c.replace(/\{language === "en" \? \`Price per \$\{p1Name\}\` : \`سعر الـ \$\{p1Name\}\`\}/g, '{language === "en" ? `Price per ${tName(p1Name)}` : `سعر الـ ${p1Name}`}');
c = c.replace(/\{language === "en" \? \`Is \$\{p1Name\} sold in smaller parts\? \(e\.g\. pill\)\` : \`هل يباع الـ \$\{p1Name\} مجزأ؟ \(مثال: حبة\)\`\}/g, '{language === "en" ? `Is ${tName(p1Name)} sold in smaller parts?` : `هل يباع الـ ${p1Name} مجزأ؟ (مثال: حبة)`}');
c = c.replace(/\{language === "en" \? \`How many \$\{p2Name\}s in a \$\{p1Name\}\?\` : \`كم \$\{p2Name\} في الـ \$\{p1Name\}؟\`\}/g, '{language === "en" ? `How many ${tName(p2Name)}s in a ${tName(p1Name)}?` : `كم ${p2Name} في الـ ${p1Name}؟`}');
c = c.replace(/\{language === "en" \? \`Price per \$\{p2Name\}\` : \`سعر الـ \$\{p2Name\}\`\}/g, '{language === "en" ? `Price per ${tName(p2Name)}` : `سعر الـ ${p2Name}`}');

// Also translate the part name in the effective qty badge
c = c.replace(
  '{Math.floor((item.qty || 0) * (item.part1_qty || 1))} {p1Name}',
  '{Math.floor((item.qty || 0) * (item.part1_qty || 1))} {tName(p1Name)}'
);
c = c.replace(
  '{Math.floor((item.qty || 0) * (item.part1_qty || 1) * (item.part2_qty || 1))} {p2Name}',
  '{Math.floor((item.qty || 0) * (item.part1_qty || 1) * (item.part2_qty || 1))} {tName(p2Name)}'
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed BIDI issue and missing strings!');
