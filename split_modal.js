const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const oldModal = `      {/* ===== Add / Edit Modal ===== */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl border border-mint-line z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-mint-line">
              <div>
                <h2 className="text-[20px] font-black text-ink">{editingId ? "تعديل الفاتورة" : "فاتورة مشتريات جديدة"}</h2>
                <p className="text-[12px] text-ink-soft font-medium mt-0.5">{editingId ? "قم بتعديل بيانات الفاتورة" : "أضف فاتورة جديدة أو طلبية مبدئية"}</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line transition-colors text-ink-soft">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Type Selector */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({ ...form, status: "completed" })} className={\`p-3 rounded-xl border-2 text-right transition-all \${form.status === "completed" ? "border-primary bg-primary-pale" : "border-mint-line bg-bg hover:border-primary/40"}\`}>
                  <div className={\`text-[13px] font-black mb-0.5 \${form.status === "completed" ? "text-primary" : "text-ink"}\`}>فاتورة فعلية</div>
                  <div className="text-[12px] text-ink-soft">تضاف للمخزون وحساب المورد</div>
                </button>
                <button type="button" onClick={() => setForm({ ...form, status: "draft" })} className={\`p-3 rounded-xl border-2 text-right transition-all \${form.status === "draft" ? "border-coral bg-coral-pale" : "border-mint-line bg-bg hover:border-coral/40"}\`}>
                  <div className={\`text-[13px] font-black mb-0.5 \${form.status === "draft" ? "text-coral" : "text-ink"}\`}>طلبية مبدئية</div>
                  <div className="text-[12px] text-ink-soft">مسودة للطباعة فقط</div>
                </button>
              </div>

              {/* Supplier + Invoice Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-black text-ink-soft mb-1.5">المورد {form.status === "completed" && <span className="text-coral">*</span>}</label>
                  <select value={form.supplier_id} onChange={e => {
                    const sel = suppliers.find((s: any) => s.id === e.target.value);
                    setForm(p => ({ ...p, supplier_id: e.target.value, supplier_name: sel ? sel.name : "" }));
                  }} className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary transition-colors">
                    <option value="">اختر المورد...</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-black text-ink-soft mb-1.5">رقم فاتورة المورد</label>
                  <input type="text" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="اختياري" className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              {/* Branch */}
              {(user?.role === "owner" || user?.role === "superadmin") && branches.length > 0 && (
                <div>
                  <label className="block text-[13px] font-black text-ink-soft mb-1.5">الفرع</label>
                  <select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary transition-colors">
                    <option value="all">المخزن الرئيسي / كل الفروع</option>
                    {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              {/* Items Search */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-black text-ink-soft">الأصناف <span className="text-coral">*</span></label>
                  <button type="button" onClick={pullLowStock} className="flex items-center gap-1.5 text-[12px] font-bold text-primary bg-primary-pale hover:bg-primary hover:text-white px-3 py-1.5 rounded-xl transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                    جلب النواقص
                  </button>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2 bg-bg border border-mint-line rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                    <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="ابحث عن صنف..." className="flex-1 bg-transparent text-[14px] outline-none" />
                  </div>
                  {showDrop && itemSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-mint-line rounded-2xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {filteredInv.map((d: any) => (
                        <button key={d.id} type="button" onClick={() => addItemToCart(d)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg transition-colors text-right border-b border-mint-line last:border-0">
                          <span className="text-[14px] font-bold text-ink">{d.name}</span>
                          <span className="text-[12px] font-mono text-ink-soft">كمية: {d.qty}</span>
                        </button>
                      ))}
                      {filteredInv.length === 0 && (
                        <div className="p-5 text-center">
                          <p className="text-[13px] text-ink-soft font-medium mb-3">"{itemSearch}" غير موجود في المخزون</p>
                          <button type="button" onClick={() => { setShowDrop(false); setNewItem({ ...newItem, name: itemSearch }); setShowQuickAdd(true); }} className="px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all shadow-sm">
                            + إضافته كصنف جديد
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Items */}
              {cartItems.length > 0 && (
                <div className="bg-bg rounded-2xl overflow-hidden border border-mint-line">
                  <div className="px-4 py-3 border-b border-mint-line">
                    <span className="text-[13px] font-black text-ink-soft">{cartItems.length} صنف</span>
                  </div>
                  <div className="divide-y divide-mint-line">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white">
                        <span className="flex-1 font-bold text-[14px] text-ink truncate">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-bg rounded-xl border border-mint-line overflow-hidden">
                            <button type="button" onClick={() => { if (item.qty <= 1) setCartItems(c => c.filter((_, j) => j !== idx)); else setCartItems(c => c.map((i, j) => j === idx ? { ...i, qty: i.qty - 1 } : i)); }} className="w-8 h-8 flex items-center justify-center text-ink-soft hover:bg-mint-line transition-colors font-black">−</button>
                            <span className="px-3 font-mono font-black text-[14px] text-ink">{item.qty}</span>
                            <button type="button" onClick={() => setCartItems(c => c.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i))} className="w-8 h-8 flex items-center justify-center text-ink-soft hover:bg-mint-line transition-colors font-black">+</button>
                          </div>
                          <span className="text-[12px] text-ink-soft">×</span>
                          <input type="number" step="0.01" value={item.purchase_price} onChange={e => setCartItems(c => c.map((i, j) => j === idx ? { ...i, purchase_price: parseFloat(e.target.value) || 0 } : i))} className="w-20 bg-bg border border-mint-line rounded-xl px-2 py-1.5 text-center text-[13px] font-mono outline-none focus:border-primary" />
                          <span className="text-[12px] text-ink-soft">₪</span>
                          <button type="button" onClick={() => setCartItems(c => c.filter((_, j) => j !== idx))} className="w-8 h-8 flex items-center justify-center text-coral hover:bg-coral-pale rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-mint-line flex justify-between items-center bg-white">
                    <span className="text-[14px] font-black text-ink-soft">الإجمالي</span>
                    <span className="text-[22px] font-mono font-black text-primary">₪{cartTotal.toFixed(2)}</span>
                  </div>
                  {form.status !== "draft" && (
                    <div className="px-4 py-3 border-t border-dashed border-mint-line flex justify-between items-center">
                      <span className="text-[13px] font-bold text-ink-soft">المبلغ المدفوع الآن</span>
                      <div className="flex items-center gap-2">
                        <input type="number" step="0.01" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} placeholder="0.00" className="w-28 bg-bg border border-mint-line rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-teal text-left transition-colors" />
                        <span className="text-[13px] font-bold text-ink-soft">₪</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-mint-line flex gap-3">
              <button type="button" onClick={handleSave} disabled={loading} className="flex-1 bg-primary text-white font-black py-3 rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all text-[15px] shadow-lg shadow-primary/20">
                {loading ? "جاري الحفظ..." : form.status === "draft" ? "حفظ كطلبية مبدئية" : "حفظ وإدخال للمخزون"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 bg-bg text-ink font-bold rounded-2xl hover:bg-mint-line transition-all text-[15px]">
                إلغاء
              </button>
            </div>
          </div>
          {showDrop && <div className="absolute inset-0 z-[5]" onClick={() => setShowDrop(false)} />}
        </div>
      )}`;

const newModal = `      {/* ===== Add / Edit Modal (Split Panel) ===== */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden">
            
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-mint-line bg-white">
              <div className="flex items-center gap-3">
                <div className={\`w-9 h-9 rounded-xl flex items-center justify-center \${form.status === 'draft' ? 'bg-coral-pale' : 'bg-primary-pale'}\`}>
                  <svg className={\`w-5 h-5 \${form.status === 'draft' ? 'text-coral' : 'text-primary'}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-ink leading-tight">{editingId ? "تعديل الفاتورة" : "فاتورة مشتريات جديدة"}</h2>
                  <p className="text-[11px] text-ink-soft">{form.status === 'draft' ? 'طلبية مبدئية — لا تؤثر على المخزون' : 'فاتورة فعلية — تضاف للمخزون وحساب المورد'}</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line transition-colors text-ink-soft">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* ── Body: Split Panels ── */}
            <div className="flex flex-1 min-h-0">

              {/* RIGHT PANEL — Controls */}
              <div className="w-72 shrink-0 border-l border-mint-line bg-[#FAFAF8] flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  
                  {/* Type Toggle */}
                  <div>
                    <label className="block text-[11px] font-black text-ink-soft uppercase tracking-wide mb-2">نوع الفاتورة</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setForm({ ...form, status: "completed" })} className={\`py-2.5 rounded-xl border-2 text-[12px] font-black transition-all \${form.status === "completed" ? "border-primary bg-primary-pale text-primary" : "border-mint-line bg-white text-ink-soft hover:border-primary/40"}\`}>
                        فعلية
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, status: "draft" })} className={\`py-2.5 rounded-xl border-2 text-[12px] font-black transition-all \${form.status === "draft" ? "border-coral bg-coral-pale text-coral" : "border-mint-line bg-white text-ink-soft hover:border-coral/40"}\`}>
                        مبدئية
                      </button>
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[11px] font-black text-ink-soft uppercase tracking-wide mb-1.5">المورد {form.status === "completed" && <span className="text-coral">*</span>}</label>
                    <select value={form.supplier_id} onChange={e => {
                      const sel = suppliers.find((s: any) => s.id === e.target.value);
                      setForm(p => ({ ...p, supplier_id: e.target.value, supplier_name: sel ? sel.name : "" }));
                    }} className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary transition-colors">
                      <option value="">اختر المورد...</option>
                      {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-[11px] font-black text-ink-soft uppercase tracking-wide mb-1.5">رقم فاتورة المورد</label>
                    <input type="text" value={form.invoice_number} onChange={e => setForm(p => ({ ...p, invoice_number: e.target.value }))} placeholder="اختياري" className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors" />
                  </div>

                  {/* Branch */}
                  {(user?.role === "owner" || user?.role === "superadmin") && branches.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-black text-ink-soft uppercase tracking-wide mb-1.5">الفرع</label>
                      <select value={form.branch_id} onChange={e => setForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary transition-colors">
                        <option value="all">المخزن الرئيسي</option>
                        {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Paid Amount */}
                  {form.status !== "draft" && (
                    <div>
                      <label className="block text-[11px] font-black text-ink-soft uppercase tracking-wide mb-1.5">المبلغ المدفوع (₪)</label>
                      <input type="number" step="0.01" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} placeholder="0.00" className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-mono font-bold outline-none focus:border-teal transition-colors" />
                    </div>
                  )}
                </div>

                {/* Total block */}
                <div className="p-4 border-t border-mint-line bg-white">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] font-bold text-ink-soft">الإجمالي</span>
                    <span className="text-[20px] font-mono font-black text-primary">₪{cartTotal.toFixed(2)}</span>
                  </div>
                  {form.paid_amount && parseFloat(form.paid_amount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-ink-soft">المتبقي</span>
                      <span className="text-[14px] font-mono font-black text-coral">₪{Math.max(0, cartTotal - parseFloat(form.paid_amount)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* LEFT PANEL — Items */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Search bar */}
                <div className="px-4 py-3 border-b border-mint-line bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1">
                      <div className="flex items-center gap-2 bg-bg border border-mint-line rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
                        <svg className="w-4 h-4 text-ink-soft shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowDrop(true); }} onFocus={() => setShowDrop(true)} placeholder="ابحث عن صنف وأضفه..." className="flex-1 bg-transparent text-[13px] outline-none" />
                      </div>
                      {showDrop && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mint-line rounded-xl shadow-xl z-50 overflow-hidden max-h-44 overflow-y-auto">
                          {filteredInv.map((d: any) => (
                            <button key={d.id} type="button" onClick={() => addItemToCart(d)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg transition-colors text-right border-b border-mint-line last:border-0">
                              <span className="text-[13px] font-bold text-ink">{d.name}</span>
                              <span className="text-[11px] font-mono text-ink-soft">في المخزون: {d.qty}</span>
                            </button>
                          ))}
                          {filteredInv.length === 0 && (
                            <div className="p-4 text-center">
                              <p className="text-[12px] text-ink-soft mb-2">"{itemSearch}" غير موجود</p>
                              <button type="button" onClick={() => { setShowDrop(false); setNewItem({ ...newItem, name: itemSearch }); setShowQuickAdd(true); }} className="px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-bold hover:opacity-90">
                                + إضافته كصنف جديد
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={pullLowStock} className="flex items-center gap-1.5 text-[12px] font-bold text-primary bg-primary-pale hover:bg-primary hover:text-white px-3 py-2 rounded-xl transition-all whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      جلب النواقص
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-soft">{cartItems.length} صنف مضاف • اضغط على الصنف لتعديل الكمية والسعر</p>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-14 h-14 bg-bg rounded-2xl flex items-center justify-center mb-3">
                        <svg className="w-7 h-7 text-ink-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                      </div>
                      <p className="text-[14px] font-bold text-ink-soft">لم تضف أصنافاً بعد</p>
                      <p className="text-[12px] text-ink-soft/70 mt-1">ابحث عن صنف في الأعلى لإضافته</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-mint-line">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-bg/50 transition-colors">
                          <span className="flex-1 font-bold text-[13px] text-ink truncate">{item.name}</span>
                          <div className="flex items-center bg-white rounded-xl border border-mint-line overflow-hidden shrink-0">
                            <button type="button" onClick={() => { if (item.qty <= 1) setCartItems(c => c.filter((_, j) => j !== idx)); else setCartItems(c => c.map((i, j) => j === idx ? { ...i, qty: i.qty - 1 } : i)); }} className="w-7 h-7 flex items-center justify-center text-ink-soft hover:bg-bg transition-colors font-black text-[16px]">−</button>
                            <span className="px-2.5 font-mono font-black text-[13px] text-ink min-w-[2rem] text-center">{item.qty}</span>
                            <button type="button" onClick={() => setCartItems(c => c.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i))} className="w-7 h-7 flex items-center justify-center text-ink-soft hover:bg-bg transition-colors font-black text-[16px]">+</button>
                          </div>
                          <span className="text-[11px] text-ink-soft shrink-0">×</span>
                          <input type="number" step="0.01" value={item.purchase_price} onChange={e => setCartItems(c => c.map((i, j) => j === idx ? { ...i, purchase_price: parseFloat(e.target.value) || 0 } : i))} className="w-16 bg-white border border-mint-line rounded-lg px-2 py-1 text-center text-[12px] font-mono outline-none focus:border-primary shrink-0" />
                          <span className="text-[11px] text-ink-soft shrink-0">₪</span>
                          <span className="text-[12px] font-mono font-bold text-primary min-w-[3.5rem] text-left shrink-0">₪{(item.qty * item.purchase_price).toFixed(0)}</span>
                          <button type="button" onClick={() => setCartItems(c => c.filter((_, j) => j !== idx))} className="w-7 h-7 flex items-center justify-center text-coral hover:bg-coral-pale rounded-lg transition-colors shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-3.5 border-t border-mint-line bg-white flex gap-3">
              <button type="button" onClick={handleSave} disabled={loading} className="flex-1 bg-primary text-white font-black py-3 rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20">
                {loading ? "جاري الحفظ..." : form.status === "draft" ? "💾 حفظ كطلبية مبدئية" : "✅ حفظ وإدخال للمخزون"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 bg-bg text-ink font-bold rounded-2xl hover:bg-mint-line transition-all">
                إلغاء
              </button>
            </div>
          </div>
          {showDrop && <div className="absolute inset-0 z-[5]" onClick={() => setShowDrop(false)} />}
        </div>
      )}`;

if (code.includes(oldModal)) {
  code = code.replace(oldModal, newModal);
  console.log('Successfully replaced modal with split-panel design!');
} else {
  console.log('Old modal not found exactly');
  // Try a simpler replacement targeting the modal wrapper
  const simpleTarget = `      {/* ===== Add / Edit Modal ===== */}
      {showAdd && (`;
  if (code.includes(simpleTarget)) {
    console.log('Found modal start, need manual approach');
  }
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
