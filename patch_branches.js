const fs = require('fs');

function patchBranches() {
  let code = fs.readFileSync('web/src/app/branches/page.tsx', 'utf8');

  code = code.replace(
    'password: "123",\n  });',
    'password: "123",\n    controlledMedsAccess: false,\n  });'
  );
  
  code = code.replace(
    '          password: newStaff.password,\n          role: newStaff.role,\n          branch: newStaff.branch,\n        }),',
    '          password: newStaff.password,\n          role: newStaff.role,\n          branch: newStaff.branch,\n          controlledMedsAccess: newStaff.controlledMedsAccess ? 1 : 0,\n        }),'
  );
  
  code = code.replace(
    '    setNewStaff({\n      name: emp.name || "",\n      branch: emp.branch || "",\n      role: emp.role || "صيدلي أول",\n      phone: emp.email || "",\n      password: emp.password || "",\n    });',
    '    setNewStaff({\n      name: emp.name || "",\n      branch: emp.branch || "",\n      role: emp.role || "صيدلي أول",\n      phone: emp.email || "",\n      password: emp.password || "",\n      controlledMedsAccess: emp.controlledMedsAccess === 1,\n    });'
  );
  
  const checkboxStr = `                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-bold text-ink-soft mb-2">
                    كلمة المرور
                  </label>
                  <input
                    type="text"
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    className="w-full border border-mint-line rounded-xl p-3 outline-none focus:border-primary font-mono text-[14px]"
                  />
                </div>
              </div>`;
              
  const replacementStr = checkboxStr + `
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
                </div>`;
                
  if (code.includes(checkboxStr)) {
    code = code.replace(checkboxStr, replacementStr);
    fs.writeFileSync('web/src/app/branches/page.tsx', code, 'utf8');
    console.log("Patched branches/staff modal for controlledMedsAccess");
  } else {
    console.log("Could not find insertion point for checkbox in branches/page.tsx");
  }
}

patchBranches();
