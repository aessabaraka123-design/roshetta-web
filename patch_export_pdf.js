const fs = require('fs');
let c = fs.readFileSync('web/src/utils/export.ts', 'utf8');

const replacements = [
  // exportComprehensivePDF
  ['صيدلية: <strong', '${language === "en" ? "Pharmacy:" : "صيدلية:"} <strong'],
  [' الملخص المالي', ' ${language === "en" ? "Financial Summary" : "الملخص المالي"}'],
  [' تحليل طرق الدفع', ' ${language === "en" ? "Payment Methods Analysis" : "تحليل طرق الدفع"}'],
  ['آجل (ذمم)', '${language === "en" ? "Credit (Receivables)" : "آجل (ذمم)"}'],
  [' المبيعات اليومية', ' ${language === "en" ? "Daily Sales" : "المبيعات اليومية"}'],
  ['"التاريخ"', 'language === "en" ? "Date" : "التاريخ"'],
  ['نظام روشتة لإدارة الصيدليات المتقدمة', '${language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات المتقدمة"}'],
  ['وثيقة مالية رسمية مُصدرة آلياً • لا تحتاج إلى ختم', '${language === "en" ? "Official automated financial document • No stamp required" : "وثيقة مالية رسمية مُصدرة آلياً • لا تحتاج إلى ختم"}'],

  // exportInvoicePDF
  ['<th>الإجمالي</th>', '<th>${language === "en" ? "Total" : "الإجمالي"}</th>'],
  ['>الإجمالي<', '>${language === "en" ? "Total" : "الإجمالي"}<'],
  ['التاريخ:', '${language === "en" ? "Date:" : "التاريخ:"}'],
  ['المجموع الفرعي:', '${language === "en" ? "Subtotal:" : "المجموع الفرعي:"}'],
  ['الخصم:', '${language === "en" ? "Discount:" : "الخصم:"}'],
  ['الإجمالي المطلوب:', '${language === "en" ? "Total Due:" : "الإجمالي المطلوب:"}'],
];

replacements.forEach(([oldStr, newStr]) => {
  // Use a global replacement for literal strings
  c = c.split(oldStr).join(newStr);
});

fs.writeFileSync('web/src/utils/export.ts', c, 'utf8');
console.log('Fixed PDF generation strings');
