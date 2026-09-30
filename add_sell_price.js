const fs = require('fs');

// 1. Update Frontend
let pageCode = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// Add sell_price to addItemToCart
pageCode = pageCode.replace(
  `qty: 1, purchase_price: drug.cost || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0`,
  `qty: 1, purchase_price: drug.cost || 0, sell_price: drug.price || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0`
);

// Add sell_price to pullLowStock
pageCode = pageCode.replace(
  `newCart.push({ id: d.id, name: d.name, qty: needed, purchase_price: d.cost || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0 });`,
  `newCart.push({ id: d.id, name: d.name, qty: needed, purchase_price: d.cost || 0, sell_price: d.price || 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0 });`
);

// Update Quick Add Schema which we patched earlier
pageCode = pageCode.replace(
  `purchase_price: 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0`,
  `purchase_price: 0, sell_price: 0, has_parts: false, part1_name: 'شريط', part1_qty: 10, part1_price: 0, has_subparts: false, part2_name: 'حبة', part2_qty: 10, part2_price: 0`
);

// Update UI
const oldUiBlock = `{/* Base Qty & Price */}
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
                            </div>`;

const newUiBlock = `{/* Base Qty & Price */}
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
                              {/* سعر البيع */}
                              <div className="flex-1 min-w-[120px]">
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر بيع العلبة</label>
                                <div className="relative">
                                  <input type="number" step="0.01" value={item.sell_price} onChange={e => upd('sell_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px]" />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">₪</span>
                                </div>
                              </div>
                              {/* الإجمالي */}
                              <div className="flex-1 min-w-[100px] text-left">
                                <label className="block text-[11px] font-bold text-ink-soft mb-2">الإجمالي للعلب</label>
                                <span className="text-[17px] font-mono font-black text-ink">₪{(item.qty * (item.purchase_price||0)).toFixed(2)}</span>
                              </div>
                            </div>`;

pageCode = pageCode.replace(oldUiBlock, newUiBlock);
fs.writeFileSync('web/src/app/purchases/page.tsx', pageCode, 'utf8');

// 2. Update Backend
let serverCode = fs.readFileSync('roshetta_server/server.js', 'utf8');

serverCode = serverCode.replace(
  `"UPDATE inventory SET qty = qty + ?, cost = ?, units = ? WHERE id = ? AND pharmacy_id = ?", \n            [_effQty1, item.purchase_price || 0, unitsData, item.id, pharmacy_id]`,
  `"UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ? WHERE id = ? AND pharmacy_id = ?", \n            [_effQty1, item.purchase_price || 0, item.sell_price || 0, unitsData, item.id, pharmacy_id]`
);

serverCode = serverCode.replace(
  `"UPDATE inventory SET qty = qty + ?, cost = ?, units = ? WHERE id = ? AND pharmacy_id = ?", \n            [_effQty2, item.purchase_price || 0, unitsData, item.id, pharmacy_id]`,
  `"UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ? WHERE id = ? AND pharmacy_id = ?", \n            [_effQty2, item.purchase_price || 0, item.sell_price || 0, unitsData, item.id, pharmacy_id]`
);

fs.writeFileSync('roshetta_server/server.js', serverCode, 'utf8');

console.log("Added sell_price to UI and Backend correctly.");
