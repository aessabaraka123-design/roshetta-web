const fs = require('fs');
const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Extend Med interface with stock fields
const medInterfaceRegex = /part2_price\?: number;/;
if (medInterfaceRegex.test(code)) {
    code = code.replace(medInterfaceRegex, `part2_price?: number;
  stock_boxes?: number;
  stock_part1?: number;
  stock_part2?: number;`);
}

// 2. Update setEditingItem to parse stock fields
const setEditingItemRegex = /onClick=\{\(\) => \{\s*let hp = false;[\s\S]*?setEditingItem\(\{[\s\S]*?part2_qty: p2q\s*\}\);\s*\}\}/;
const newSetEditingItem = `onClick={() => {
                    let hp = false;
                    let p1n = 'شريط', p1q = 1;
                    let hs = false;
                    let p2n = 'حبة', p2q = 1;
                    let s_boxes = med.qty || 0, s_p1 = 0, s_p2 = 0;
                    
                    try {
                      if (med.units) {
                        const arr = JSON.parse(med.units);
                        if (arr && arr.length >= 2) {
                          hp = true;
                          p1n = arr[1].name;
                          const totalPerBox = arr[0].count;
                          s_boxes = Math.floor((med.qty || 0) / totalPerBox);
                          const rem = (med.qty || 0) % totalPerBox;
                          
                          if (arr.length === 2) {
                            p1q = arr[0].count / arr[1].count;
                            s_p1 = Math.floor(rem / arr[1].count);
                          } else if (arr.length === 3) {
                            hs = true;
                            p2n = arr[2].name;
                            p2q = arr[1].count / arr[2].count;
                            p1q = arr[0].count / arr[1].count;
                            s_p1 = Math.floor(rem / arr[1].count);
                            s_p2 = rem % arr[1].count;
                          }
                        }
                      }
                    } catch(e) {}
                    
                    setEditingItem({
                      ...med,
                      has_parts: hp,
                      part1_name: p1n,
                      part1_qty: p1q,
                      has_subparts: hs,
                      part2_name: p2n,
                      part2_qty: p2q,
                      stock_boxes: s_boxes,
                      stock_part1: s_p1,
                      stock_part2: s_p2
                    });
                  }}`;
if (setEditingItemRegex.test(code)) {
    code = code.replace(setEditingItemRegex, newSetEditingItem);
} else {
    console.log("Could not find setEditingItem regex");
}

// 3. Update the Qty UI in the form
const qtyUIRegex = /<div className="flex-1">\s*<label className="block text-\[13px\] font-bold text-ink-soft mb-1\.5">الكمية<\/label>\s*<input type="number" required value=\{editingItem\.qty\} onChange=\{e => setEditingItem\(\{\.\.\.editingItem, qty: Number\(e\.target\.value\)\}\)\} className="w-full border border-mint-line rounded-xl p-2\.5 outline-none focus:border-primary font-mono text-center text-\[14px\]" style=\{\{ direction: 'ltr' \}\} \/>\s*<\/div>/;

const newQtyUI = `<div className="flex-1">
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
if (qtyUIRegex.test(code)) {
    code = code.replace(qtyUIRegex, newQtyUI);
} else {
    console.log("Could not find Qty UI");
}

// 4. Update handleUpdate to compute the final qty based on stock_* fields
const handleUpdateBodyRegex = /qty: editingItem\.qty,/;
const newHandleUpdateBody = `qty: (() => {
            const sb = editingItem.stock_boxes || 0;
            const sp1 = editingItem.stock_part1 || 0;
            const sp2 = editingItem.stock_part2 || 0;
            if (!editingItem.has_parts) return sb;
            if (editingItem.has_parts && !editingItem.has_subparts) {
              const p1q = editingItem.part1_qty || 1;
              return (sb * p1q) + sp1;
            }
            if (editingItem.has_parts && editingItem.has_subparts) {
              const p1q = editingItem.part1_qty || 1;
              const p2q = editingItem.part2_qty || 1;
              return (sb * p1q * p2q) + (sp1 * p2q) + sp2;
            }
            return sb;
          })(),`;
if (handleUpdateBodyRegex.test(code)) {
    code = code.replace(handleUpdateBodyRegex, newHandleUpdateBody);
} else {
    console.log("Could not find handleUpdate body qty");
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("SUCCESS: Split qty field into boxes/strips/pills.");
