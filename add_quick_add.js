const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Add state
const stateRegex = /const \[showAdd, setShowAdd\] = useState\(false\);/;
if (stateRegex.test(code)) {
  code = code.replace(stateRegex, `const [showAdd, setShowAdd] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price_sell: "", minQty: "" });`);
  console.log('Added state');
}

// 2. Add handleQuickAdd
const handleQuickAddFn = `
  const handleQuickAdd = async () => {
    if (!newItem.name || !newItem.price_sell) { toast.error("يرجى إدخال اسم وسعر الصنف"); return; }
    setLoading(true);
    try {
      const bId = form.branch_id === 'all' ? (user?.branches?.[0]?.id || null) : form.branch_id;
      const res = await fetch(\`http://localhost:3001/api/pharmacies/\${user?.pharmacy_id}/inventory\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          price_sell: parseFloat(newItem.price_sell),
          minQty: parseInt(newItem.minQty) || 0,
          qty: 0,
          branch_id: bId
        })
      });
      const r = await res.json();
      if (r.success) {
        toast.success("تم إضافة الصنف للمخزون!");
        setCartItems(c => [...c, { id: r.id, name: newItem.name, qty: 1, purchase_price: 0 }]);
        setShowQuickAdd(false);
        setNewItem({ name: "", price_sell: "", minQty: "" });
        mutateInv();
      } else toast.error(r.error);
    } catch { toast.error("خطأ بالاتصال"); } finally { setLoading(false); }
  };
`;
code = code.replace('const addItemToCart = (drug: any) => {', handleQuickAddFn + '\n  const addItemToCart = (drug: any) => {');
console.log('Added handleQuickAdd');

// 3. Update search box UI to include the quick add button
const searchUIRegex = /<div className="relative">[\s\S]*?<\/div>\r?\n\s*\}\)\}\r?\n\s*<\/div>/;
// Let's use a simpler replace strategy for the search UI
const target = `<div className="relative">
                  <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDrop(true); }} onFocus={() => setShowItemDrop(true)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"`;

const replacement = `<div className="flex gap-2">
                  <div className="relative flex-1">
                  <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDrop(true); }} onFocus={() => setShowItemDrop(true)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"`;

code = code.replace(target, replacement);

const targetEnd = `</div>
                  )}
                </div>
                {cartItems.length > 0 && (`;

const replacementEnd = `</div>
                  )}
                </div>
                <button onClick={() => setShowQuickAdd(true)} className="px-4 bg-teal text-white rounded-xl text-[13px] font-bold shrink-0 hover:opacity-90 transition-all whitespace-nowrap">+ صنف جديد</button>
                </div>
                {cartItems.length > 0 && (`;

code = code.replace(targetEnd, replacementEnd);
console.log('Updated search UI');

// 4. Add the Quick Add Modal at the bottom
const modalsTarget = `{/* Preview Modal */}`;
const quickAddModal = `{/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line">
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">إضافة صنف جديد سريع</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">اسم الصنف <span className="text-coral">*</span></label>
                <input type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary font-bold" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">سعر البيع <span className="text-coral">*</span></label>
                  <input type="number" value={newItem.price_sell} onChange={e => setNewItem({...newItem, price_sell: e.target.value})} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary font-mono font-bold" placeholder="0.00" />
                </div>
                <div className="flex-1">
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">الحد الأدنى</label>
                  <input type="number" value={newItem.minQty} onChange={e => setNewItem({...newItem, minQty: e.target.value})} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary font-mono font-bold" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleQuickAdd} disabled={loading} className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50">حفظ الصنف</button>
              <button onClick={() => setShowQuickAdd(false)} className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      `;

code = code.replace(modalsTarget, quickAddModal + modalsTarget);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
