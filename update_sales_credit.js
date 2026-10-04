const fs = require('fs');
let content = fs.readFileSync('web/src/app/sales/page.tsx', 'utf8');

const oldStr = `? "ذمم"
                              : selectedInvoice.paymentMethod}`;
const newStr = `? "ذمم" + (selectedInvoice.customer?.name ? " (باسم: " + selectedInvoice.customer.name + ")" : "")
                              : selectedInvoice.paymentMethod}`;

content = content.replace(oldStr, newStr);

fs.writeFileSync('web/src/app/sales/page.tsx', content);
console.log("Updated sales page");
