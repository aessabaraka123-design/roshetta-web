const fs = require('fs');
let code = fs.readFileSync('web/src/app/returns/page.tsx', 'utf8');

const targetSearchBlock = `                      <div className="text-[13px] text-ink-soft mt-1">
                        {new Date(sale.date).toLocaleString("ar-EG")}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-bold text-ink text-[16px]">
                        {sale.total.toLocaleString()} ₪
                      </div>`;

const newSearchBlock = `                      <div className="text-[13px] text-ink-soft mt-1 flex items-center gap-2">
                        <span>{new Date(sale.date).toLocaleString("ar-EG")}</span>
                        <span className="w-1 h-1 rounded-full bg-mint-line"></span>
                        <span className="font-bold text-teal">{sale.branchName || "الرئيسي"}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-mono font-bold text-ink text-[16px]">
                        {sale.total.toLocaleString()} ₪
                      </div>`;

if (code.includes(targetSearchBlock)) {
  code = code.replace(targetSearchBlock, newSearchBlock);
  fs.writeFileSync('web/src/app/returns/page.tsx', code, 'utf8');
  console.log("Patched returns search results with branchName");
} else {
  console.log("Could not find search block in returns page");
}
