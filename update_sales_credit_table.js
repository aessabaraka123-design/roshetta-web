const fs = require('fs');
let content = fs.readFileSync('web/src/app/sales/page.tsx', 'utf8');

const oldStrTable = `? "ذمم"
                                  : sale.paymentMethod}
                    </span>`;
const newStrTable = `? "ذمم" + (sale.customer?.name ? " (" + sale.customer.name + ")" : "")
                                  : sale.paymentMethod}
                    </span>`;

content = content.replace(oldStrTable, newStrTable);

fs.writeFileSync('web/src/app/sales/page.tsx', content);
console.log("Updated sales page table");
