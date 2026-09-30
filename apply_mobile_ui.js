const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. cartTotal
code = code.replace(
  /const cartTotal = cartItems\.reduce\(\(s, i\) => \{[\s\S]*?\}, 0\);/,
  `const cartTotal = cartItems.reduce((s, i) => s + (i.qty || 0) * (i.purchase_price || 0), 0);`
);

// 2. addItemToCart
code = code.replace(
  /qty: 1,\s*strips_per_box: 10,\s*pills_per_strip: 10,\s*price_per_strip: 0,\s*price_per_pill: 0,\s*purchase_price: 0,\s*unit_size: 100, \/\/ strips_per_box \* pills_per_strip/,
  `qty: 1, purchase_price: drug.cost || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0`
);

// 3. pullLowStock
code = code.replace(
  /qty: needed, strips_per_box: 10, pills_per_strip: 10, price_per_strip: 0, price_per_pill: 0, purchase_price: 0, unit_size: 100 \}\);/g,
  `qty: needed, purchase_price: d.cost || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0 });`
);

// 4. handleSave
code = code.replace(
  /items: cartItems\.map\(item => \(\{\s*\.\.\.item,\s*unit_size: \(item\.strips_per_box \|\| 1\) \* \(item\.pills_per_strip \|\| 1\),\s*purchase_price: item\.price_per_strip \|\| item\.purchase_price \|\| 0,\s*\}\)\),/,
  `items: cartItems.map(item => ({
              ...item,
              unit_size: (item.has_parts ? (item.part1_qty || 1) : 1) * ((item.has_parts && item.has_subparts) ? (item.part2_qty || 1) : 1),
            })),`
);

// 5. Replace Render Block
const startMarker = '<div className="divide-y divide-mint-line">';
const endMarker = '</div>\n                  )}\n                </div>\n              </div>\n            </div>\n\n            {/* ── Footer ── */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newJsx = `<div className="divide-y divide-mint-line">
                      {cartItems.map((item, idx) => {
                        const hasParts = item.has_parts || false;
                        const hasSubparts = item.has_subparts || false;
                        const p1Name = item.part1_name || 'شريط';
                        const p2Name = item.part2_name || 'حبة';
                        const unitSize = (hasParts ? (item.part1_qty || 1) : 1) * ((hasParts && hasSubparts) ? (item.part2_qty || 1) : 1);
                        const effectiveQty = Math.round(item.qty * unitSize);
                        const upd = (field: string, val: any) => setCartItems(c => c.map((i, j) => j === idx ? { ...i, [field]: val } : i));

                        return (
                          <div key={idx} className="px-4 py-5 bg-white hover:bg-bg/30 transition-colors">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                              <span className="font-black text-[15px] text-ink">{item.name}</span>
                              <button type="button" onClick={() => setCartItems(c => c.filter((_, j) => j !== idx))} className="w-8 h-8 flex items-center justify-center text-coral hover:bg-coral-pale rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>

                            {/* Base Qty & Price */}
                            <div className="flex flex-wrap gap-4 mb-5">
                              <div className="flex-1 min-w-[120px]">
                                <label className="block text-[11px] font-bold text-ink-soft mb-1.5">الكمية (علبة)</label>
                                <div className="flex items-center bg-white rounded-xl border border-mint-line overflow-hidden w-full h-[42px]">
                                  <button type="button" onClick={() => upd('qty', Math.max(1, item.qty - 1))} className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-black">−</button>
                                  <input type="number" value={item.qty} onChange={e => upd('qty', parseFloat(e.target.value)||0)} className="flex-1 w-10 text-center font-mono font-black text-[14px] text-ink outline-none" />
                                  <button type="button" onClick={() => upd('qty', item.qty + 1)} className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-black">+</button>
                                </div>
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className="block text-[11px] font-bold text-ink-soft mb-1.5">سعر شراء العلبة</label>
                                <div className="relative">
                                  <input type="number" step="0.01" value={item.purchase_price} onChange={e => upd('purchase_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-mint-line rounded-xl px-3 py-2.5 text-[14px] font-mono font-bold outline-none focus:border-primary pl-8 h-[42px]" />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">₪</span>
                                </div>
                              </div>
                              <div className="flex-1 min-w-[100px] flex flex-col justify-center">
                                <label className="block text-[11px] font-bold text-ink-soft mb-1.5">الإجمالي للعلب</label>
                                <span className="text-[17px] font-mono font-black text-primary">₪{(item.qty * (item.purchase_price||0)).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Parts Toggle Area */}
                            <div className="bg-[#F4F8FB] border border-[#E2E8F0] rounded-2xl p-5">
                              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                                <div className={\`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors \${hasParts ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-white border-[#CBD5E1] group-hover:border-[#3b82f6]'}\`}>
                                  {hasParts && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                                </div>
                                <input type="checkbox" className="hidden" checked={hasParts} onChange={e => upd('has_parts', e.target.checked)} />
                                <span className="text-[13px] font-black text-[#334155]">يُباع بالأجزاء (أشرطة / حبات)؟</span>
                              </label>

                              {hasParts && (
                                <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
                                  <h4 className="text-[12px] font-black text-[#64748B] mb-4">الجزء الأول (مثال: شريط)</h4>
                                  <div className="flex flex-wrap gap-4 mb-5">
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-1.5">اسم الجزء</label>
                                      <select value={p1Name} onChange={e => upd('part1_name', e.target.value)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[13px] font-bold text-ink outline-none focus:border-primary">
                                        <option value="شريط">شريط</option>
                                        <option value="أمبولة">أمبولة</option>
                                        <option value="مغلف">مغلف</option>
                                        <option value="قطرة">قطرة</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[110px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-1.5">كم {p1Name} في العلبة؟</label>
                                      <input type="number" min="1" value={item.part1_qty} onChange={e => upd('part1_qty', parseInt(e.target.value)||1)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[14px] font-mono outline-none focus:border-primary" />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-1.5">سعر الـ {p1Name}</label>
                                      <div className="relative">
                                        <input type="number" step="0.01" value={item.part1_price} onChange={e => upd('part1_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[14px] font-mono outline-none focus:border-primary pl-7" />
                                        <span className="absolute left-3 top-3 text-[11px] text-ink-soft font-bold">₪</span>
                                      </div>
                                    </div>
                                  </div>

                                  <label className="flex items-center gap-3 cursor-pointer group w-fit mt-2">
                                    <div className={\`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors \${hasSubparts ? 'bg-[#3b82f6] border-[#3b82f6]' : 'bg-white border-[#CBD5E1] group-hover:border-[#3b82f6]'}\`}>
                                      {hasSubparts && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={hasSubparts} onChange={e => upd('has_subparts', e.target.checked)} />
                                    <span className="text-[12px] font-bold text-[#475569]">هل يباع الـ {p1Name} مجزأ؟ (مثال: حبة)</span>
                                  </label>

                                  {hasSubparts && (
                                    <div className="mt-5 pt-5 border-t border-[#E2E8F0] flex flex-wrap gap-4">
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-1.5">اسم الجزء</label>
                                        <select value={p2Name} onChange={e => upd('part2_name', e.target.value)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[13px] font-bold text-ink outline-none focus:border-primary">
                                          <option value="حبة">حبة</option>
                                          <option value="مل">مل</option>
                                          <option value="غرام">غرام</option>
                                        </select>
                                      </div>
                                      <div className="flex-1 min-w-[110px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-1.5">كم {p2Name} في الـ {p1Name}؟</label>
                                        <input type="number" min="1" value={item.part2_qty} onChange={e => upd('part2_qty', parseInt(e.target.value)||1)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[14px] font-mono outline-none focus:border-primary" />
                                      </div>
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-1.5">سعر الـ {p2Name}</label>
                                        <div className="relative">
                                          <input type="number" step="0.01" value={item.part2_price} onChange={e => upd('part2_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-[14px] font-mono outline-none focus:border-primary pl-7" />
                                          <span className="absolute left-3 top-3 text-[11px] text-ink-soft font-bold">₪</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Effective Qty badge */}
                            <div className="mt-4 flex justify-end">
                               <div className="bg-[#E0F2FE] text-[#0369A1] px-4 py-2 rounded-xl text-[12px] font-bold shadow-sm border border-[#BAE6FD]">
                                 📦 سيتم إضافة للمخزون: <span className="font-mono text-[14px] mx-1">{effectiveQty}</span> {hasParts ? (hasSubparts ? p2Name : p1Name) : 'علبة'}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>\n                  )}\n                </div>\n              </div>\n            </div>\n\n            {/* ── Footer ── */}`;

  code = code.substring(0, startIndex) + newJsx + code.substring(endIndex + endMarker.length);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully updated UI!');
} else {
  console.log('Could not find markers to replace block.');
}
