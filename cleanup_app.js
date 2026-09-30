const fs = require('fs');

const appJsPath = 'c:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/superadmin/assets/app.js';
let code = fs.readFileSync(appJsPath, 'utf8');

// 1. Remove dead variables related to staff password
code = code.replace(/let currentEditStaffPass = "";\n?/g, '');
code = code.replace(/currentEditStaffPass = "";\n?/g, '');
code = code.replace(/document\.getElementById\("stPass"\)\.value \|\| currentEditStaffPass/g, 'document.getElementById("stPass").value || ""');

// 2. Remove dead functions (calcRevenue, loadPharmacyStats)
const calcRevPattern = /\/\/ ══════════════════════════════════════════\s*\n\/\/ 💰 إجمالي الأرباح في الداشبورد\s*\n\/\/ ══════════════════════════════════════════\s*\nfunction calcRevenue[\s\S]*?\}\s*\n/g;
const statsPattern = /\/\/ ══════════════════════════════════════════\s*\n\/\/ 📊 إحصائيات الصيدلية - stats panel\s*\n\/\/ ══════════════════════════════════════════\s*\nasync function loadPharmacyStats[\s\S]*?\}\s*\n/g;

code = code.replace(calcRevPattern, '');
code = code.replace(statsPattern, '');

// Clean any redundant empty lines
code = code.replace(/\n\n\n+/g, '\n\n');

fs.writeFileSync(appJsPath, code);

console.log("Cleanup complete");
