const fs = require('fs');

const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Extend Med interface
const medInterfaceRegex = /interface Med \{[\s\S]*?branch: \{ name: string \};\s*units\?: string;\s*\}/;
if (medInterfaceRegex.test(code)) {
    code = code.replace(medInterfaceRegex, `interface Med {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  qty: number;
  minQty?: number;
  price: number;
  cost: number;
  batch_number: string;
  expiry_date?: string;
  expiry?: string;
  isControlled?: number | boolean;
  branch: { name: string };
  units?: string;
  // Temporary state for UI
  has_parts?: boolean;
  part1_name?: string;
  part1_qty?: number;
  part1_price?: number;
  has_subparts?: boolean;
  part2_name?: string;
  part2_qty?: number;
  part2_price?: number;
}`);
} else {
    console.log("Could not find Med interface");
}

// 2. Fix the quantity display to say "الكمية (علبة):" if it's just boxes
const qtyDisplayRegex = /<span className="font-mono text-\[14px\] text-ink-soft font-semibold">[\s\S]*?<\/span>/;
const newQtyDisplay = `<span className="font-bold text-[14px] text-ink-soft">
                  {(() => {
                    if (med.units) {
                      try {
                        const parsedUnits = JSON.parse(med.units);
                        if (parsedUnits && parsedUnits.length > 1) {
                          const boxesCount = parsedUnits[0].count;
                          const boxes = Math.floor(med.qty / boxesCount);
                          const remainder = med.qty % boxesCount;
                          let parts = [\`\${boxes} \${parsedUnits[0].name || 'علبة'}\`];
                          
                          if (parsedUnits.length === 3) {
                            const stripCount = parsedUnits[1].count;
                            const strips = Math.floor(remainder / stripCount);
                            const pills = remainder % stripCount;
                            
                            if (strips > 0) parts.push(\`\${strips} \${parsedUnits[1].name}\`);
                            if (pills > 0) parts.push(\`\${pills} \${parsedUnits[2].name}\`);
                            
                            return <span className="text-primary">الكمية: {parts.join(' و ')}</span>;
                          } else if (parsedUnits.length === 2) {
                            const pills = remainder;
                            if (pills > 0) parts.push(\`\${pills} \${parsedUnits[1].name}\`);
                            return <span className="text-primary">الكمية: {parts.join(' و ')}</span>;
                          }
                        }
                      } catch (e) {}
                    }
                    return <span className="text-ink">الكمية: {med.qty} علبة</span>;
                  })()}
                </span>`;
if (qtyDisplayRegex.test(code)) {
    code = code.replace(qtyDisplayRegex, newQtyDisplay);
} else {
    console.log("Could not find qty display");
}

// 3. Update the setEditingItem call to parse the array schema into the UI state
const setEditingItemRegex = /onClick=\{\(\) => setEditingItem\(med\)\}/;
const newSetEditingItem = `onClick={() => {
                    let hp = false;
                    let p1n = 'شريط', p1q = 1;
                    let hs = false;
                    let p2n = 'حبة', p2q = 1;
                    
                    try {
                      if (med.units) {
                        const arr = JSON.parse(med.units);
                        if (arr && arr.length >= 2) {
                          hp = true;
                          p1n = arr[1].name;
                          if (arr.length === 2) {
                            p1q = arr[0].count / arr[1].count;
                          } else if (arr.length === 3) {
                            hs = true;
                            p2n = arr[2].name;
                            p2q = arr[1].count / arr[2].count;
                            p1q = arr[0].count / arr[1].count;
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
                      part2_qty: p2q
                    });
                  }}`;
if (setEditingItemRegex.test(code)) {
    code = code.replace(setEditingItemRegex, newSetEditingItem);
} else {
    console.log("Could not find setEditingItem");
}

// 4. Update handleUpdate to save the array schema
const handleUpdateBodyRegex = /body: JSON\.stringify\(\{[\s\S]*?expiry_date: editingItem\.expiry_date\s*\}\),/;
const newHandleUpdateBody = `body: JSON.stringify({
          name: editingItem.name,
          manufacturer: editingItem.manufacturer,
          category: editingItem.category,
          price_sell: editingItem.price,
          price_buy: editingItem.cost,
          qty: editingItem.qty,
          batch_number: editingItem.batch_number,
          expiry_date: editingItem.expiry_date,
          units: (() => {
            if (!editingItem.has_parts) return null;
            if (editingItem.has_parts && !editingItem.has_subparts) {
              return JSON.stringify([
                { name: 'علبة', count: editingItem.part1_qty || 1 },
                { name: editingItem.part1_name || 'شريط', count: 1 }
              ]);
            }
            if (editingItem.has_parts && editingItem.has_subparts) {
              const p1q = editingItem.part1_qty || 1;
              const p2q = editingItem.part2_qty || 1;
              return JSON.stringify([
                { name: 'علبة', count: p1q * p2q },
                { name: editingItem.part1_name || 'شريط', count: p2q },
                { name: editingItem.part2_name || 'حبة', count: 1 }
              ]);
            }
            return null;
          })()
        }),`;
if (handleUpdateBodyRegex.test(code)) {
    code = code.replace(handleUpdateBodyRegex, newHandleUpdateBody);
} else {
    console.log("Could not find handleUpdate body");
}

// 5. Replace modal wrapper layout to fix scroll
const modalWrapperRegex = /<div className="fixed inset-0 bg-ink\/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">\s*<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">\s*<div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">/;
const newModalWrapper = `<div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center shrink-0">`;
if (modalWrapperRegex.test(code)) {
    code = code.replace(modalWrapperRegex, newModalWrapper);
} else {
    console.log("Could not find modal wrapper");
}

// 6. Replace form layout to fix scroll
const formStartRegex = /<form onSubmit=\{handleUpdate\} className="p-5 space-y-4">/;
const newFormStart = `<form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">`;
if (formStartRegex.test(code)) {
    code = code.replace(formStartRegex, newFormStart);
} else {
    console.log("Could not find form start");
}

// 7. Inject the units UI before the submit button, and fix submit button layout
const submitButtonRegex = /<button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 mt-2 hover:bg-teal transition-colors">\s*حفظ التعديلات\s*<\/button>\s*<\/form>/;
const newSubmitButton = `              {/* ── الوحدات والأجزاء (متزامن مع الموبايل) ── */}
              <div className="border border-mint-line rounded-xl p-4 bg-bg" dir="rtl">
                <label className="flex items-center justify-between cursor-pointer mb-3">
                  <span className="text-[13px] font-bold text-ink">يُباع بالأجزاء (أشرطة / حبات)؟</span>
                  <div
                    onClick={() => setEditingItem({...editingItem, has_parts: !editingItem.has_parts})}
                    className={\`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors \${editingItem.has_parts ? 'bg-primary border-primary' : 'bg-white border-mint-line'}\`}
                  >
                    {editingItem.has_parts && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </label>

                {editingItem.has_parts && (
                  <div className="space-y-3 pt-3 border-t border-mint-line">
                    <p className="text-[12px] font-bold text-ink-soft">الجزء الأول (مثال: شريط)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-ink-soft mb-1">اسم الجزء</label>
                        <select value={editingItem.part1_name || 'شريط'} onChange={e => setEditingItem({...editingItem, part1_name: e.target.value})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-right">
                          <option value="شريط">شريط</option>
                          <option value="أمبولة">أمبولة</option>
                          <option value="مغلف">مغلف</option>
                          <option value="قطرة">قطرة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-ink-soft mb-1">كم في العلبة؟</label>
                        <input type="number" min="1" value={editingItem.part1_qty ?? 1} onChange={e => setEditingItem({...editingItem, part1_qty: parseInt(e.target.value)||1})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center" />
                      </div>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-mint-line mt-3">
                      <span className="text-[12px] font-bold text-ink-soft">هل يباع مجزأ؟ (مثال: حبة)</span>
                      <div
                        onClick={() => setEditingItem({...editingItem, has_subparts: !editingItem.has_subparts})}
                        className={\`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors \${editingItem.has_subparts ? 'bg-primary border-primary' : 'bg-white border-mint-line'}\`}
                      >
                        {editingItem.has_subparts && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </label>

                    {editingItem.has_subparts && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">اسم الجزء</label>
                          <select value={editingItem.part2_name || 'حبة'} onChange={e => setEditingItem({...editingItem, part2_name: e.target.value})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-right">
                            <option value="حبة">حبة</option>
                            <option value="مل">مل</option>
                            <option value="غرام">غرام</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">كم في الـ {editingItem.part1_name || 'شريط'}؟</label>
                          <input type="number" min="1" value={editingItem.part2_qty ?? 1} onChange={e => setEditingItem({...editingItem, part2_qty: parseInt(e.target.value)||1})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>
              <div className="p-5 border-t border-mint-line bg-white shrink-0">
                <button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 hover:bg-teal transition-colors shadow-md shadow-primary/20">
                  حفظ التعديلات
                </button>
              </div>
            </form>`;
if (submitButtonRegex.test(code)) {
    code = code.replace(submitButtonRegex, newSubmitButton);
} else {
    console.log("Could not find submit button");
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("SUCCESS: Re-implemented mobile-compatible UI and modal layout.");
