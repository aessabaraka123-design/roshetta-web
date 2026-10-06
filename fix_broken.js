const fs = require('fs');
let lines = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8').split('\n');

lines[487] = `                {language === 'en' ? "Made a mistake? Don't worry! Deleting a completed invoice automatically reverts the stock 🔄" : "هل أخطأت؟ لا تقلق! حذف الفاتورة المكتملة يسحب كمياتها من المخزون تلقائياً 🔄"}`;

lines[553] = `              {language === 'en' ? "Start by adding a purchase invoice or draft order" : "ابدأ بإضافة فاتورة مشتريات أو طلبية مبدئية"}`;

lines[738] = `                      ? (language === 'en' ? "Draft Order — does not affect stock" : "طلبية مبدئية — لا تؤثر على المخزون")`;

lines[1452] = `                    ? (language === "en" ? "💾 Save as Draft" : "💾 حفظ كطلبية مبدئية")`;
lines[1453] = `                    : (language === "en" ? "✅ Save and Enter to Stock" : "✅ حفظ وإدخال للمخزون")}`;

lines[1868] = `                {language === "en" ? "Download PDF" : "تنزيل PDF"}`;

fs.writeFileSync('web/src/app/purchases/page.tsx', lines.join('\n'), 'utf8');
console.log('Fixed broken lines!');
