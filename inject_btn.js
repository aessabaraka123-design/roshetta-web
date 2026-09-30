const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// The exact block to replace
const blockRegex = /<div className="relative">\r?\n\s*<input type="text" value=\{itemSearch\}([\s\S]*?)<\/div>\r?\n\s*\}\)\}\r?\n\s*<\/div>/;

const newBlock = `<div className="flex gap-2">
                  <div className="relative flex-1">
                    <input type="text" value={itemSearch}$1</div>
                    )}
                  </div>
                  <button onClick={() => setShowQuickAdd(true)} className="px-4 bg-teal text-white rounded-xl text-[13px] font-bold shrink-0 hover:opacity-90 transition-all whitespace-nowrap">+ صنف جديد</button>
                </div>`;

if (blockRegex.test(code)) {
  code = code.replace(blockRegex, newBlock);
  console.log('Successfully injected the button!');
} else {
  console.log('Could not find the search block regex!');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
