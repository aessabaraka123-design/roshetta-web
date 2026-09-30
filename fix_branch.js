const fs = require('fs');
let code = fs.readFileSync('web/src/app/customers/page.tsx', 'utf8');

const target =                     placeholder="059XXXXXXX"
                    dir="ltr"
                  />
                </div>
              </div>;

const replacement =                     placeholder="059XXXXXXX"
                    dir="ltr"
                  />
                </div>
                {user?.role === 'manager' && branches.length > 0 && (
                  <div>
                    <label className="block text-[14px] font-bold text-ink-soft mb-2">«·›—⁄ «· «»⁄ ·Â «·“»Ê‰</label>
                    <select
                      value={newCustomer.branch_id || ''}
                      onChange={e => setNewCustomer({...newCustomer, branch_id: e.target.value})}
                      className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors text-[14px] font-bold text-primary"
                    >
                      <option value="">«·›—⁄ «·—∆Ì”Ì (·ﬂ· «·›—Ê⁄)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>;

code = code.replace(target, replacement);
fs.writeFileSync('web/src/app/customers/page.tsx', code);
