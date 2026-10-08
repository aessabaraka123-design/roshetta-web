const fs = require('fs');
let code = fs.readFileSync('superadmin/assets/app.js', 'utf8');

const oldFunc = `function viewAdminSale(saleId) {
  const s = currentAdminSales.find(x => x.id === saleId);
  if (!s) return;
  
  document.getElementById("invDetId").textContent = "#" + s.id.slice(0, 8);
  document.getElementById("invDetCustomer").textContent = s.customer || "غير محدد";
  document.getElementById("invDetDate").textContent = s.date ? new Date(s.date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  document.getElementById("invDetCashier").textContent = s.cashierName || "غير محدد";
  document.getElementById("invDetTotal").textContent = new Intl.NumberFormat("en-US").format(s.total || 0) + " ₪";
  
  let items = [];
  try {
    items = JSON.parse(s.items || "[]");
  } catch(e){}
  
  const tbody = document.getElementById("invDetItems");
  if (items.length === 0) {
    tbody.innerHTML = \`<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد أصناف</td></tr>\`;
  } else {
    tbody.innerHTML = items.map(item => \`
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-2 font-semibold text-slate-700">\${item.name || "صنف غير معروف"}</td>
        <td class="px-4 py-2">\${item.qty || 1}</td>
        <td class="px-4 py-2" dir="ltr">\${new Intl.NumberFormat("en-US").format(item.price || 0)} ₪</td>
        <td class="px-4 py-2 font-bold text-slate-800" dir="ltr">\${new Intl.NumberFormat("en-US").format((item.qty || 1) * (item.price || 0))} ₪</td>
      </tr>
    \`).join("");
  }
  
  toggleModal("invoiceModal", true);
}`;

const newFunc = `function viewAdminSale(saleId) {
  const s = currentAdminSales.find(x => x.id === saleId);
  if (!s) return;
  
  let customerName = "غير محدد";
  if (s.customer) {
    if (typeof s.customer === 'string' && s.customer.startsWith('{')) {
      try {
        const cObj = JSON.parse(s.customer);
        customerName = cObj.name || s.customer;
      } catch(e) {
        customerName = s.customer;
      }
    } else {
      customerName = s.customer;
    }
  }

  document.getElementById("invDetId").textContent = "#" + s.id.slice(0, 8);
  document.getElementById("invDetCustomer").textContent = customerName;
  document.getElementById("invDetDate").textContent = s.date ? new Date(s.date).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  document.getElementById("invDetCashier").textContent = s.cashierName || "غير محدد";
  document.getElementById("invDetTotal").textContent = new Intl.NumberFormat("en-US").format(s.total || 0) + " ₪";
  
  let items = [];
  try {
    if (typeof s.items === 'string') {
      items = JSON.parse(s.items);
      if (typeof items === 'string') {
        items = JSON.parse(items); // Double parsed in case it was stringified twice
      }
    } else if (Array.isArray(s.items)) {
      items = s.items;
    }
  } catch(e){}
  
  if (!Array.isArray(items)) {
    items = [];
  }
  
  const tbody = document.getElementById("invDetItems");
  if (items.length === 0) {
    tbody.innerHTML = \`<tr><td colspan="4" class="text-center py-4 text-slate-400">لا توجد أصناف</td></tr>\`;
  } else {
    tbody.innerHTML = items.map(item => \`
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
        <td class="px-4 py-2 font-semibold text-slate-700">\${item.name || item.drug_name || "صنف غير معروف"}</td>
        <td class="px-4 py-2">\${item.qty || 1}</td>
        <td class="px-4 py-2" dir="ltr">\${new Intl.NumberFormat("en-US").format(item.price || item.unit_price || 0)} ₪</td>
        <td class="px-4 py-2 font-bold text-slate-800" dir="ltr">\${new Intl.NumberFormat("en-US").format((item.qty || 1) * (item.price || item.unit_price || 0))} ₪</td>
      </tr>
    \`).join("");
  }
  
  toggleModal("invoiceModal", true);
}`;

// I need to properly escape or just replace the whole text. 
// Since there might be slight text encoding issues, I'll use a dynamic replace.

let funcStart = code.indexOf('function viewAdminSale(saleId)');
let funcEnd = code.indexOf('function deleteAdminSale(saleId)');
if (funcStart !== -1 && funcEnd !== -1) {
  code = code.substring(0, funcStart) + newFunc + '\n\n' + code.substring(funcEnd);
  fs.writeFileSync('superadmin/assets/app.js', code, 'utf8');
  console.log('Successfully patched viewAdminSale!');
} else {
  console.log('Could not find viewAdminSale function bounds.');
}
