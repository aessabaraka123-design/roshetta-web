const fs = require('fs');
const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const oldQtyBlock = `<div className="flex-1">
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">الكمية المخزنة</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input type="number" required value={editingItem.stock_boxes ?? 0} onChange={e => setEditingItem({...editingItem, stock_boxes: Number(e.target.value)})} className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]" style={{ direction: 'ltr' }} />
                      <span className="absolute left-2 top-3 text-[11px] text-ink-soft pointer-events-none font-bold">علبة</span>
                    </div>
                    {editingItem.has_parts && (
                      <div className="relative flex-1">
                        <input type="number" value={editingItem.stock_part1 ?? 0} onChange={e => setEditingItem({...editingItem, stock_part1: Number(e.target.value)})} className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]" style={{ direction: 'ltr' }} />
                        <span className="absolute left-2 top-3 text-[11px] text-ink-soft pointer-events-none font-bold">{editingItem.part1_name || 'شريط'}</span>
                      </div>
                    )}
                    {editingItem.has_parts && editingItem.has_subparts && (
                      <div className="relative flex-1">
                        <input type="number" value={editingItem.stock_part2 ?? 0} onChange={e => setEditingItem({...editingItem, stock_part2: Number(e.target.value)})} className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]" style={{ direction: 'ltr' }} />
                        <span className="absolute left-2 top-3 text-[11px] text-ink-soft pointer-events-none font-bold">{editingItem.part2_name || 'حبة'}</span>
                      </div>
                    )}
                  </div>
                </div>`;

const newQtyBlock = `<div className="flex-1">
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">الكمية (علبة)</label>
                  <input type="number" required value={editingItem.stock_boxes ?? 0} onChange={e => setEditingItem({...editingItem, stock_boxes: Number(e.target.value)})} className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]" style={{ direction: 'ltr' }} />
                </div>`;

// Replace ignoring spaces/newlines differences using a regex built from the string
const escapeRegExp = (string) => string.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
const regexPattern = escapeRegExp(oldQtyBlock).replace(/\\s+/g, '\\s+');
const regex = new RegExp(regexPattern);

if (regex.test(code)) {
    code = code.replace(regex, newQtyBlock);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("SUCCESS: Replaced qty UI");
} else {
    // Try simple indexOf logic just in case
    const startStr = `<label className="block text-[13px] font-bold text-ink-soft mb-1.5">الكمية المخزنة</label>`;
    const idx = code.indexOf(startStr);
    if (idx !== -1) {
        console.log("Found start, applying manual slice");
        const divStart = code.lastIndexOf('<div className="flex-1">', idx);
        const endStr = `</div>\n                </div>`;
        const divEnd = code.indexOf(endStr, idx) + endStr.length;
        code = code.substring(0, divStart) + newQtyBlock + code.substring(divEnd);
        fs.writeFileSync(filePath, code, 'utf8');
        console.log("SUCCESS: Replaced qty UI manually");
    } else {
        console.log("Could not find Qty UI");
    }
}
