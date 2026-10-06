const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const reps = [
  { s: 'toast.success(`تم جلب ${low.length} صنف ناقص!`);', r: 'toast.success(language === "en" ? `Fetched ${low.length} short items!` : `تم جلب ${low.length} صنف ناقص!`);' },
  { s: 'return toast.error("الفاتورة فارغة، أضف أصناف أولاً");', r: 'return toast.error(language === "en" ? "Invoice is empty, add items first" : "الفاتورة فارغة، أضف أصناف أولاً");' },
  { s: '} else toast.error(r.error || "خطأ في الحفظ");', r: '} else toast.error(r.error || (language === "en" ? "Save error" : "خطأ في الحفظ"));' },
  { s: 'toast.error("خطأ في الاتصال بالخادم");', r: 'toast.error(language === "en" ? "Server connection error" : "خطأ في الاتصال بالخادم");' },
  { s: 'toast.error("أدخل اسم وسعر الصنف");', r: 'toast.error(language === "en" ? "Enter item name and price" : "أدخل اسم وسعر الصنف");' },
  { s: 'toast.success("تم إضافة الصنف!");', r: 'toast.success(language === "en" ? "Item added!" : "تم إضافة الصنف!");' },
  { s: 'toast.error("خطأ في الاتصال");', r: 'toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");' },
  { s: 'toast.success("تم الحذف");', r: 'toast.success(language === "en" ? "Deleted successfully" : "تم الحذف");' },
  { s: 'toast.success(\n        form.status === "draft" ? "تم تحديث الطلبية!" : "تم إنشاء الفاتورة!",\n      );', r: 'toast.success(form.status === "draft" ? (language === "en" ? "Draft updated!" : "تم تحديث الطلبية!") : (language === "en" ? "Invoice created!" : "تم إنشاء الفاتورة!"));' },
  { s: 'toast.success("تم تحديث الطلبية!");', r: 'toast.success(language === "en" ? "Draft updated!" : "تم تحديث الطلبية!");' },
  { s: 'toast.success("تم إنشاء الفاتورة!");', r: 'toast.success(language === "en" ? "Invoice created!" : "تم إنشاء الفاتورة!");' }
];

for (let r of reps) {
  c = c.replace(r.s, r.r);
}

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed toasts');
