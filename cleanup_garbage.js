const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const searchStr = `<span className="font-bold text-[14px] text-primary">الكمية: {formatQty(med.qty, med.units)}</span>`;
const start = code.indexOf(searchStr);
if (start !== -1) {
  const end = code.indexOf('})()}', start);
  if (end !== -1) {
    const endOfBlock = code.indexOf('</span>', end) + 7;
    code = code.substring(0, start + searchStr.length) + code.substring(endOfBlock);
    fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
    console.log('Cleaned up garbage');
  }
}
