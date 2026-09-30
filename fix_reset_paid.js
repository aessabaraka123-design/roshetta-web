const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

code = code.replace(/setForm\(\{ supplier_id:"", supplier_name:"", invoice_number:"", notes:"", branch_id: branchFilter, status: "completed" \}\);/g, 'setForm({ supplier_id:"", supplier_name:"", invoice_number:"", notes:"", branch_id: branchFilter, status: "completed", paid_amount: "" });');

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
