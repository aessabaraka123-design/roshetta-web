const fs = require('fs');

function patchBranches() {
  let code = fs.readFileSync('web/src/app/branches/page.tsx', 'utf8');

  const checkboxStr = `                  />
                </div>
                <button
                  onClick={handleSaveStaff}`;
              
  const replacementStr = `                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    checked={newStaff.controlledMedsAccess}
                    onChange={(e) => setNewStaff({ ...newStaff, controlledMedsAccess: e.target.checked })}
                    className="w-5 h-5 accent-teal cursor-pointer"
                  />
                  <div>
                    <label className="block text-[14px] font-bold text-teal">
                      صلاحية بيع أدوية المراقبة (المخدرة)
                    </label>
                    <span className="text-[11px] text-ink-soft">يسمح للموظف بإضافة هذه الأدوية للفاتورة</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveStaff}`;
                
  if (code.includes(checkboxStr)) {
    code = code.replace(checkboxStr, replacementStr);
    fs.writeFileSync('web/src/app/branches/page.tsx', code, 'utf8');
    console.log("Patched branches/staff modal for controlledMedsAccess");
  } else {
    console.log("Could not find insertion point for checkbox in branches/page.tsx");
  }
}

patchBranches();
