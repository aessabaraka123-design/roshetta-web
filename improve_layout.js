const fs = require('fs');

let pageCode = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

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

const newUiBlock = `{/* Base Qty & Price */}
                            <div className="grid grid-cols-4 gap-4 items-end mb-5" dir="rtl">
                              {/* الكمية */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">الكمية (علبة)</label>
                                <div className="flex items-center bg-white rounded-xl border border-[#CBD5E1] overflow-hidden w-full h-[42px]">
                                  <button type="button" onClick={() => upd('qty', item.qty + 1)} className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px] transition-colors">+</button>
                                  <input type="number" value={item.qty} onChange={e => upd('qty', parseFloat(e.target.value)||0)} className="flex-1 w-full text-center font-mono font-black text-[14px] text-ink outline-none border-x border-[#CBD5E1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                  <button type="button" onClick={() => upd('qty', Math.max(1, item.qty - 1))} className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px] transition-colors">−</button>
                                </div>
                              </div>
                              {/* سعر الشراء */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر شراء العلبة</label>
                                <div className="relative">
                                  <input type="number" step="0.01" value={item.purchase_price} onChange={e => upd('purchase_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">₪</span>
                                </div>
                              </div>
                              {/* سعر البيع */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">سعر بيع العلبة</label>
                                <div className="relative">
                                  <input type="number" step="0.01" value={item.sell_price} onChange={e => upd('sell_price', parseFloat(e.target.value)||0)} className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">₪</span>
                                </div>
                              </div>
                              {/* الإجمالي */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-right">الإجمالي للعلب</label>
                                <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 text-[15px] font-mono font-black text-primary text-center h-[42px] flex items-center justify-center">
                                  ₪{(item.qty * (item.purchase_price||0)).toFixed(2)}
                                </div>
                              </div>
                            </div>`;

if (pageCode.includes(oldUiBlock)) {
  pageCode = pageCode.replace(oldUiBlock, newUiBlock);
  fs.writeFileSync('web/src/app/purchases/page.tsx', pageCode, 'utf8');
  console.log("Successfully formatted layout grid and hidden spin buttons!");
} else {
  console.log("Could not find the block to replace.");
}

// Let's also hide spin buttons for all other inputs dynamically in the same file
pageCode = pageCode.replace(
    /className="(w-full bg-white border border-\[#CBD5E1\] rounded-xl px-3 py-2 text-\[14px\] font-mono outline-none focus:border-primary text-center h-\[40px\])"/g,
    'className="$1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"'
);
fs.writeFileSync('web/src/app/purchases/page.tsx', pageCode, 'utf8');
