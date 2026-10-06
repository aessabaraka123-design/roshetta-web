const fs = require('fs');
let code = fs.readFileSync('web/src/app/returns/page.tsx', 'utf8');

const targetTableHeaders = `                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl">
                        الكاشير
                      </th>`;

const newTableHeaders = `                      <th className="p-4 font-bold">
                        الفرع
                      </th>
                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl">
                        الكاشير
                      </th>`;

code = code.replace(targetTableHeaders, newTableHeaders);

const targetTableBody = `                        <td className="p-4 text-[14px] font-bold text-primary">
                          {sale.cashierName || "غير معروف"}
                        </td>
                      </tr>`;

const newTableBody = `                        <td className="p-4 text-[14px] font-bold text-ink-soft">
                          {sale.branchName || "الرئيسي"}
                        </td>
                        <td className="p-4 text-[14px] font-bold text-primary">
                          {sale.cashierName || "غير معروف"}
                        </td>
                      </tr>`;

if (code.includes(targetTableBody)) {
  code = code.replace(targetTableBody, newTableBody);
  fs.writeFileSync('web/src/app/returns/page.tsx', code, 'utf8');
  console.log("Patched returns table with branchName");
} else {
  console.log("Could not find table body in returns page");
}
