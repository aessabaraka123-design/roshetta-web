const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const reps = [
  { s: 'سعر شراء العلبة', r: '{language === "en" ? "Purchase price (box)" : "سعر شراء العلبة"}' },
  { s: 'سعر بيع العلبة', r: '{language === "en" ? "Sale price (box)" : "سعر بيع العلبة"}' },
  { s: 'الإجمالي للعلب', r: '{language === "en" ? "Total for boxes" : "الإجمالي للعلب"}' },
  { s: 'يُباع بالأجزاء (أشرطة / حبات)؟', r: '{language === "en" ? "Sold in parts (strips/pills)?" : "يُباع بالأجزاء (أشرطة / حبات)؟"}' },
  { s: 'الجزء الأول (مثال: شريط)', r: '{language === "en" ? "First part (e.g. strip)" : "الجزء الأول (مثال: شريط)"}' },
  { s: 'اسم الجزء', r: '{language === "en" ? "Part name" : "اسم الجزء"}' },
  { s: '<option value="شريط">شريط</option>', r: '<option value="شريط">{language === "en" ? "Strip" : "شريط"}</option>' },
  { s: '<option value="أمبولة">أمبولة</option>', r: '<option value="أمبولة">{language === "en" ? "Ampoule" : "أمبولة"}</option>' },
  { s: '<option value="مغلف">مغلف</option>', r: '<option value="مغلف">{language === "en" ? "Sachet" : "مغلف"}</option>' },
  { s: '<option value="قطرة">قطرة</option>', r: '<option value="قطرة">{language === "en" ? "Drop" : "قطرة"}</option>' },
  { s: 'كم {p1Name} في العلبة؟', r: '{language === "en" ? `How many ${p1Name}s in a box?` : `كم ${p1Name} في العلبة؟`}' },
  { s: 'سعر الـ {p1Name}', r: '{language === "en" ? `Price per ${p1Name}` : `سعر الـ ${p1Name}`}' },
  { s: 'هل يباع الـ {p1Name} مجزأ؟ (مثال: حبة)', r: '{language === "en" ? `Is ${p1Name} sold in smaller parts? (e.g. pill)` : `هل يباع الـ ${p1Name} مجزأ؟ (مثال: حبة)`}' },
  { s: '<option value="حبة">حبة</option>', r: '<option value="حبة">{language === "en" ? "Pill" : "حبة"}</option>' },
  { s: '<option value="مل">مل</option>', r: '<option value="مل">{language === "en" ? "ml" : "مل"}</option>' },
  { s: '<option value="غرام">غرام</option>', r: '<option value="غرام">{language === "en" ? "Gram" : "غرام"}</option>' },
  { s: 'كم {p2Name} في الـ {p1Name}؟', r: '{language === "en" ? `How many ${p2Name}s in a ${p1Name}?` : `كم ${p2Name} في الـ ${p1Name}؟`}' },
  { s: 'سعر الـ {p2Name}', r: '{language === "en" ? `Price per ${p2Name}` : `سعر الـ ${p2Name}`}' }
];

for (let r of reps) {
  c = c.replace(r.s, r.r);
}

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Fixed item config fields');
