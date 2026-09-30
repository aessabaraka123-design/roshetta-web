const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Expand newItem state
code = code.replace(
  `const [newItem, setNewItem] = useState({ name: "", price_sell: "", minQty: "" });`,
  `const [newItem, setNewItem] = useState({ name: "", scientificName: "", category: "", price_sell: "", price_buy: "", minQty: "", expiry: "", barcode: "" });`
);

// 2. Reset newItem after quick add
code = code.replace(
  `setShowQuickAdd(false); setNewItem({ name: "", price_sell: "", minQty: "" }); mutateInv();`,
  `setShowQuickAdd(false); setNewItem({ name: "", scientificName: "", category: "", price_sell: "", price_buy: "", minQty: "", expiry: "", barcode: "" }); mutateInv();`
);

// 3. Update handleQuickAdd to send all new fields
code = code.replace(
  `body: JSON.stringify({ name: newItem.name, price_sell: parseFloat(newItem.price_sell), minQty: parseInt(newItem.minQty) || 0, qty: 0, branch_id: form.branch_id === "all" ? null : form.branch_id })`,
  `body: JSON.stringify({ name: newItem.name, scientificName: newItem.scientificName, category: newItem.category || "General medicines", price_sell: parseFloat(newItem.price_sell) || 0, price_buy: parseFloat(newItem.price_buy) || 0, cost: parseFloat(newItem.price_buy) || 0, minQty: parseInt(newItem.minQty) || 0, expiry: newItem.expiry || "", barcode: newItem.barcode || "", qty: 0, branch_id: form.branch_id === "all" ? null : form.branch_id })`
);

// 4. Replace the Quick Add modal
const oldModal = `      {/* ===== Quick Add Item Modal ===== */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-mint-line z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary-pale rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              </div>
              <div>
                <h3 className="text-[18px] font-black text-ink">تعريف صنف جديد</h3>
                <p className="text-[12px] text-ink-soft">سيضاف للمخزون وللفاتورة معاً</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-black text-ink-soft mb-1.5">اسم الصنف <span className="text-coral">*</span></label>
                <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} autoFocus className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary transition-colors" placeholder="مثال: أموكسيل 500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-black text-ink-soft mb-1.5">سعر البيع (₪) <span className="text-coral">*</span></label>
                  <input type="number" value={newItem.price_sell} onChange={e => setNewItem({ ...newItem, price_sell: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-mono font-bold outline-none focus:border-primary transition-colors" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[13px] font-black text-ink-soft mb-1.5">الحد الأدنى</label>
                  <input type="number" value={newItem.minQty} onChange={e => setNewItem({ ...newItem, minQty: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-mono font-bold outline-none focus:border-primary transition-colors" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={handleQuickAdd} disabled={loading} className="flex-1 bg-primary text-white font-black py-3.5 rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all">
                {loading ? "جاري الإضافة..." : "إضافة وإدراج بالفاتورة"}
              </button>
              <button type="button" onClick={() => setShowQuickAdd(false)} className="px-5 py-3.5 bg-bg text-ink font-bold rounded-2xl hover:bg-mint-line transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}`;

const newModal = `      {/* ===== Quick Add Item Modal ===== */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-mint-line z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-mint-line bg-white shrink-0">
              <div>
                <h3 className="text-[17px] font-black text-ink">تعريف صنف جديد</h3>
                <p className="text-[11px] text-ink-soft">سيُضاف للمخزون وللفاتورة معاً</p>
              </div>
              <button type="button" onClick={() => setShowQuickAdd(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line text-ink-soft transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" dir="rtl">
              {/* اسم الصنف */}
              <div>
                <label className="block text-[12px] font-black text-ink-soft mb-1.5">اسم الصنف <span className="text-coral">*</span></label>
                <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} autoFocus className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-bold outline-none focus:border-primary transition-colors text-right" placeholder="مثال: أموكسيل 500" />
              </div>

              {/* الشركة المصنعة + الفئة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">الشركة المصنّعة</label>
                  <input type="text" value={newItem.scientificName} onChange={e => setNewItem({ ...newItem, scientificName: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors text-right" placeholder="مثال: Pfizer" />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">الفئة العلاجية</label>
                  <input type="text" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors text-right" placeholder="مثال: مضاد حيوي" />
                </div>
              </div>

              {/* سعر الشراء + سعر البيع + الكمية الدنيا */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">سعر الشراء (₪)</label>
                  <input type="number" step="0.01" value={newItem.price_buy} onChange={e => setNewItem({ ...newItem, price_buy: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">سعر البيع (₪) <span className="text-coral">*</span></label>
                  <input type="number" step="0.01" value={newItem.price_sell} onChange={e => setNewItem({ ...newItem, price_sell: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">الحد الأدنى</label>
                  <input type="number" value={newItem.minQty} onChange={e => setNewItem({ ...newItem, minQty: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center" placeholder="5" />
                </div>
              </div>

              {/* تاريخ الصلاحية + رقم الدفعة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">تاريخ الصلاحية</label>
                  <input type="date" value={newItem.expiry} onChange={e => setNewItem({ ...newItem, expiry: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">الباركود</label>
                  <input type="text" value={newItem.barcode} onChange={e => setNewItem({ ...newItem, barcode: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-right" placeholder="اختياري" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-mint-line bg-bg shrink-0">
              <button type="button" onClick={handleQuickAdd} disabled={loading} className="w-full bg-primary text-white font-black py-3 rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all text-[15px]">
                {loading ? "جاري الإضافة..." : "✅ إضافة للمخزون وإدراج بالفاتورة"}
              </button>
            </div>
          </div>
        </div>
      )}`;

if (code.includes(oldModal)) {
  code = code.replace(oldModal, newModal);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Quick Add modal redesigned successfully!');
} else {
  console.log('Could not find old modal block exactly.');
}
