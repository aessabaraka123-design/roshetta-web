const fs = require('fs');

let page = fs.readFileSync('web/src/app/stock-take/page.tsx', 'utf8');

const thReplacement = `<th className="p-4 font-semibold border-b border-mint-line text-start">
                {language === 'en' ? 'Item' : "الصنف"}
              </th>
              <th className="p-4 font-semibold border-b border-mint-line text-start">
                {language === 'en' ? 'Branch' : "الفرع"}
              </th>`;

page = page.replace(
  `<th className="p-4 font-semibold border-b border-mint-line text-start">
                {language === 'en' ? 'Item' : "الصنف"}
              </th>`,
  thReplacement
);

const tdReplacement = `<td className="p-4">
                    <div className="font-bold text-[16px] text-ink">
                      {item.name}
                    </div>
                    <div className="text-[12px] font-mono text-ink-soft">
                      {item.barcode}
                    </div>
                  </td>
                  <td className="p-4 text-start font-bold text-[14px] text-ink-soft">
                    {(() => {
                      const bId = String(item.branch_id);
                      if (!bId || bId === "all" || bId === "null" || bId === "undefined") return language === 'en' ? 'Main' : 'الرئيسي';
                      const b = branches.find((x: any) => String(x.id) === bId);
                      return b ? b.name : (language === 'en' ? 'Main' : 'الرئيسي');
                    })()}
                  </td>`;

page = page.replace(
  `<td className="p-4">
                    <div className="font-bold text-[16px] text-ink">
                      {item.name}
                    </div>
                    <div className="text-[12px] font-mono text-ink-soft">
                      {item.barcode}
                    </div>
                  </td>`,
  tdReplacement
);

fs.writeFileSync('web/src/app/stock-take/page.tsx', page, 'utf8');
console.log("Updated stock-take page with Branch column!");
