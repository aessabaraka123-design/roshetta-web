const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetUI = `                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    اسم الصنف
                  </label>
                  <input
                    required
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                    dir="auto"
                  />
                </div>`;

const newUI = `                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      اسم الصنف (التجاري)
                    </label>
                    <input
                      required
                      value={editingItem.name}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, name: e.target.value })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                      dir="auto"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      الاسم العلمي
                    </label>
                    <input
                      value={editingItem.scientificName || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, scientificName: e.target.value })
                      }
                      className="w-full border border-mint-line rounded-xl p-2.5 outline-none focus:border-primary text-[14px]"
                      dir="auto"
                      placeholder="مثال: Amoxicillin"
                    />
                  </div>
                </div>`;

if (code.includes(targetUI)) {
  code = code.replace(targetUI, newUI);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Patched inventory for scientificName");
} else {
  console.log("Could not find target string for UI patch in inventory");
}
