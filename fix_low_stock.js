const fs = require('fs');
const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const oldFuncRegex = /const getMedCategory = \(med: Med\): MedCategory\[\] => \{[\s\S]*?return cats;\s*\};/;

const newFunc = `const getMedCategory = (med: Med): MedCategory[] => {
    const cats: MedCategory[] = ["all"];
    
    let boxes = med.qty || 0;
    if (med.units) {
      try {
        const arr = JSON.parse(med.units);
        if (arr && arr.length >= 1 && arr[0].count > 0) {
          boxes = Math.floor(med.qty / arr[0].count);
        }
      } catch (e) {}
    }

    if (med.qty === 0) {
      cats.push("out");
    } else {
      const threshold = (med.minQty !== undefined && med.minQty !== null && med.minQty > 0) ? med.minQty : 5;
      if (boxes < threshold) {
        cats.push("expiring"); // قاربت تنتهي (Low Stock)
      }
    }
    
    // Pseudo logic for expiring: if expiry is within 30 days
    const exp = med.expiry || med.expiry_date;
    if (exp && new Date(exp) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && !cats.includes("expiring")) {
      cats.push("expiring"); // قاربت تنتهي (Nearing Expiry Date)
    }
    if (med.isControlled === 1 || med.isControlled === true) {
      cats.push("controlled");
    }
    return cats;
  };`;

if (oldFuncRegex.test(code)) {
    code = code.replace(oldFuncRegex, newFunc);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log("SUCCESS: Fixed low stock logic");
} else {
    console.log("Could not find getMedCategory");
}
