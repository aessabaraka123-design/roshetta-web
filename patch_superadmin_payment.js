const fs = require('fs');
let appJs = fs.readFileSync('superadmin/assets/app.js', 'utf8');

// Patch 1: bop -> bank, jawwalpay -> jawwal
const oldString = `r.payment_method === "bop" ? "بنك فلسطين" : r.payment_method === "palpay" ? "PalPay" : r.payment_method === "jawwalpay" ? "Jawwal Pay" : "-"`;
const newString = `(r.payment_method === "bop" || r.payment_method === "bank") ? "بنك فلسطين" : r.payment_method === "palpay" ? "PalPay" : (r.payment_method === "jawwalpay" || r.payment_method === "jawwal") ? "Jawwal Pay" : r.payment_method || "-"`;

if (appJs.includes(oldString)) {
  appJs = appJs.replace(oldString, newString);
  fs.writeFileSync('superadmin/assets/app.js', appJs, 'utf8');
  console.log("Patched superadmin app.js!");
} else {
  console.log("Could not find the string in superadmin app.js");
}
