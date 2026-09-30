const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');
let lines = code.split('\n');

let searchInputLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('value={itemSearch}') && lines[i].includes('setItemSearch')) {
    searchInputLineIdx = i;
    break;
  }
}

if (searchInputLineIdx !== -1) {
  // Go up to find <div className="relative">
  let divRelativeIdx = -1;
  for (let i = searchInputLineIdx; i >= 0; i--) {
    if (lines[i].includes('<div className="relative">')) {
      divRelativeIdx = i;
      break;
    }
  }

  // Go down to find the closing </div> of the relative container
  // It ends when we see ")}", then "</div>"
  let closingDivIdx = -1;
  for (let i = searchInputLineIdx; i < lines.length; i++) {
    if (lines[i].includes('</div>') && lines[i-1] && lines[i-1].includes(')}')) {
      closingDivIdx = i;
      break;
    }
  }

  if (divRelativeIdx !== -1 && closingDivIdx !== -1) {
    // Replace <div className="relative">
    lines[divRelativeIdx] = lines[divRelativeIdx].replace('<div className="relative">', '<div className="flex gap-2">\n                  <div className="relative flex-1">');
    
    // Inject button after closingDivIdx
    lines.splice(closingDivIdx + 1, 0, '                  <button type="button" onClick={() => setShowQuickAdd(true)} className="px-4 bg-teal text-white rounded-xl text-[13px] font-bold shrink-0 hover:opacity-90 transition-all whitespace-nowrap">+ صنف جديد</button>\n                </div>');
    
    fs.writeFileSync('web/src/app/purchases/page.tsx', lines.join('\n'), 'utf8');
    console.log('Successfully injected button using lines processing!');
  } else {
    console.log('Found search input but failed to find bounds', divRelativeIdx, closingDivIdx);
  }
} else {
  console.log('Could not find value={itemSearch} line');
}
