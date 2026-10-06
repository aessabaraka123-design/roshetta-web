const fs = require('fs');

function replaceFile(path, reps) {
  let c = fs.readFileSync(path, 'utf8');
  for (let r of reps) c = c.replace(r.s, r.r);
  fs.writeFileSync(path, c, 'utf8');
}

// 1. admin/settings/page.tsx
replaceFile('web/src/app/admin/settings/page.tsx', [
  { s: 'toast.error("فشل في جلب البيانات");', r: 'toast.error(language === "en" ? "Failed to fetch data" : "فشل في جلب البيانات");' },
  { s: 'toast.error("فشل تغيير حالة الصيدلية");', r: 'toast.error(language === "en" ? "Failed to change pharmacy status" : "فشل تغيير حالة الصيدلية");' },
  { s: 'toast.success("تم حذف الصيدلية نهائياً");', r: 'toast.success(language === "en" ? "Pharmacy deleted permanently" : "تم حذف الصيدلية نهائياً");' },
  { s: 'toast.error("فشل في حذف الصيدلية");', r: 'toast.error(language === "en" ? "Failed to delete pharmacy" : "فشل في حذف الصيدلية");' }
]);

// 2. login/page.tsx
replaceFile('web/src/app/login/page.tsx', [
  { s: 'toast.success(`أهلاً بك، ${data.user.managerName || "مدير الصيدلية"}`);', r: 'toast.success(language === "en" ? `Welcome, ${data.user.managerName || "Pharmacy Manager"}` : `أهلاً بك، ${data.user.managerName || "مدير الصيدلية"}`);' },
  { s: 'toast.error(data.error || "خطأ في تسجيل الدخول");', r: 'toast.error(data.error || (language === "en" ? "Login error" : "خطأ في تسجيل الدخول"));' },
  { s: 'toast.error("لا يمكن الاتصال بالخادم");', r: 'toast.error(language === "en" ? "Cannot connect to server" : "لا يمكن الاتصال بالخادم");' }
]);

// 3. upgrade-plan/page.tsx
replaceFile('web/src/app/upgrade-plan/page.tsx', [
  { s: 'toast.success(`تم إرسال طلب الترقية إلى باقة ${planName} بنجاح!`);', r: 'toast.success(language === "en" ? `Upgrade request to ${planName} sent successfully!` : `تم إرسال طلب الترقية إلى باقة ${planName} بنجاح!`);' }
]);

console.log('Fixed remaining toasts!');
