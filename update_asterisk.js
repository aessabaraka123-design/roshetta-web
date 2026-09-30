const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const supplierLabelRegex = /<label className="block text-\[13px\] font-bold text-ink-soft mb-1\.5">اسم المورد \*<\/label>/;
if (supplierLabelRegex.test(code)) {
  const replacement = `<label className="block text-[13px] font-bold text-ink-soft mb-1.5">اسم المورد {form.status === 'completed' && '*'}</label>`;
  code = code.replace(supplierLabelRegex, replacement);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully updated supplier label asterisk!');
} else {
  console.log('Failed to match supplier label.');
}
