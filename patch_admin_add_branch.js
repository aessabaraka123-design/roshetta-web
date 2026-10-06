const fs = require('fs');
let c = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

const reps = [
  { s: '>إضافة فرع جديد<', r: '>{language === "en" ? "Add New Branch" : "إضافة فرع جديد"}<' },
  { s: '>اسم الفرع / المنطقة<', r: '>{language === "en" ? "Branch Name / Area" : "اسم الفرع / المنطقة"}<' },
  { s: '>المدير المسؤول عن الفرع<', r: '>{language === "en" ? "Manager in Charge" : "المدير المسؤول عن الفرع"}<' },
  { s: '>حالة الفرع المبدئية<', r: '>{language === "en" ? "Initial Branch Status" : "حالة الفرع المبدئية"}<' },
  { s: '>حفظ وإضافة<', r: '>{language === "en" ? "Save and Add" : "حفظ وإضافة"}<' },
  { s: '>إلغاء<', r: '>{language === "en" ? "Cancel" : "إلغاء"}<' }
];

for (let r of reps) {
  // We might have newlines or spaces around the text in JSX, so let's use a smarter replace
  // Or just replace the exact text without brackets, since they are unique.
}

// Let's replace the exact text without brackets:
let c2 = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');
c2 = c2.replace('إضافة فرع جديد', '{language === "en" ? "Add New Branch" : "إضافة فرع جديد"}');
c2 = c2.replace('اسم الفرع / المنطقة', '{language === "en" ? "Branch Name / Area" : "اسم الفرع / المنطقة"}');
c2 = c2.replace('المدير المسؤول عن الفرع', '{language === "en" ? "Manager in Charge" : "المدير المسؤول عن الفرع"}');
c2 = c2.replace('حالة الفرع المبدئية', '{language === "en" ? "Initial Branch Status" : "حالة الفرع المبدئية"}');
c2 = c2.replace('حفظ وإضافة', '{language === "en" ? "Save & Add" : "حفظ وإضافة"}');
c2 = c2.replace('إلغاء', '{language === "en" ? "Cancel" : "إلغاء"}');
// Note: "إلغاء" might appear multiple times! Let's do it globally.
c2 = c2.replace(/>إلغاء<\/button>/g, '>{language === "en" ? "Cancel" : "إلغاء"}</button>');
c2 = c2.replace(/>إلغاء</g, '>{language === "en" ? "Cancel" : "إلغاء"}<');

fs.writeFileSync('web/src/app/admin/page.tsx', c2, 'utf8');
console.log('Fixed Add Branch Modal strings');
