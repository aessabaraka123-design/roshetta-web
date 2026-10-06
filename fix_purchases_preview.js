const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const reps = [
    { s: 'معاينة الفاتورة', r: '{language === "en" ? "Invoice Preview" : "معاينة الفاتورة"}' },
    { s: 'طلبية مبدئية', r: '{language === "en" ? "Draft Order" : "طلبية مبدئية"}' },
    { s: 'مكتملة', r: '{language === "en" ? "Completed" : "مكتملة"}' }, // just in case
    { s: '>الصنف<', r: '>{language === "en" ? "Item" : "الصنف"}<' },
    { s: '>الكمية<', r: '>{language === "en" ? "Qty" : "الكمية"}<' },
    { s: '>السعر<', r: '>{language === "en" ? "Price" : "السعر"}<' },
    { s: 'الإجمالي الكلي', r: '{language === "en" ? "Grand Total" : "الإجمالي الكلي"}' },
    { s: 'المتبقي', r: '{language === "en" ? "Remaining" : "المتبقي"}' },
    { s: 'طباعة الفاتورة', r: '{language === "en" ? "Print Invoice" : "طباعة الفاتورة"}' },
    { s: 'تنزيل PDF', r: '{language === "en" ? "Download PDF" : "تنزيل PDF"}' }
];

for (let r of reps) {
    c = c.split(r.s).join(r.r);
}

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed Purchases Preview Modal');
