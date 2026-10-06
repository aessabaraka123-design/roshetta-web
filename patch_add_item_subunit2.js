const fs = require('fs');
let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');

const targetHTML = `              <div className="h-px bg-mint-line my-4"></div>

              <div className="flex items-center justify-between mb-4">
                <label className="text-[14px] font-bold text-teal">
                  هل يباع الـ {sub1Name} مجزأ؟ (مثال: حبة)
                </label>
                <input
                  type="checkbox"
                  checked={hasSubUnit2}
                  onChange={(e) => setHasSubUnit2(e.target.checked)}
                  className="w-5 h-5 accent-teal cursor-pointer"
                />
              </div>

              {hasSubUnit2 && (`;
              
const newHTML = `              {sub1Name !== 'حبة' && sub1Name !== 'أمبولة' && sub1Name !== 'قطرة' && (
                <>
                  <div className="h-px bg-mint-line my-4"></div>

                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[14px] font-bold text-teal">
                      هل يباع الـ {sub1Name} مجزأ؟ (مثال: حبة)
                    </label>
                    <input
                      type="checkbox"
                      checked={hasSubUnit2}
                      onChange={(e) => setHasSubUnit2(e.target.checked)}
                      className="w-5 h-5 accent-teal cursor-pointer"
                    />
                  </div>
                </>
              )}

              {sub1Name !== 'حبة' && sub1Name !== 'أمبولة' && sub1Name !== 'قطرة' && hasSubUnit2 && (`;

if (code.includes(targetHTML)) {
  code = code.replace(targetHTML, newHTML);
  fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
  console.log("Patched add-item for subUnit2 visibility");
} else {
  console.log("Could not find target string in add-item");
}
