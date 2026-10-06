const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const reps = [
    { s: 'المورد *', r: '{language === "en" ? "Supplier *" : "المورد *"}' },
    { s: 'اختر المورد...', r: '{language === "en" ? "Select Supplier..." : "اختر المورد..."}' },
    { s: 'رقم فاتورة المورد', r: '{language === "en" ? "Supplier Invoice No" : "رقم فاتورة المورد"}' },
    { s: 'اختياري', r: '{language === "en" ? "Optional" : "اختياري"}' },
    { s: 'المبلغ المدفوع (₪)', r: '{language === "en" ? "Paid Amount (₪)" : "المبلغ المدفوع (₪)"}' },
    { s: 'الإجمالي الكلي', r: '{language === "en" ? "Grand Total" : "الإجمالي الكلي"}' },
    { s: 'جلب النواقص', r: '{language === "en" ? "Fetch Shortages" : "جلب النواقص"}' },
    { s: '...ابحث عن صنف وأضفه', r: '{language === "en" ? "Search and add item..." : "...ابحث عن صنف وأضفه"}' },
    { s: 'لم تضف أصنافاً بعد', r: '{language === "en" ? "No items added yet" : "لم تضف أصنافاً بعد"}' },
    { s: 'ابحث عن صنف في الأعلى لإضافته للفاتورة', r: '{language === "en" ? "Search for an item above to add to the invoice" : "ابحث عن صنف في الأعلى لإضافته للفاتورة"}' },
    { s: 'إلغاء', r: '{language === "en" ? "Cancel" : "إلغاء"}' },
    { s: 'حفظ وإدخال للمخزون', r: '{language === "en" ? "Save and Enter to Stock" : "حفظ وإدخال للمخزون"}' }
];

for (let r of reps) {
    c = c.split(r.s).join(r.r);
}

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed purchases modal text');
