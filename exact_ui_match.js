const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Fix Modal Height to be static
code = code.replace(
  `max-h-[85vh] flex flex-col`,
  `h-[85vh] min-h-[600px] flex flex-col`
);

// 2. Update Render Block to exactly match screenshot
const startMarker = '<div className="divide-y divide-mint-line">';
const endMarker = '</div>\n                  )}\n                </div>\n              </div>\n            </div>\n\n            {/* ── Footer ── */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newJsx = `<div className="divide-y divide-transparent">
                      {cartItems.map((item, idx) => {
                        const hasParts = item.has_parts || false;
                        const hasSubparts = item.has_subparts || false;
                        const p1Name = item.part1_name || 'شريط';
                        const p2Name = item.part2_name || 'حبة';
                        const unitSize = (hasParts ? (item.part1_qty || 1) : 1) * ((hasParts && hasSubparts) ? (item.part2_qty || 1) : 1);
                        const effectiveQty = Math.round(item.qty * unitSize);
                        const upd = (field: string, val: any) => setCartItems(c => c.map((i, j) => j === idx ? { ...i, [field]: val } : i));

                        return (
                          <div key={idx} className={\`px-6 py-6 transition-colors \${idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}\`}>
                            {/* Name + Delete */}
                            <div className="flex items-center justify-between mb-6" dir="rtl">
                              <span className="font-black text-[15px] text-ink">{item.name}</span>
                              <button type="button" onClick={() => setCartItems(c => c.filter((_, j) => j !== idx))} className="text-coral hover:bg-coral-pale p-1.5 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </div>

                            {/* Base Qty & Price */}
                            <div className="flex flex-wrap items-end gap-6 mb-5" dir="rtl">
                              {/* الكمية */}
                              <div className="flex-1 min-w-[120px]">
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">الكمية (علبة)</label>
                                <div className="flex items-center bg-white rounded-xl border border-[#CBD5E1] overflow-hidden w-full h-[42px]">
                                  <button type="button" onClick={() => upd('qty', item.qty + 1)} className="w-12 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px]">+</button>
                                  <input type="number" value={item.qty} onChange={e => upd('qty', parseFloat(e.target.value)||0)} className="flex-1 w-10 text-center font-mono font-black text-[14px] text-ink outline-none border-x border-[#CBD5E1]" />
                                  <button type="button" onClick={() => upd('qty', Math.max(1, item.qty - 1))} className="w-12 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px]">−</button>
                                </div>
                              </div>
                              {/* سعر الشراء */}
                              <div className="flex-1 min-w-[120px]">
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر شراء العلبة</label>
                                <div className="relative">
                                  <input type="number" step="0.01" value={item.purchase_price} onChange={e => upd('purchase_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px]" />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">₪</span>
                                </div>
                              </div>
                              {/* الإجمالي */}
                              <div className="flex-1 min-w-[100px] text-left">
                                <label className="block text-[11px] font-bold text-ink-soft mb-2">الإجمالي للعلب</label>
                                <span className="text-[17px] font-mono font-black text-ink">₪{(item.qty * (item.purchase_price||0)).toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Parts Toggle Area */}
                            <div className="border border-ink-soft/30 rounded-2xl p-4 mb-4 bg-white" dir="rtl">
                              <label className="flex items-center justify-start gap-3 cursor-pointer group">
                                <div className={\`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors \${hasParts ? 'bg-ink border-ink' : 'bg-white border-[#CBD5E1]'}\`}>
                                  {hasParts && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                                </div>
                                <span className="text-[13px] font-bold text-ink">يُباع بالأجزاء (أشرطة / حبات)؟</span>
                                <input type="checkbox" className="hidden" checked={hasParts} onChange={e => upd('has_parts', e.target.checked)} />
                              </label>

                              {hasParts && (
                                <div className="mt-4 pt-4 border-t border-ink-soft/30">
                                  <h4 className="text-[12px] font-bold text-ink-soft mb-4 text-right">الجزء الأول (مثال: شريط)</h4>
                                  <div className="flex flex-wrap gap-4 mb-5">
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">اسم الجزء</label>
                                      <select value={p1Name} onChange={e => upd('part1_name', e.target.value)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary text-right h-[40px]">
                                        <option value="شريط">شريط</option>
                                        <option value="أمبولة">أمبولة</option>
                                        <option value="مغلف">مغلف</option>
                                        <option value="قطرة">قطرة</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[110px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">كم {p1Name} في العلبة؟</label>
                                      <input type="number" min="1" value={item.part1_qty} onChange={e => upd('part1_qty', parseInt(e.target.value)||1)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px]" />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر الـ {p1Name}</label>
                                      <div className="relative">
                                        <input type="number" step="0.01" value={item.part1_price} onChange={e => upd('part1_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px]" />
                                        <span className="absolute left-3 top-2.5 text-[11px] text-ink-soft font-bold">₪</span>
                                      </div>
                                    </div>
                                  </div>

                                  <label className="flex items-center justify-start gap-3 cursor-pointer group mt-2">
                                    <div className={\`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors \${hasSubparts ? 'bg-ink border-ink' : 'bg-white border-[#CBD5E1]'}\`}>
                                      {hasSubparts && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
                                    </div>
                                    <span className="text-[12px] font-bold text-ink">هل يباع الـ {p1Name} مجزأ؟ (مثال: حبة)</span>
                                    <input type="checkbox" className="hidden" checked={hasSubparts} onChange={e => upd('has_subparts', e.target.checked)} />
                                  </label>

                                  {hasSubparts && (
                                    <div className="mt-4 pt-4 border-t border-ink-soft/30 flex flex-wrap gap-4">
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">اسم الجزء</label>
                                        <select value={p2Name} onChange={e => upd('part2_name', e.target.value)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary text-right h-[40px]">
                                          <option value="حبة">حبة</option>
                                          <option value="مل">مل</option>
                                          <option value="غرام">غرام</option>
                                        </select>
                                      </div>
                                      <div className="flex-1 min-w-[110px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">كم {p2Name} في الـ {p1Name}؟</label>
                                        <input type="number" min="1" value={item.part2_qty} onChange={e => upd('part2_qty', parseInt(e.target.value)||1)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px]" />
                                      </div>
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر الـ {p2Name}</label>
                                        <div className="relative">
                                          <input type="number" step="0.01" value={item.part2_price} onChange={e => upd('part2_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px]" />
                                          <span className="absolute left-3 top-2.5 text-[11px] text-ink-soft font-bold">₪</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Effective Qty badge */}
                            <div className="flex justify-start" dir="rtl">
                               <div className="bg-[#F8FAFC] text-ink px-4 py-2.5 rounded-full border border-ink-soft/30 text-[12px] font-bold inline-flex items-center gap-2">
                                 📦 سيتم إضافة للمخزون: <span className="font-mono text-[14px] font-black">{effectiveQty}</span> {hasParts ? (hasSubparts ? p2Name : p1Name) : 'علبة'}
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>\n                  )}\n                </div>\n              </div>\n            </div>\n\n            {/* ── Footer ── */}`;

  code = code.substring(0, startIndex) + newJsx + code.substring(endIndex + endMarker.length);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully updated UI to match screenshot!');
} else {
  console.log('Could not find markers to replace block.');
}
