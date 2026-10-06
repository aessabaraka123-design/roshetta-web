const fs = require('fs');
let c = fs.readFileSync('web/src/app/page.tsx', 'utf8');

const reps = [
  { s: '`مرحباً، ${user.managerName || "مدير الصيدلية"} 👋`', r: 'language === "en" ? `Hello, ${user.managerName || "Pharmacy Manager"} 👋` : `مرحباً، ${user.managerName || "مدير الصيدلية"} 👋`' },
  { s: 'مرحباً، {user.managerName || "مدير الصيدلية"} 👋', r: '{language === "en" ? `Hello, ${user.managerName || "Pharmacy Manager"} 👋` : `مرحباً، ${user.managerName || "مدير الصيدلية"} 👋`}' },
  { s: '{ id: "all", name: "كل الفروع" }', r: '{ id: "all", name: language === "en" ? "All Branches" : "كل الفروع" }' },
  { s: '`${stats.openShifts} مفتوحة`', r: 'language === "en" ? `${stats.openShifts} Open` : `${stats.openShifts} مفتوحة`' },
  { s: '"لا توجد وردية"', r: 'language === "en" ? "No Shift" : "لا توجد وردية"' },
  { s: '{stats.outOfStock + stats.lowStock} دواء', r: '{stats.outOfStock + stats.lowStock} {language === "en" ? "Meds" : "دواء"}' },
  { s: '{stats.expiringCount} دفعة', r: '{stats.expiringCount} {language === "en" ? "Batch" : "دفعة"}' },
  { s: 'دفعة تنتهي خلال 60 يوم', r: '{language === "en" ? "Batch expires in 60 days" : "دفعة تنتهي خلال 60 يوم"}' },
  { s: 'فرع {alert.branchName}', r: '{language === "en" ? "Branch" : "فرع"} {alert.branchName}' },
  { s: 'نفدت تماماً', r: '{language === "en" ? "Out of stock" : "نفدت تماماً"}' },
  { s: 'قاربت على النفاد', r: '{language === "en" ? "Low stock" : "قاربت على النفاد"}' },
  { s: '؟ t.dashboard.summary_today', r: '? t.dashboard.summary_today' }, // ignore
  { s: 'day: "numeric",\n              month: "long",\n            })}', r: 'day: "numeric",\n              month: "long",\n            })}' }
];

for (let r of reps) {
  c = c.split(r.s).join(r.r);
}

// localeDateString language based
c = c.replace(/'ar-EG'/g, 'language === "en" ? "en-US" : "ar-EG"');

fs.writeFileSync('web/src/app/page.tsx', c, 'utf8');
console.log('Fixed dashboard hardcoded strings');
