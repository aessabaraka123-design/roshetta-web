const fs = require('fs');
let c = fs.readFileSync('web/src/app/page.tsx', 'utf8');

const replacements = [
  { search: 'إنشاء طلب شراء', replace: '{t.dashboard.create_po || "إنشاء طلب شراء"}' },
  { search: 'مراجعة الصلاحية', replace: '{t.dashboard.review_inventory || "مراجعة الصلاحية"}' },
  { search: 'لا توجد تنبيهات عاجلة!', replace: '{language === "en" ? "No urgent alerts!" : "لا توجد تنبيهات عاجلة!"}' },
  { search: 'المخزون والصلاحيات في حالة ممتازة.', replace: '{language === "en" ? "Inventory and expiry are in excellent condition." : "المخزون والصلاحيات في حالة ممتازة."}' },
  { search: 'تنبيهات عاجلة', replace: '{t.dashboard.urgent_alerts}' },
  { search: 'هذا الأسبوع', replace: '{language === "en" ? "This Week" : "هذا الأسبوع"}' },
  { search: 'لا توجد فروع مسجلة لهذه الصيدلية.', replace: '{t.dashboard.no_branches || "لا توجد فروع مسجلة لهذه الصيدلية."}' }
];

for (let r of replacements) {
  c = c.split(r.search).join(r.replace);
}

fs.writeFileSync('web/src/app/page.tsx', c, 'utf8');
console.log('Fixed final dashboard strings');
