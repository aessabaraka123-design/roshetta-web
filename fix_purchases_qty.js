const fs = require('fs');

const path = 'web/src/app/purchases/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import
const importStr = `import { formatQty } from "@/utils/formatQty";\n`;
if (!code.includes('formatQty')) {
  code = code.replace(`import toast from "react-hot-toast";`, `import toast from "react-hot-toast";\n${importStr}`);
}

// Replace all instances of {d.qty} next to المخزون
code = code.replace(/في المخزون: \{d\.qty\}/g, `في المخزون: {formatQty(d.qty, d.units)}`);

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed qty display in purchases page');
