const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Add Status Radio Buttons
const itemSearchDiv = `              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">إضافة أصناف *</label>`;

const statusRadios = `              <div className="mb-4">
                <label className="block text-[13px] font-bold text-ink-soft mb-2">نوع الفاتورة (مبدئية أم فعلية)</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'completed' ? 'var(--primary)' : '', background: form.status === 'completed' ? 'var(--primary-pale)' : '' }}>
                    <input type="radio" name="status" checked={form.status === 'completed'} onChange={() => setForm({...form, status: 'completed'})} className="accent-primary" />
                    <div>
                      <div className="text-[14px] font-bold text-primary">فاتورة فعلية</div>
                      <div className="text-[11px] text-ink-soft">تضاف للمخزون وحساب المورد</div>
                    </div>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'draft' ? 'var(--coral)' : '', background: form.status === 'draft' ? 'var(--coral-pale)' : '' }}>
                    <input type="radio" name="status" checked={form.status === 'draft'} onChange={() => setForm({...form, status: 'draft'})} className="accent-coral" />
                    <div>
                      <div className="text-[14px] font-bold text-coral">فاتورة مبدئية</div>
                      <div className="text-[11px] text-ink-soft">حفظ فقط كطلبية</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">إضافة أصناف *</label>`;

// We have to be careful with Arabic text replacement due to encoding. Let's find the exact itemSearch div index.
const itemSearchRegex = /<div>\s*<label className="block text-\[13px\] font-bold text-ink-soft mb-1\.5">[^\n]+<\/label>\s*<div className="relative">\s*<input type="text" value=\{itemSearch\}/;

if (itemSearchRegex.test(code)) {
  const match = code.match(itemSearchRegex)[0];
  const replaced = match.replace('<div>', `
              <div className="mb-4">
                <label className="block text-[13px] font-bold text-ink-soft mb-2">نوع الفاتورة (مبدئية أم فعلية)</label>
                <div className="flex gap-3">
                  <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'completed' ? 'var(--primary)' : '', background: form.status === 'completed' ? 'var(--primary-pale)' : '' }}>
                    <input type="radio" name="status" checked={form.status === 'completed'} onChange={() => setForm({...form, status: 'completed'})} className="accent-primary" />
                    <div>
                      <div className="text-[13px] font-bold text-primary">فاتورة فعلية</div>
                      <div className="text-[11px] text-ink-soft">تضاف فوراً للمخزون</div>
                    </div>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'draft' ? 'var(--coral)' : '', background: form.status === 'draft' ? 'var(--coral-pale)' : '' }}>
                    <input type="radio" name="status" checked={form.status === 'draft'} onChange={() => setForm({...form, status: 'draft'})} className="accent-coral" />
                    <div>
                      <div className="text-[13px] font-bold text-coral">مبدئية (طلبية)</div>
                      <div className="text-[11px] text-ink-soft">للحفظ فقط بدون إدخال</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>`);
  code = code.replace(match, replaced);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully injected Radio Buttons!');
} else {
  console.log('Failed to match itemSearch string in frontend.');
}
