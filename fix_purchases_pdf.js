const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const reps = [
    { s: '"فاتورة مشتريات"', r: 'language === "en" ? "Purchase Invoice" : "فاتورة مشتريات"' },
    { s: '"طلب شراء مبدئي"', r: 'language === "en" ? "Purchase Order (Draft)" : "طلب شراء مبدئي"' },
    { s: 'رقم الفاتورة:', r: '{language === "en" ? "Invoice No:" : "رقم الفاتورة:"}' },
    { s: 'التاريخ:', r: '{language === "en" ? "Date:" : "التاريخ:"}' },
    { s: '"فاتورة قادمة من:"', r: 'language === "en" ? "Invoice from:" : "فاتورة قادمة من:"' },
    { s: '"فاتورة إلى:"', r: 'language === "en" ? "Invoice to:" : "فاتورة إلى:"' },
    { s: '"بدون مورد"', r: 'language === "en" ? "No Supplier" : "بدون مورد"' },
    { s: '"هذه الفاتورة توثق استلام أدوية من المورد المذكور وإدخالها للمخزون بشكل فعلي."', r: 'language === "en" ? "This invoice documents the receipt of medicines from the mentioned supplier and their actual entry into the inventory." : "هذه الفاتورة توثق استلام أدوية من المورد المذكور وإدخالها للمخزون بشكل فعلي."' },
    { s: '"هذا طلب شراء مبدئي موجه للمورد المذكور لتجهيز الطلبية."', r: 'language === "en" ? "This is a draft purchase order directed to the mentioned supplier to prepare the order." : "هذا طلب شراء مبدئي موجه للمورد المذكور لتجهيز الطلبية."' },
    { s: '#', r: '#' }, // No need
    { s: '>الصنف<', r: '>{language === "en" ? "Item" : "الصنف"}<' },
    { s: '>الكمية<', r: '>{language === "en" ? "Qty" : "الكمية"}<' },
    { s: '>سعر الشراء<', r: '>{language === "en" ? "Purchase Price" : "سعر الشراء"}<' },
    { s: '>المجموع<', r: '>{language === "en" ? "Total" : "المجموع"}<' },
    { s: 'الإجمالي الكلي:', r: '{language === "en" ? "Grand Total:" : "الإجمالي الكلي:"}' },
    { s: 'المدفوع:', r: '{language === "en" ? "Paid:" : "المدفوع:"}' },
    { s: 'المتبقي (دين):', r: '{language === "en" ? "Remaining (Debt):" : "المتبقي (دين):"}' },
    { s: '>شكراً لتعاملكم معنا.<', r: '>{language === "en" ? "Thank you for doing business with us." : "شكراً لتعاملكم معنا."}<' },
    { s: '>تم إصدار هذه الوثيقة من نظام روشتة لإدارة الصيدليات<', r: '>{language === "en" ? "This document was issued by Roshetta Pharmacy Management System" : "تم إصدار هذه الوثيقة من نظام روشتة لإدارة الصيدليات"}<' },
    { s: 'تنزيل PDF', r: '{language === "en" ? "Download PDF" : "تنزيل PDF"}' }
];

for (let r of reps) {
    c = c.split(r.s).join(r.r);
}

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed PDF template strings in purchases page');
