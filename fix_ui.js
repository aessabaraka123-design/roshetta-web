const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Fix getStatusBadge
const badgeRegex = /const getStatusBadge = \(inv: any\) => \{[\s\S]*?غير مدفوع<\/span>;\r?\n\s*\};/;
const badgeNew = `const getStatusBadge = (inv: any) => {
    if (inv.status === 'draft') return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-ink/10 text-ink-soft">فاتورة مبدئية (طلبية)</span>;
    if (inv.remaining <= 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-teal-pale text-teal">مدفوع</span>;
    if (inv.paid_amount > 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-pale text-[#B9791C]">جزئي</span>;
    return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-coral-pale text-coral">غير مدفوع</span>;
  };`;

if (badgeRegex.test(code)) {
  code = code.replace(badgeRegex, badgeNew);
  console.log('Fixed getStatusBadge');
} else {
  console.log('Could not find getStatusBadge');
}

// 2. Fix action buttons
const btnRegex = /<div className="flex gap-2">[\s\S]*?\{inv\.remaining > 0 && \([\s\S]*?<button onClick=\{\(\) => setShowPayModal\(inv\)\} className="px-4 py-2 bg-teal text-white rounded-xl text-\[13px\] font-bold hover:opacity-90 transition-all">تسديد دفعة<\/button>[\s\S]*?\)|\}[\s\S]*?<button onClick=\{\(\) => handleDelete\(inv\.id\)\} className="px-4 py-2 bg-bg text-coral rounded-xl text-\[13px\] font-bold hover:bg-coral hover:text-white transition-all">حذف<\/button>[\s\S]*?<\/div>/;

// I'll just use a simpler replacement for the buttons section by replacing the exact block
const btnOld = `<div className="flex gap-2">
                    {inv.remaining > 0 && (
                      <button onClick={() => setShowPayModal(inv)} className="px-4 py-2 bg-teal text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">تسديد دفعة</button>
                    )}
                    <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">حذف</button>
                  </div>`;
const btnOldWin = btnOld.replace(/\n/g, '\r\n');

const btnNew = `<div className="flex gap-2">
                    {inv.status === 'draft' ? (
                      <button onClick={() => handleEditDraft(inv)} className="px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">إدخال للمخزون</button>
                    ) : (
                      inv.remaining > 0 && (
                        <button onClick={() => setShowPayModal(inv)} className="px-4 py-2 bg-teal text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">تسديد دفعة</button>
                      )
                    )}
                    <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">حذف</button>
                  </div>`;

if (code.includes(btnOld)) {
  code = code.replace(btnOld, btnNew);
  console.log('Fixed action buttons (unix)');
} else if (code.includes(btnOldWin)) {
  code = code.replace(btnOldWin, btnNew);
  console.log('Fixed action buttons (win)');
} else {
  console.log('Could not find action buttons directly. Trying regex...');
  
  // If not found, let's use a very loose regex
  const looseRegex = /<div className="flex gap-2">[\s\S]*?setShowPayModal[\s\S]*?handleDelete[\s\S]*?<\/div>/;
  if(looseRegex.test(code)){
      code = code.replace(looseRegex, btnNew);
      console.log('Fixed action buttons (regex)');
  }
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
