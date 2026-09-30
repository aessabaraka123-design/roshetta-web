const fs = require('fs');
const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Find the Qty UI block and replace it to only show stock_boxes
const qtyUIRegex = /<div className="flex-1">\s*<label className="block text-\[13px\] font-bold text-ink-soft mb-1\.5">الكمية المخزنة<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newQtyUI = `<div className="flex-1">
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">الكمية (علبة)</label>
                  <input type="number" required value={editingItem.stock_boxes ?? 0} onChange={e => setEditingItem({...editingItem, stock_boxes: Number(e.target.value)})} className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]" style={{ direction: 'ltr' }} />
                </div>`;

if (qtyUIRegex.test(code)) {
    code = code.replace(qtyUIRegex, newQtyUI);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("SUCCESS: Reverted Qty field to show only boxes");
} else {
    console.log("Could not find Qty UI block");
}
