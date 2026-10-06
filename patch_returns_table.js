const fs = require('fs');
let code = fs.readFileSync('web/src/app/returns/page.tsx', 'utf8');

const targetTableHeaders = `                      <th className="p-4 font-bold">
                        قيمة الفاتورة (قبل الاسترجاع)
                      </th>
                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl">
                        الكاشير
                      </th>
                    </tr>`;

const newTableHeaders = `                      <th className="p-4 font-bold">
                        الفرع
                      </th>
                      <th className="p-4 font-bold">
                        قيمة الفاتورة (قبل الاسترجاع)
                      </th>
                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl">
                        الكاشير
                      </th>
                    </tr>`;

code = code.replace(targetTableHeaders, newTableHeaders);

const targetTableBody = `                        <td className="p-4">
                          <div className="text-[14px] font-bold text-ink">
                            {sale.cashier_name}
                          </div>
                        </td>
                      </tr>`;

const newTableBody = `                        <td className="p-4">
                          <div className="text-[14px] font-bold text-ink">
                            {sale.branchName || "الرئيسي"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-[14px] font-bold text-ink">
                            {sale.cashier_name}
                          </div>
                        </td>
                      </tr>`;

if (code.includes(targetTableBody)) {
  code = code.replace(targetTableBody, newTableBody);
  fs.writeFileSync('web/src/app/returns/page.tsx', code, 'utf8');
  console.log("Patched returns table with branchName");
} else {
  console.log("Could not find table body in returns page");
}
