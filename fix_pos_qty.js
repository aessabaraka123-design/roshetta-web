const fs = require('fs');
const path = 'web/src/app/pos/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const importStr = `import { formatQty } from "@/utils/formatQty";\n`;
if (!code.includes('formatQty')) {
  code = code.replace(`import toast from "react-hot-toast";`, `import toast from "react-hot-toast";\n${importStr}`);
}

code = code.replace(/<span className="font-mono font-bold text-teal">\{med\.qty\}<\/span>/g, `<span className="font-mono font-bold text-teal">{formatQty(med.qty, med.units)}</span>`);

fs.writeFileSync(path, code, 'utf8');
console.log('Fixed qty display in POS page');
