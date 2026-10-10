const fs = require('fs');
let appJs = fs.readFileSync('superadmin/assets/app.js', 'utf8');

const oldTd = `<td class="px-4 py-3"><span class="text-xs text-indigo-600 font-bold">\${(r.payment_method === "bop" || r.payment_method === "bank") ? "بنك فلسطين" : r.payment_method === "palpay" ? "PalPay" : (r.payment_method === "jawwalpay" || r.payment_method === "jawwal") ? "Jawwal Pay" : r.payment_method || "-"}</span></td>`;
const newTd = `<td class="px-4 py-3">
        <span class="text-xs text-indigo-600 font-bold">\${(r.payment_method === "bop" || r.payment_method === "bank") ? "بنك فلسطين" : r.payment_method === "palpay" ? "PalPay" : (r.payment_method === "jawwalpay" || r.payment_method === "jawwal") ? "Jawwal Pay" : r.payment_method || "-"}</span>
        \${(r.transferName || r.transferRef) ? \`<div class="text-[10px] text-slate-500 mt-1">\${r.transferName ? "بواسطة: " + r.transferName : ""}<br>\${r.transferRef ? "رقم: " + r.transferRef : ""}</div>\` : ""}
      </td>`;

if (appJs.includes(oldTd)) {
  appJs = appJs.replace(oldTd, newTd);
  fs.writeFileSync('superadmin/assets/app.js', appJs, 'utf8');
  console.log("Patched superadmin app.js for transfer details!");
} else {
  console.log("Could not find the string to patch in app.js");
}
