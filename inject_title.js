const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const titleRegex = /<h3 className="text-\[20px\] font-black text-primary">[^<]+<\/h3>/;
if (titleRegex.test(code)) {
  const match = code.match(titleRegex)[0];
  code = code.replace(match, '<h3 className="text-[20px] font-black text-primary">{editingDraftId ? "إدخال فاتورة فعلية للمخزون" : "إضافة فاتورة مشتريات"}</h3>');
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully injected Title!');
} else {
  console.log('Failed to match Title in frontend.');
}
