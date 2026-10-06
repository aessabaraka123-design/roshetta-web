const fs = require('fs');

const arPath = 'web/src/i18n/ar.ts';
let arContent = fs.readFileSync(arPath, 'utf8');

const arDashboard = `  dashboard: {
    welcome: "مرحباً،",
    summary_today: "إليك ملخص فروعك اليوم",
    summary_today_branch: "إليك ملخص فرعك اليوم",
    all_branches: "كل الفروع",
    todays_sales: "مبيعات اليوم",
    invoice: "فاتورة",
    todays_expenses: "مصروفات اليوم",
    manage_expenses: "إدارة المصروفات",
    shifts_status: "حالة الورديات",
    open_shift: "وردية مفتوحة",
    no_shift: "لا توجد وردية",
    view_cash: "عرض الصندوق",
    due_to_suppliers: "متبقي للموردين",
    pay_debts: "تسديد الديون",
    medicines_shortages: "نواقص الأدوية",
    out_of_stock: "نفدت تماماً",
    low_stock: "قاربت على النفاد",
    expiry_alerts: "تنبيهات الصلاحية",
    expires_in_60: "تنتهي خلال 60 يوم",
    urgent_alerts: "تنبيهات عاجلة",
    view_all: "عرض الكل",
    medicine: "دواء",
    batch: "دفعة",
    create_po: "إنشاء طلب شراء",
    review_inventory: "مراجعة المخزون والصلاحيات",
    sales_excellent: "مبيعاتك في حالة ممتازة هذا الأسبوع 🚀",
    no_branches: "لا توجد فروع مسجلة لهذه الصيدلية.",
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  },`;

arContent = arContent.replace('export const ar = {\n', 'export const ar = {\n' + arDashboard + '\n');
fs.writeFileSync(arPath, arContent, 'utf8');

const enPath = 'web/src/i18n/en.ts';
let enContent = fs.readFileSync(enPath, 'utf8');

const enDashboard = `  dashboard: {
    welcome: "Welcome,",
    summary_today: "Here is your branches summary for today",
    summary_today_branch: "Here is your branch summary for today",
    all_branches: "All Branches",
    todays_sales: "Today's Sales",
    invoice: "Invoice",
    todays_expenses: "Today's Expenses",
    manage_expenses: "Manage Expenses",
    shifts_status: "Shifts Status",
    open_shift: "Open Shift",
    no_shift: "No Shift",
    view_cash: "View Cash Register",
    due_to_suppliers: "Due to Suppliers",
    pay_debts: "Pay Debts",
    medicines_shortages: "Medicines Shortages",
    out_of_stock: "Out of Stock",
    low_stock: "Low Stock",
    expiry_alerts: "Expiry Alerts",
    expires_in_60: "Expires in 60 days",
    urgent_alerts: "Urgent Alerts",
    view_all: "View All",
    medicine: "Medicine",
    batch: "Batch",
    create_po: "Create PO",
    review_inventory: "Review Inventory",
    sales_excellent: "Your sales are in excellent condition this week 🚀",
    no_branches: "No branches registered for this pharmacy.",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  },`;

enContent = enContent.replace('export const en = {\n', 'export const en = {\n' + enDashboard + '\n');
fs.writeFileSync(enPath, enContent, 'utf8');

console.log("Dictionaries updated");
