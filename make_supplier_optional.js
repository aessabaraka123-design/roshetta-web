const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /if \(!form\.supplier_name && !form\.supplier_id\) return toast\.error\("يرجى اختيار أو كتابة اسم المورد"\);/;

if(regex.test(code)) {
  const replacement = `if (form.status !== 'draft' && !form.supplier_name && !form.supplier_id) return toast.error("يرجى اختيار اسم المورد للفاتورة الفعلية");`;
  code = code.replace(regex, replacement);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully made supplier optional for drafts!');
} else {
  console.log('Failed to match handleSave validation regex!');
}
