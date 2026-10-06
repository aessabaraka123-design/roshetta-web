const fs = require('fs');
let c = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

c = c.replace('تغيير كلمة المرور', '{language === "en" ? "Change Password" : "تغيير كلمة المرور"}');
c = c.replace('كلمة المرور الحالية', '{language === "en" ? "Current Password" : "كلمة المرور الحالية"}');
c = c.replace('كلمة المرور الجديدة', '{language === "en" ? "New Password" : "كلمة المرور الجديدة"}');
c = c.replace('تأكيد الكلمة الجديدة', '{language === "en" ? "Confirm New Password" : "تأكيد الكلمة الجديدة"}');
c = c.replace('حفظ التعديلات', '{language === "en" ? "Save Changes" : "حفظ التعديلات"}');
c = c.replace(/>إلغاء<\/button>/g, '>{language === "en" ? "Cancel" : "إلغاء"}</button>');
c = c.replace(/>إلغاء</g, '>{language === "en" ? "Cancel" : "إلغاء"}<');

fs.writeFileSync('web/src/app/admin/page.tsx', c, 'utf8');
console.log('Fixed Change Password modal strings');
