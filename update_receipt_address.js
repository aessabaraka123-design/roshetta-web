const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

// The string to replace
const targetStr = `<p className="text-[12px] text-ink-soft">غزة - شارع النصر</p>`;
const replacement = `{activeBranchObj?.addr && (
                  <p className="text-[12px] text-ink-soft">{activeBranchObj.addr}</p>
                )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Updated POS page address");
} else {
  console.log("Could not find string in pos/page.tsx");
}

let code2 = fs.readFileSync('web/src/app/print-settings/page.tsx', 'utf8');
if (code2.includes(targetStr)) {
  code2 = code2.replace(targetStr, `<p className="text-[12px] text-ink-soft opacity-70">عنوان الفرع (يظهر تلقائياً)</p>`);
  fs.writeFileSync('web/src/app/print-settings/page.tsx', code2, 'utf8');
  console.log("Updated print-settings preview address");
} else {
  console.log("Could not find string in print-settings/page.tsx");
}
