const fs = require('fs');

function patchAddItem() {
  let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');
  
  // 1. Add isControlled to formData
  code = code.replace(
    'branch_id: "",\n  });',
    'branch_id: "",\n    isControlled: false,\n  });'
  );
  
  // 2. Add checkbox in UI
  const categoryStr = `            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-bg border-none rounded-xl p-4 text-[15px] outline-none"
            >
              <option value="">- اختر التصنيف -</option>
              <option value="أدوية عامة">أدوية عامة</option>
              <option value="مضاد حيوي">مضاد حيوي</option>
              <option value="مسكنات">مسكنات</option>
              <option value="فيتامينات">فيتامينات</option>
              <option value="مستلزمات">مستلزمات طبية</option>
            </select>
          </div>
        </div>`;
        
  const newCategoryStr = `            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-bg border-none rounded-xl p-4 text-[15px] outline-none"
            >
              <option value="">- اختر التصنيف -</option>
              <option value="أدوية عامة">أدوية عامة</option>
              <option value="مضاد حيوي">مضاد حيوي</option>
              <option value="مسكنات">مسكنات</option>
              <option value="فيتامينات">فيتامينات</option>
              <option value="مستلزمات">مستلزمات طبية</option>
            </select>
          </div>
        </div>
        
        {/* Controlled Medicine Checkbox */}
        <div className="bg-card border-2 border-mint-line rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[16px] font-bold text-teal block">
                دواء خاضع للرقابة (مراقبة)
              </label>
              <span className="text-xs text-ink-soft">لا يمكن بيعه إلا بصلاحيات من الإدارة</span>
            </div>
            <input
              type="checkbox"
              checked={formData.isControlled}
              onChange={(e) => setFormData(prev => ({ ...prev, isControlled: e.target.checked }))}
              className="w-6 h-6 accent-teal cursor-pointer"
            />
          </div>
        </div>
`;
  code = code.replace(categoryStr, newCategoryStr);

  fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
}

patchAddItem();
console.log("Patched add-item");
