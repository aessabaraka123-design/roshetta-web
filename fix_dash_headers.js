const fs = require('fs');
let c = fs.readFileSync('web/src/app/page.tsx', 'utf8');

const replacements = [
  { search: 'مبيعات اليوم', replace: '{t.dashboard.todays_sales}' },
  { search: 'مصروفات اليوم', replace: '{t.dashboard.todays_expenses}' },
  { search: 'إدارة المصروفات', replace: '{t.dashboard.manage_expenses}' },
  { search: 'حالة الورديات', replace: '{t.dashboard.shifts_status}' },
  { search: 'عرض الصندوق', replace: '{t.dashboard.view_cash}' },
  { search: 'متبقي للموردين', replace: '{t.dashboard.due_to_suppliers}' },
  { search: 'تسديد الديون', replace: '{t.dashboard.pay_debts}' },
  { search: 'نواقص الأدوية', replace: '{t.dashboard.medicines_shortages}' },
  { search: 'تنبيهات الصلاحية', replace: '{t.dashboard.expiry_alerts}' },
  { search: 'عرض الكل', replace: '{t.dashboard.view_all}' }
];

for (let r of replacements) {
  // Use regex to replace globally, escaping just in case, but simple strings are fine
  // Actually, better use split.join for exact match
  c = c.split(r.search).join(r.replace);
}

fs.writeFileSync('web/src/app/page.tsx', c, 'utf8');
console.log('Fixed dashboard hardcoded Arabic headers');
