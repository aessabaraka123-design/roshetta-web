const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

// 1. Expand Med interface
code = code.replace(
  `interface Med {
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
}`,
  `interface Med {
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
  has_parts?: boolean;
  part1_name?: string;
  part1_qty?: number;
  part1_price?: number;
  has_subparts?: boolean;
  part2_name?: string;
  part2_qty?: number;
  part2_price?: number;
}`
);

// 2. Update handleUpdate to also send units/parts fields
code = code.replace(
  `        body: JSON.stringify({
          name: editingItem.name,
          manufacturer: editingItem.manufacturer,
          category: editingItem.category,
          price_sell: editingItem.price,
          price_buy: editingItem.cost,
          qty: editingItem.qty,
          batch_number: editingItem.batch_number,
          expiry_date: editingItem.expiry_date
        }),`,
  `        body: JSON.stringify({
          name: editingItem.name,
          manufacturer: editingItem.manufacturer,
          category: editingItem.category,
          price_sell: editingItem.price,
          price_buy: editingItem.cost,
          qty: editingItem.qty,
          batch_number: editingItem.batch_number,
          expiry_date: editingItem.expiry_date,
          units: JSON.stringify({
            has_parts: editingItem.has_parts || false,
            part1_name: editingItem.part1_name || 'شريط',
            part1_qty: editingItem.part1_qty || 1,
            part1_price: editingItem.part1_price || 0,
            has_subparts: editingItem.has_subparts || false,
            part2_name: editingItem.part2_name || 'حبة',
            part2_qty: editingItem.part2_qty || 1,
            part2_price: editingItem.part2_price || 0,
          })
        }),`
);

// 3. Inject units section before the submit button using the CRLF line endings in the file
const oldBtn = `              <button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 mt-2 hover:bg-teal transition-colors">\r\n                حفظ التعديلات\r\n              </button>\r\n          `;

const newBtn = `              {/* ── الوحدات والأجزاء ── */}
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
                    <div className="grid grid-cols-3 gap-2">
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
                      <div>
                        <label className="block text-[11px] font-bold text-ink-soft mb-1">سعر الجزء</label>
                        <input type="number" step="0.01" value={editingItem.part1_price ?? 0} onChange={e => setEditingItem({...editingItem, part1_price: parseFloat(e.target.value)||0})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center" placeholder="0.00" />
                      </div>
                    </div>

                    <label className="flex items-center justify-between cursor-pointer pt-2">
                      <span className="text-[12px] font-bold text-ink-soft">هل يباع مجزأ؟ (مثال: حبة)</span>
                      <div
                        onClick={() => setEditingItem({...editingItem, has_subparts: !editingItem.has_subparts})}
                        className={\`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors \${editingItem.has_subparts ? 'bg-primary border-primary' : 'bg-white border-mint-line'}\`}
                      >
                        {editingItem.has_subparts && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                    </label>

                    {editingItem.has_subparts && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-mint-line">
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">اسم الجزء</label>
                          <select value={editingItem.part2_name || 'حبة'} onChange={e => setEditingItem({...editingItem, part2_name: e.target.value})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-right">
                            <option value="حبة">حبة</option>
                            <option value="مل">مل</option>
                            <option value="غرام">غرام</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">كم في الجزء الأول؟</label>
                          <input type="number" min="1" value={editingItem.part2_qty ?? 1} onChange={e => setEditingItem({...editingItem, part2_qty: parseInt(e.target.value)||1})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-ink-soft mb-1">سعر الجزء</label>
                          <input type="number" step="0.01" value={editingItem.part2_price ?? 0} onChange={e => setEditingItem({...editingItem, part2_price: parseFloat(e.target.value)||0})} className="w-full border border-mint-line rounded-lg p-2 text-[12px] outline-none focus:border-primary text-center" placeholder="0.00" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 mt-2 hover:bg-teal transition-colors">
                حفظ التعديلات
              </button>
          `;

if (code.includes(oldBtn)) {
  code = code.replace(oldBtn, newBtn);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log('SUCCESS: Units/Parts section added to inventory edit modal!');
} else {
  console.log('ERROR: Could not find button block.');
  // debug
  const idx = code.indexOf('حفظ التعديلات');
  console.log('char context:', JSON.stringify(code.substring(idx-10, idx+30)));
}
