const fs = require('fs');

let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetStr = `                      <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-mint-line mt-3">
                        <span className="text-[12px] font-bold text-ink-soft">
                          هل يباع مجزأ؟ (مثال: حبة)
                        </span>
                        <div
                          onClick={() =>
                            setEditingItem({
                              ...editingItem,
                              has_subparts: !editingItem.has_subparts,
                            })
                          }
                          className={\`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors \${editingItem.has_subparts ? "bg-primary border-primary" : "bg-white border-mint-line"}\`}
                        >
                          {editingItem.has_subparts && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </label>

                      {editingItem.has_subparts && (`;

const newStr = `                      {editingItem.part1_name !== 'حبة' && editingItem.part1_name !== 'أمبولة' && editingItem.part1_name !== 'قطرة' && (
                        <>
                          <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-mint-line mt-3">
                            <span className="text-[12px] font-bold text-ink-soft">
                              هل يباع مجزأ؟ (مثال: حبة)
                            </span>
                            <div
                              onClick={() =>
                                setEditingItem({
                                  ...editingItem,
                                  has_subparts: !editingItem.has_subparts,
                                })
                              }
                              className={\`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors \${editingItem.has_subparts ? "bg-primary border-primary" : "bg-white border-mint-line"}\`}
                            >
                              {editingItem.has_subparts && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </label>
                        </>
                      )}

                      {editingItem.part1_name !== 'حبة' && editingItem.part1_name !== 'أمبولة' && editingItem.part1_name !== 'قطرة' && editingItem.has_subparts && (`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Patched inventory for has_subparts visibility");
} else {
  console.log("Target string not found in inventory");
}
