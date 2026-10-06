const fs = require('fs');
let content = fs.readFileSync('web/src/utils/export.ts', 'utf8');

if (!content.includes('import { useStore }')) {
    content = content.replace('import html2canvas from "html2canvas";', 'import html2canvas from "html2canvas";\nimport { useStore } from "@/store";');
}

// Ensure language variable is defined exactly once per function
content = content.replace(
    'const container = document.createElement("div");',
    'const language = useStore.getState().language;\n  const container = document.createElement("div");'
);
// Remove duplicates if they exist from previous runs
content = content.replace(/const language = useStore\.getState\(\)\.language;\s*const language = useStore\.getState\(\)\.language;/g, 'const language = useStore.getState().language;');

content = content.replace('container.style.direction = "rtl";', 'container.style.direction = language === "en" ? "ltr" : "rtl";');

const reps = [
    ['>التقرير المالي الشامل<', '>${language === "en" ? "Comprehensive Financial Report" : "التقرير المالي الشامل"}<'],
    ['>صيدلية:<', '>${language === "en" ? "Pharmacy:" : "صيدلية:"}<'],
    ['>تاريخ الإصدار:<', '>${language === "en" ? "Issue Date:" : "تاريخ الإصدار:"}<'],
    ['>فترة التقرير:<', '>${language === "en" ? "Report Period:" : "فترة التقرير:"}<'],
    ['>الملخص المالي<', '>${language === "en" ? "Financial Summary" : "الملخص المالي"}<'],
    ['إجمالي المبيعات', '${language === "en" ? "Total Sales" : "إجمالي المبيعات"}'],
    ['الربح الإجمالي', '${language === "en" ? "Gross Profit" : "الربح الإجمالي"}'],
    ['إجمالي المصروفات', '${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}'],
    ['صافي الربح', '${language === "en" ? "Net Profit" : "صافي الربح"}'],
    ['>تحليل طرق الدفع<', '>${language === "en" ? "Payment Methods Analysis" : "تحليل طرق الدفع"}<'],
    ['كاش', '${language === "en" ? "Cash" : "كاش"}'],
    ['بطاقة بنكية', '${language === "en" ? "Credit Card" : "بطاقة بنكية"}'],
    ['آجل / ذمم', '${language === "en" ? "Credit / Debt" : "آجل / ذمم"}'],
    ['تأمين', '${language === "en" ? "Insurance" : "تأمين"}'],
    ['>المبيعات اليومية<', '>${language === "en" ? "Daily Sales" : "المبيعات اليومية"}<'],
    ['<th>التاريخ</th>', '<th>${language === "en" ? "Date" : "التاريخ"}</th>'],
    ['<th>المبيعات</th>', '<th>${language === "en" ? "Sales" : "المبيعات"}</th>'],
    ['>الأدوية الأكثر مبيعاً<', '>${language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}<'],
    ['<th>اسم الدواء</th>', '<th>${language === "en" ? "Medicine Name" : "اسم الدواء"}</th>'],
    ['<th>الكمية المباعة</th>', '<th>${language === "en" ? "Quantity Sold" : "الكمية المباعة"}</th>'],
    ['<th>الإيرادات</th>', '<th>${language === "en" ? "Revenues" : "الإيرادات"}</th>'],
    ['عبوة', '${language === "en" ? "Pack" : "عبوة"}'],
    ['>نظام روشتة لإدارة الصيدليات<', '>${language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}<'],
    ['>وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم<', '>${language === "en" ? "Official financial document issued automatically, requires no stamp" : "وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم"}<'],
    ['>الصنف<', '>${language === "en" ? "Item" : "الصنف"}<'],
    ['>الكمية<', '>${language === "en" ? "Qty" : "الكمية"}<'],
    ['>السعر الإفرادي<', '>${language === "en" ? "Unit Price" : "السعر الإفرادي"}<'],
    ['>المجموع الفرعي<', '>${language === "en" ? "Subtotal" : "المجموع الفرعي"}<'],
    ['>المجموع<', '>${language === "en" ? "Total" : "المجموع"}<'],
    ['>فاتورة مبيعات<', '>${language === "en" ? "Sales Invoice" : "فاتورة مبيعات"}<'],
    ['>رقم الفاتورة:<', '>${language === "en" ? "Invoice No:" : "رقم الفاتورة:"}<'],
    ['>العميل:<', '>${language === "en" ? "Customer:" : "العميل:"}<'],
    ['>الخصم<', '>${language === "en" ? "Discount" : "الخصم"}<'],
    ['>المطلوب<', '>${language === "en" ? "Total Due" : "المطلوب"}<'],
    ['>شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية<', '>${language === "en" ? "Thank you for your visit, wishing you good health" : "شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية"}<'],
    ['تم إصدار هذه الفاتورة من', '${language === "en" ? "This invoice was issued by" : "تم إصدار هذه الفاتورة من"}']
];

for (let i=0; i<reps.length; i++) {
    content = content.split(reps[i][0]).join(reps[i][1]);
}

// Fix array syntax for generateTable
let findArr = '["التاريخ", "${language === "en" ? "Total Sales" : "إجمالي المبيعات"}", "${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}", "${language === "en" ? "Net Profit" : "صافي الربح"}"]';
let repArr = '["التاريخ", language === "en" ? "Total Sales" : "إجمالي المبيعات", language === "en" ? "Total Expenses" : "إجمالي المصروفات", language === "en" ? "Net Profit" : "صافي الربح"]';
content = content.split(findArr).join(repArr);

// Also fix if it was partially matched
content = content.replace(/\["التاريخ", "\$\{language === "en" \? "Total Sales" : "إجمالي المبيعات"\}", "إجمالي المصروفات", "صافي الربح"\]/g, repArr);
content = content.replace(/\["التاريخ", "إجمالي المبيعات", "إجمالي المصروفات", "صافي الربح"\]/g, repArr);


fs.writeFileSync('web/src/utils/export.ts', content, 'utf8');
console.log('Success');
