const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /const getStatusBadge = \(inv: any\) => \{[\s\S]*?return <span[\s\S]*?<\/span>;\r?\n\s*\};/;
const badgeNew = `const getStatusBadge = (inv: any) => {
    if (inv.status === 'draft') return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-ink/10 text-ink-soft">فاتورة مبدئية (طلبية)</span>;
    if (inv.remaining <= 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-teal-pale text-teal">مدفوع</span>;
    if (inv.paid_amount > 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-pale text-[#B9791C]">جزئي</span>;
    return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-coral-pale text-coral">غير مدفوع</span>;
  };`;

if (regex.test(code)) {
  code = code.replace(regex, badgeNew);
  console.log('Fixed getStatusBadge');
} else {
  console.log('Could not find getStatusBadge');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
