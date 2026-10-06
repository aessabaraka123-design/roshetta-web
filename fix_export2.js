const fs = require('fs');

let c = fs.readFileSync('web/src/utils/export.ts', 'utf8');

if (!c.includes('import { useStore }')) {
  c = c.replace('import html2canvas from "html2canvas";', 'import html2canvas from "html2canvas";\nimport { useStore } from "@/store";');
}

c = c.replace(/export const exportComprehensivePDF = async \([\s\S]*?\) => {/, 'export const exportComprehensivePDF = async (\n  report: any,\n  pharmacyName: string,\n  dateRange: string,\n  filename: string,\n) => {\n  const language = useStore.getState().language;');

c = c.replace(/export const exportInvoicePDF = async \([\s\S]*?\) => {/, 'export const exportInvoicePDF = async (\n  invoice: any,\n  pharmacyName: string,\n) => {\n  const language = useStore.getState().language;');

c = c.replace('container.style.direction = "rtl";', 'container.style.direction = language === "en" ? "ltr" : "rtl";');

const replacements = [
  { s: '>التقرير المالي الشامل<', r: '>${language === "en" ? "Comprehensive Financial Report" : "التقرير المالي الشامل"}<' },
  { s: '>صيدلية:<', r: '>${language === "en" ? "Pharmacy:" : "صيدلية:"}<' },
  { s: '>تاريخ الإصدار:<', r: '>${language === "en" ? "Issue Date:" : "تاريخ الإصدار:"}<' },
  { s: '>فترة التقرير:<', r: '>${language === "en" ? "Report Period:" : "فترة التقرير:"}<' },
  { s: '>الملخص المالي<', r: '>${language === "en" ? "Financial Summary" : "الملخص المالي"}<' },
  { s: 'إجمالي المبيعات', r: '${language === "en" ? "Total Sales" : "إجمالي المبيعات"}' },
  { s: 'الربح الإجمالي', r: '${language === "en" ? "Gross Profit" : "الربح الإجمالي"}' },
  { s: 'إجمالي المصروفات', r: '${language === "en" ? "Total Expenses" : "إجمالي المصروفات"}' },
  { s: 'صافي الربح', r: '${language === "en" ? "Net Profit" : "صافي الربح"}' },
  { s: '>تحليل طرق الدفع<', r: '>${language === "en" ? "Payment Methods Analysis" : "تحليل طرق الدفع"}<' },
  { s: 'كاش', r: '${language === "en" ? "Cash" : "كاش"}' },
  { s: 'بطاقة بنكية', r: '${language === "en" ? "Credit Card" : "بطاقة بنكية"}' },
  { s: 'آجل / ذمم', r: '${language === "en" ? "Credit / Debt" : "آجل / ذمم"}' },
  { s: 'تأمين', r: '${language === "en" ? "Insurance" : "تأمين"}' },
  { s: '>المبيعات اليومية<', r: '>${language === "en" ? "Daily Sales" : "المبيعات اليومية"}<' },
  { s: '<th>التاريخ</th>', r: '<th>${language === "en" ? "Date" : "التاريخ"}</th>' },
  { s: '<th>المبيعات</th>', r: '<th>${language === "en" ? "Sales" : "المبيعات"}</th>' },
  { s: '>الأدوية الأكثر مبيعاً<', r: '>${language === "en" ? "Top Selling Medicines" : "الأدوية الأكثر مبيعاً"}<' },
  { s: '<th>اسم الدواء</th>', r: '<th>${language === "en" ? "Medicine Name" : "اسم الدواء"}</th>' },
  { s: '<th>الكمية المباعة</th>', r: '<th>${language === "en" ? "Quantity Sold" : "الكمية المباعة"}</th>' },
  { s: '<th>الإيرادات</th>', r: '<th>${language === "en" ? "Revenues" : "الإيرادات"}</th>' },
  { s: 'عبوة', r: '${language === "en" ? "Pack" : "عبوة"}' },
  { s: '>نظام روشتة لإدارة الصيدليات<', r: '>${language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}<' },
  { s: '>وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم<', r: '>${language === "en" ? "Official financial document issued automatically, requires no stamp" : "وثيقة مالية رسمية مُصدرة آلياً لا تحتاج إلى ختم"}<' },
  { s: '>الصنف<', r: '>${language === "en" ? "Item" : "الصنف"}<' },
  { s: '>الكمية<', r: '>${language === "en" ? "Qty" : "الكمية"}<' },
  { s: '>السعر الإفرادي<', r: '>${language === "en" ? "Unit Price" : "السعر الإفرادي"}<' },
  { s: '>المجموع الفرعي<', r: '>${language === "en" ? "Subtotal" : "المجموع الفرعي"}<' },
  { s: '>المجموع<', r: '>${language === "en" ? "Total" : "المجموع"}<' },
  { s: '>فاتورة مبيعات<', r: '>${language === "en" ? "Sales Invoice" : "فاتورة مبيعات"}<' },
  { s: '>رقم الفاتورة:<', r: '>${language === "en" ? "Invoice No:" : "رقم الفاتورة:"}<' },
  { s: '>العميل:<', r: '>${language === "en" ? "Customer:" : "العميل:"}<' },
  { s: '>الخصم<', r: '>${language === "en" ? "Discount" : "الخصم"}<' },
  { s: '>المطلوب<', r: '>${language === "en" ? "Total Due" : "المطلوب"}<' },
  { s: '>شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية<', r: '>${language === "en" ? "Thank you for your visit, wishing you good health" : "شكراً لزيارتكم ونتمنى لكم دوام الصحة والعافية"}<' },
  { s: 'تم إصدار هذه الفاتورة من', r: '${language === "en" ? "This invoice was issued by" : "تم إصدار هذه الفاتورة من"}' }
];

for (let rep of replacements) {
  c = c.split(rep.s).join(rep.r);
}

fs.writeFileSync('web/src/utils/export.ts', c, 'utf8');
console.log('Fixed export.ts');
