const fs = require('fs');
let code = fs.readFileSync('web/src/app/page.tsx', 'utf8');

// Add useTranslation
if (!code.includes('useTranslation')) {
  code = code.replace('import { useStore } from "@/store";', 'import { useStore } from "@/store";\nimport { useTranslation } from "@/i18n";');
  code = code.replace('const user = useStore((state) => state.user);', 'const user = useStore((state) => state.user);\n  const { t, language } = useTranslation();');
}

// Format date
code = code.replace(
  /const formattedDate = [^;]+;/,
  `const formattedDate = \`\${t.dashboard.days[new Date().getDay()]}، \${new Date().getDate()} \${t.dashboard.months[new Date().getMonth()]}\`;`
);

// Welcome message
code = code.replace(/>مرحباً، /g, '>{t.dashboard.welcome} ');
code = code.replace(/إليك ملخص فروعك اليوم/g, '{t.dashboard.summary_today}');
code = code.replace(/إليك ملخص فرعك اليوم/g, '{t.dashboard.summary_today_branch}');

// Branch selector
code = code.replace(/>كل الفروع</g, '>{t.dashboard.all_branches}<');

// Sales
code = code.replace(/>مبيعات اليوم</g, '>{t.dashboard.todays_sales}<');
code = code.replace(/>فاتورة</g, '>{t.dashboard.invoice}<');
code = code.replace(/فاتورة/g, '{t.dashboard.invoice}');

// Expenses
code = code.replace(/>مصروفات اليوم</g, '>{t.dashboard.todays_expenses}<');
code = code.replace(/>إدارة المصروفات</g, '>{t.dashboard.manage_expenses}<');

// Shifts
code = code.replace(/>حالة الورديات</g, '>{t.dashboard.shifts_status}<');
code = code.replace(/>لا توجد وردية</g, '>{t.dashboard.no_shift}<');
code = code.replace(/>وردية مفتوحة</g, '>{t.dashboard.open_shift}<');
code = code.replace(/>عرض الصندوق</g, '>{t.dashboard.view_cash}<');

// Suppliers
code = code.replace(/>متبقي للموردين</g, '>{t.dashboard.due_to_suppliers}<');
code = code.replace(/>تسديد الديون</g, '>{t.dashboard.pay_debts}<');

// Shortages
code = code.replace(/>نواقص الأدوية</g, '>{t.dashboard.medicines_shortages}<');
code = code.replace(/>نفدت تماماً</g, '>{t.dashboard.out_of_stock}<');
code = code.replace(/>قاربت على النفاد</g, '>{t.dashboard.low_stock}<');
code = code.replace(/>دواء</g, '>{t.dashboard.medicine}<');

// Expiry
code = code.replace(/>تنبيهات الصلاحية</g, '>{t.dashboard.expiry_alerts}<');
code = code.replace(/>تنتهي خلال 60 يوم</g, '>{t.dashboard.expires_in_60}<');
code = code.replace(/>دفعة</g, '>{t.dashboard.batch}<');

// Alerts
code = code.replace(/>تنبيهات عاجلة</g, '>{t.dashboard.urgent_alerts}<');
code = code.replace(/>إنشاء طلب شراء</g, '>{t.dashboard.create_po}<');
code = code.replace(/>مراجعة المخزون والصلاحيات</g, '>{t.dashboard.review_inventory}<');
code = code.replace(/>مبيعاتك في حالة ممتازة هذا الأسبوع 🚀</g, '>{t.dashboard.sales_excellent}<');
code = code.replace(/>عرض الكل</g, '>{t.dashboard.view_all}<');
code = code.replace(/>لا توجد فروع مسجلة لهذه الصيدلية.</g, '>{t.dashboard.no_branches}<');

// Replaces in template literals
code = code.replace(/\{\`\$\{Math\.round\([^}]+\)\} فاتورة\`\}/g, '{Math.round(dashboardData.totalInvoices)} {t.dashboard.invoice}');
code = code.replace(/\{\`\$\{shortages\.zero\} دواء\`\}/g, '{shortages.zero} {t.dashboard.medicine}');
code = code.replace(/\{\`\$\{shortages\.low\} دواء\`\}/g, '{shortages.low} {t.dashboard.medicine}');
code = code.replace(/\{\`\$\{expiryStats\.expired \+ expiryStats\.expiring\} دفعة\`\}/g, '{expiryStats.expired + expiryStats.expiring} {t.dashboard.batch}');

fs.writeFileSync('web/src/app/page.tsx', code, 'utf8');
console.log('Patched page.tsx');
