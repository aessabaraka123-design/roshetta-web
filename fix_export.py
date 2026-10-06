import os

filepath = 'web/src/utils/export.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useStore import
if 'import { useStore }' not in content:
    content = content.replace('import html2canvas from "html2canvas";', 'import html2canvas from "html2canvas";\nimport { useStore } from "@/store";')

# Inject language fetching
content = content.replace(
    'export const exportComprehensivePDF = async (\n  report: any,\n  pharmacyName: string,\n  dateRange: string,\n  filename: string,\n) => {',
    'export const exportComprehensivePDF = async (\n  report: any,\n  pharmacyName: string,\n  dateRange: string,\n  filename: string,\n) => {\n  const language = useStore.getState().language;'
)

content = content.replace(
    'export const exportInvoicePDF = async (\n  invoiceData: {',
    'export const exportInvoicePDF = async (\n  invoiceData: {\n'
)

# wait, better to inject at the top of the functions
content = content.replace(
    'const container = document.createElement("div");',
    'const language = useStore.getState().language;\n  const container = document.createElement("div");'
)

content = content.replace('container.style.direction = "rtl";', 'container.style.direction = language === "en" ? "ltr" : "rtl";')

# Now carefully replace strings
reps = [
    ('>التقرير المالي الشامل<', '>${language === "en" ? "Comprehensive Financial Report" : "التقرير المالي الشامل"}<'),
    ('>صيدلية:<', '>${language === "en" ? "Pharmacy:" : "صيدلية:"}<'),
    ('>تاريخ الإصدار:<', '>${language === "en" ? "Issue Date:" : "تاريخ الإصدار:"}<'),
    ('>فترة التقرير:<', '>${language === "en" ? "Report Period:" : "فترة التقرير:"}<'),
    ('>الملخص المالي<', '>${language === "en" ? "Financial Summary" : "الملخص المالي"}<'),
    ('إجمالي المبيعات', '${language === "en" ? "Total Sales" : "إجمالي المبيعات"}'),
    ('الربح الإجمالي', '${language === "en" ? "Gross Profit" : "الربح الإجمالي"}'),
    ('إجمالي المصروفات', '${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}'),
    ('صافي الربح', '${language === "en" ? "Net Profit" : "صافي الربح"}'),
    ('>تحليل طرق الدفع<', '>${language === "en" ? "Payment Methods Analysis" : "تحليل طرق الدفع"}<'),
    ('كاش', '${language === "en" ? "Cash" : "كاش"}'),
    ('بطاقة بنكية', '${language === "en" ? "Credit Card" : "بطاقة بنكية"}'),
    ('آجل / ذمم', '${language === "en" ? "Credit / Debt" : "آجل / ذمم"}'),
    ('تأمين', '${language === "en" ? "Insurance" : "تأمين"}'),
    ('>المبيعات اليومية<', '>${language === "en" ? "Daily Sales" : "المبيعات اليومية"}<'),
    ('<th>التاريخ</th>', '<th>${language === "en" ? "Date" : "التاريخ"}</th>'),
    ('<th>المبيعات</th>', '<th>${language === "en" ? "Sales" : "المبيعات"}</th>'),
    ('>الأدوية الأكثر مبيعاً<', '>${language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}<'),
    ('<th>اسم الدواء</th>', '<th>${language === "en" ? "Medicine Name" : "اسم الدواء"}</th>'),
    ('<th>الكمية المباعة</th>', '<th>${language === "en" ? "Quantity Sold" : "الكمية المباعة"}</th>'),
    ('<th>الإيرادات</th>', '<th>${language === "en" ? "Revenues" : "الإيرادات"}</th>'),
    ('عبوة', '${language === "en" ? "Pack" : "عبوة"}'),
    ('>نظام روشتة لإدارة الصيدليات<', '>${language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}<'),
    ('>وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم<', '>${language === "en" ? "Official financial document issued automatically, requires no stamp" : "وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم"}<'),
    ('>الصنف<', '>${language === "en" ? "Item" : "الصنف"}<'),
    ('>الكمية<', '>${language === "en" ? "Qty" : "الكمية"}<'),
    ('>السعر الإفرادي<', '>${language === "en" ? "Unit Price" : "السعر الإفرادي"}<'),
    ('>المجموع الفرعي<', '>${language === "en" ? "Subtotal" : "المجموع الفرعي"}<'),
    ('>المجموع<', '>${language === "en" ? "Total" : "المجموع"}<'),
    ('>فاتورة مبيعات<', '>${language === "en" ? "Sales Invoice" : "فاتورة مبيعات"}<'),
    ('>رقم الفاتورة:<', '>${language === "en" ? "Invoice No:" : "رقم الفاتورة:"}<'),
    ('>العميل:<', '>${language === "en" ? "Customer:" : "العميل:"}<'),
    ('>الخصم<', '>${language === "en" ? "Discount" : "الخصم"}<'),
    ('>المطلوب<', '>${language === "en" ? "Total Due" : "المطلوب"}<'),
    ('>شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية<', '>${language === "en" ? "Thank you for your visit, wishing you good health" : "شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية"}<'),
    ('تم إصدار هذه الفاتورة من', '${language === "en" ? "This invoice was issued by" : "تم إصدار هذه الفاتورة من"}')
]

for s, r in reps:
    content = content.replace(s, r)

# Fix the broken array in exportComprehensivePDF
content = content.replace('["التاريخ", "${language === "en" ? "Total Sales" : "إجمالي المبيعات"}", "إجمالي المصروفات", "صافي الربح"]', '["التاريخ", language === "en" ? "Total Sales" : "إجمالي المبيعات", language === "en" ? "Total Expenses" : "إجمالي المصروفات", language === "en" ? "Net Profit" : "صافي الربح"]')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
