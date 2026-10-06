const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

c = c.replace(
  'const [itemSearch, setItemSearch] = useState("");',
  `const [itemSearch, setItemSearch] = useState("");
  const tName = (name: string) => {
    if (language !== "en") return name;
    const dict: any = { "شريط": "Strip", "أمبولة": "Ampoule", "مغلف": "Sachet", "قطرة": "Drop", "حبة": "Pill", "مل": "ml", "غرام": "Gram", "علبة": "Box" };
    return dict[name] || name;
  };`
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Injected tName properly!');
