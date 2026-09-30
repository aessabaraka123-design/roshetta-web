const fs = require('fs');

const path = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import if not exists
if (!code.includes('formatQty')) {
  code = code.replace(`import toast from "react-hot-toast";`, `import toast from "react-hot-toast";\nimport { formatQty } from "@/utils/formatQty";`);
}

// Replace the inline qty rendering logic with a call to formatQty
const oldQtyBlockRegex = /<span className="font-bold text-\[14px\] text-ink-soft">[\s\S]*?<\/span>/;
const newQtyBlock = `<span className="font-bold text-[14px] text-primary">الكمية: {formatQty(med.qty, med.units)}</span>`;

if (oldQtyBlockRegex.test(code)) {
    code = code.replace(oldQtyBlockRegex, newQtyBlock);
    fs.writeFileSync(path, code, 'utf8');
    console.log("SUCCESS: Replaced inline qty display with formatQty");
} else {
    // maybe it has the old old class name
    const oldQtyBlockRegex2 = /<span className="font-mono text-\[14px\] text-ink-soft font-semibold">[\s\S]*?<\/span>/;
    if (oldQtyBlockRegex2.test(code)) {
        code = code.replace(oldQtyBlockRegex2, newQtyBlock);
        fs.writeFileSync(path, code, 'utf8');
        console.log("SUCCESS: Replaced inline qty display with formatQty (old class)");
    } else {
        console.log("Could not find inline qty display");
    }
}
