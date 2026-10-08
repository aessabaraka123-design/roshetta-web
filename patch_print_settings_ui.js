const fs = require('fs');
let page = fs.readFileSync('web/src/app/print-settings/page.tsx', 'utf8');

if (!page.includes('enableTax')) {
    page = page.replace(
        'receiptFooter: data.settings?.receiptFooter || "",',
        `receiptFooter: data.settings?.receiptFooter || "",
      enableTax: data.settings?.enableTax === 1,
      taxRate: data.settings?.taxRate || 16,`
    );
    
    page = page.replace(
        'const [formData, setFormData] = useState({',
        `const [formData, setFormData] = useState({
    enableTax: false,
    taxRate: 16,`
    );
    
    const insertUI = `
            {/* Tax Settings */}
            <div className="pt-6 mt-6 border-t border-mint-line">
              <h3 className="text-lg font-bold text-primary mb-4">{language === "en" ? "Tax & Discount Settings" : "إعدادات الضرائب والخصومات"}</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enableTax}
                    onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                  <span className="text-[15px] font-bold text-ink">
                    {language === "en" ? "Enable Tax System (VAT)" : "تفعيل نظام ضريبة القيمة المضافة (VAT)"}
                  </span>
                </label>
                
                {formData.enableTax && (
                  <div className="pl-8 transition-all">
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      {language === "en" ? "Tax Rate (%)" : "نسبة الضريبة (%)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[15px] outline-none focus:border-primary text-start font-mono"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}`;
    page = page.replace('{/* Save Button */}', insertUI);
    fs.writeFileSync('web/src/app/print-settings/page.tsx', page, 'utf8');
    console.log("Patched print-settings UI!");
}
