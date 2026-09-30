const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const anchor1 = '<div className="relative">\n                    <input type="text" value={itemSearch}';
const anchor1Win = '<div className="relative">\r\n                    <input type="text" value={itemSearch}';

const anchorEnd = '</div>\n                    )}\n                  </div>';
const anchorEndWin = '</div>\r\n                    )}\r\n                  </div>';

let startIdx = code.indexOf(anchor1);
let endIdx = code.indexOf(anchorEnd, startIdx);

if (startIdx === -1) {
    startIdx = code.indexOf(anchor1Win);
    endIdx = code.indexOf(anchorEndWin, startIdx);
    if(startIdx !== -1) endIdx += anchorEndWin.length;
} else {
    endIdx += anchorEnd.length;
}

if (startIdx !== -1 && endIdx > startIdx) {
    let block = code.substring(startIdx, endIdx);
    
    // Replace the outer <div className="relative"> with <div className="flex gap-2"><div className="relative flex-1">
    block = block.replace('<div className="relative">', '<div className="flex gap-2">\n                  <div className="relative flex-1">');
    
    // Append the button and close the outer flex div
    block += '\n                  <button onClick={() => setShowQuickAdd(true)} className="px-4 bg-teal text-white rounded-xl text-[13px] font-bold shrink-0 hover:opacity-90 transition-all whitespace-nowrap">+ صنف جديد</button>\n                </div>';
    
    code = code.substring(0, startIdx) + block + code.substring(endIdx);
    console.log('Successfully injected button using indexOf!');
    fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
} else {
    console.log('Failed to find block using indexOf!');
    console.log(startIdx, endIdx);
}
