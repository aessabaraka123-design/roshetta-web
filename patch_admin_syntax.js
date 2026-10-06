const fs = require('fs');
let c = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

c = c.replace(
  '{editingStaff?.id ? language === "en" ? "Save Changes" : "{language === "en" ? "Save Changes" : "حفظ التعديلات"}" : language === "en" ? "Appoint Staff" : "تعيين الموظف"}',
  '{editingStaff?.id ? language === "en" ? "Save Changes" : "حفظ التعديلات" : language === "en" ? "Appoint Staff" : "تعيين الموظف"}'
);

fs.writeFileSync('web/src/app/admin/page.tsx', c, 'utf8');
console.log('Fixed double replace on Save Changes');
