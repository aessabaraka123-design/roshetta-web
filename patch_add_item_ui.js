const fs = require('fs');

let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');

const anchor = `        {/* Units Section */}`;

const checkboxHTML = `
        {/* Controlled Medicine Section */}
        <div className="bg-card border-2 border-mint-line rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[16px] font-bold text-teal block">
                دواء خاضع للرقابة (مراقبة)
              </label>
              <span className="text-xs text-ink-soft">يمنع بيع هذا الدواء إلا بصلاحيات الإدارة</span>
            </div>
            <input
              type="checkbox"
              checked={formData.isControlled}
              onChange={(e) => setFormData(prev => ({ ...prev, isControlled: e.target.checked }))}
              className="w-6 h-6 accent-teal cursor-pointer"
            />
          </div>
        </div>

        {/* Units Section */}`;

if (code.includes(anchor)) {
  code = code.replace(anchor, checkboxHTML);
  
  // Need to also ensure `isControlled` is passed in the POST body!
  // Let's check where fetch happens.
  const fetchAnchor = `body: JSON.stringify({\n        ...formData,`;
  if (code.includes(fetchAnchor)) {
      // It uses ...formData, so isControlled is automatically included! Perfect.
  }
  
  fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
  console.log("Successfully injected isControlled into UI.");
} else {
  console.log("Anchor not found.");
}
