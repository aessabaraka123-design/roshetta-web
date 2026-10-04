const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetStr = `                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      تاريخ الصلاحية
                    </label>
                    <input
                      type="month"
                      value={editingItem.expiry_date || ""}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          expiry_date: e.target.value,
                        })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary font-mono text-center text-[14px]"
                      style={{ direction: "ltr" }}
                    />
                  </div>
                </div>`;

const replacementStr = targetStr + `
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    checked={editingItem.isControlled === 1 || editingItem.isControlled === true}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        isControlled: e.target.checked ? 1 : 0,
                      })
                    }
                    className="w-5 h-5 accent-teal cursor-pointer"
                  />
                  <div>
                    <label className="font-bold text-teal block text-[14px]">دواء خاضع للرقابة (مراقبة)</label>
                    <span className="text-[11px] text-ink-soft">يمنع بيع هذا الدواء إلا بصلاحيات الإدارة</span>
                  </div>
                </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Patched inventory edit modal");
} else {
  console.log("Could not find target string in inventory");
}
