const fs = require('fs');

let page = fs.readFileSync('web/src/app/customers/page.tsx', 'utf8');

// 1. Add State
page = page.replace(
  'const [paymentAmount, setPaymentAmount] = useState("");',
  'const [paymentAmount, setPaymentAmount] = useState("");\n  const [debtPaymentMethod, setDebtPaymentMethod] = useState("كاش");'
);

// 2. Update Fetch body
page = page.replace(
  'body: JSON.stringify({ payment: Number(paymentAmount) }),',
  'body: JSON.stringify({ payment: Number(paymentAmount), paymentMethod: debtPaymentMethod }),'
);

// 3. Reset state on success
page = page.replace(
  'setPaymentAmount("");',
  'setPaymentAmount("");\n        setDebtPaymentMethod("كاش");'
);

// 4. Add UI element
const uiElement = `              </div>

              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  {language === 'en' ? 'Payment Method' : 'طريقة التحويل / الدفع'}
                </label>
                <select
                  value={debtPaymentMethod}
                  onChange={(e) => setDebtPaymentMethod(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors text-[16px] font-bold"
                >
                  <option value="كاش">{language === 'en' ? 'Cash' : 'كاش (صندوق الكاش)'}</option>
                  <option value="بنكي">{language === 'en' ? 'Bank Transfer' : 'حوالة بنكية'}</option>
                  <option value="جوال باي">{language === 'en' ? 'Jawwal Pay' : 'جوال باي (تطبيق)'}</option>
                  <option value="بال باي">{language === 'en' ? 'PalPay' : 'بال باي (تطبيق)'}</option>
                  <option value="شيك">{language === 'en' ? 'Cheque' : 'شيك'}</option>
                  <option value="أخرى">{language === 'en' ? 'Other' : 'أخرى'}</option>
                </select>
              </div>
            </div>`;

page = page.replace(
  /<\/div>\s*<\/div>\s*<div className="flex gap-3">/,
  uiElement + '\n\n            <div className="flex gap-3">'
);

fs.writeFileSync('web/src/app/customers/page.tsx', page, 'utf8');
console.log("Updated customers page with payment method selector!");
