const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const oldCard = `                <div key={inv.id} className={\`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden \${isDraft ? "border-l-4 border-l-ink/20 border-mint-line" : "border-mint-line"}\`}>
                  <div className="p-4 flex items-start gap-4">
                    {/* Left: Icon */}
                    <div className={\`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 \${isDraft ? "bg-[#F5F5F0]" : "bg-primary-pale"}\`}>
                      <svg className={\`w-6 h-6 \${isDraft ? "text-ink-soft" : "text-primary"}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-black text-[16px] text-ink truncate">{inv.supplier_name || (isDraft ? "طلبية بدون مورد" : "مورد غير محدد")}</span>
                        <StatusBadge inv={inv} />
                        {inv.invoice_number && <span className="text-[12px] font-mono text-ink-soft bg-bg px-2 py-0.5 rounded-lg">#{inv.invoice_number}</span>}
                      </div>
                      <p className="text-[12px] text-ink-soft mb-2">{new Date(inv.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
                      {/* Items chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {items.slice(0, 4).map((item: any, idx: number) => (
                          <span key={idx} className="bg-bg text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg border border-mint-line">
                            {item.name} <span className="text-ink-soft">× {item.qty}</span>
                          </span>
                        ))}
                        {items.length > 4 && <span className="text-[11px] text-ink-soft font-bold px-2.5 py-1">+{items.length - 4} أخرى</span>}
                      </div>
                    </div>

                    {/* Right: Price & Actions */}
                    <div className="shrink-0 text-left flex flex-col items-end gap-3">
                      <div>
                        <p className="text-[24px] font-mono font-black text-ink leading-none">₪{(inv.total_cost || 0).toFixed(2)}</p>
                        {(inv.remaining || 0) > 0 && (
                          <p className="text-[12px] font-bold text-coral text-left mt-1">متبقي: ₪{(inv.remaining || 0).toFixed(2)}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(inv)} className={\`px-3 py-2 rounded-xl text-[13px] font-bold transition-all \${isDraft ? "bg-primary text-white hover:opacity-90 shadow-sm" : "bg-primary-pale text-primary hover:bg-primary hover:text-white"}\`}>
                          {isDraft ? "إدخال للمخزون" : "تعديل"}
                        </button>
                        <button onClick={() => setShowPreview(inv)} className="px-3 py-2 bg-bg text-ink-soft rounded-xl text-[13px] font-bold hover:bg-mint-line transition-all">
                          معاينة
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="px-3 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>`;

const newCard = `                <div key={inv.id} className={\`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all \${isDraft ? "border-r-4 border-r-[#ccc] border-mint-line" : "border-mint-line"}\`}>
                  <div className="p-5">
                    {/* Row 1: Icon + Name + Badge | Price */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={\`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 \${isDraft ? "bg-[#F5F5F0]" : "bg-primary-pale"}\`}>
                          <svg className={\`w-5 h-5 \${isDraft ? "text-ink-soft" : "text-primary"}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-[17px] text-ink">{inv.supplier_name || (isDraft ? "طلبية بدون مورد" : "مورد غير محدد")}</span>
                            <StatusBadge inv={inv} />
                            {inv.invoice_number && <span className="text-[12px] font-mono text-ink-soft bg-bg px-2 py-0.5 rounded-lg border border-mint-line">#{inv.invoice_number}</span>}
                          </div>
                          <p className="text-[12px] text-ink-soft">{new Date(inv.date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                      </div>
                      {/* Price Block */}
                      <div className="shrink-0 text-left">
                        <p className="text-[22px] font-mono font-black text-ink leading-tight">₪{(inv.total_cost || 0).toFixed(2)}</p>
                        {(inv.remaining || 0) > 0 && (
                          <p className="text-[12px] font-bold text-coral text-left">متبقي ₪{(inv.remaining || 0).toFixed(2)}</p>
                        )}
                        {(inv.remaining || 0) <= 0 && inv.status !== 'draft' && (
                          <p className="text-[12px] font-bold text-teal text-left">مدفوعة بالكامل ✓</p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Items + Actions */}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-mint-line">
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {items.slice(0, 4).map((item: any, idx: number) => (
                          <span key={idx} className="bg-bg text-primary text-[11px] font-bold px-2.5 py-1 rounded-lg border border-mint-line whitespace-nowrap">
                            {item.name} <span className="text-ink-soft font-medium">× {item.qty}</span>
                          </span>
                        ))}
                        {items.length > 4 && <span className="text-[11px] text-ink-soft py-1">+{items.length - 4} أخرى</span>}
                        {items.length === 0 && <span className="text-[12px] text-ink-soft italic">لا توجد أصناف</span>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEdit(inv)} className={\`px-4 py-2 rounded-xl text-[13px] font-bold transition-all \${isDraft ? "bg-primary text-white hover:opacity-90" : "bg-primary-pale text-primary hover:bg-primary hover:text-white"}\`}>
                          {isDraft ? "إدخال للمخزون" : "تعديل"}
                        </button>
                        <button onClick={() => setShowPreview(inv)} className="px-4 py-2 bg-bg text-ink-soft rounded-xl text-[13px] font-bold hover:bg-mint-line transition-all">معاينة</button>
                        <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral-pale transition-all">حذف</button>
                      </div>
                    </div>
                  </div>
                </div>`;

if (code.includes('border-l-4 border-l-ink/20 border-mint-line')) {
  code = code.replace(oldCard, newCard);
  console.log('Card redesigned!');
} else {
  console.log('Old card not found exactly, trying loose replace...');
  // Try with just the outer div
  code = code.replace(
    /\<div key=\{inv\.id\} className=\{`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden \$\{isDraft \? "border-l-4 border-l-ink\/20 border-mint-line" : "border-mint-line"\}`\}/,
    `<div key={inv.id} className={\`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all \${isDraft ? "border-r-4 border-r-[#ccc]" : "border-mint-line"}\`}`
  );
  console.log('Outer div class replaced');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
