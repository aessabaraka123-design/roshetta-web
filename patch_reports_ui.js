const fs = require('fs');
let page = fs.readFileSync('web/src/app/reports/page.tsx', 'utf8');

const insertCards = `        <div className="bg-coral text-white rounded-2xl p-5 shadow-lg shadow-coral/20 transform hover:-translate-y-1 transition-all">
          <p className="text-white/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Operating Expenses' : 'المصروفات التشغيلية'}</p>
          <h2 className="text-[28px] font-black" dir="ltr">
            ₪{Number(report.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="bg-teal text-white rounded-2xl p-5 shadow-lg shadow-teal/20 transform hover:-translate-y-1 transition-all">
          <p className="text-white/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Net Profit' : 'صافي الربح'}</p>
          <h2 className="text-[28px] font-black" dir="ltr">
            ₪{Number(report.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* Tax and Discount Extra Cards */}
      {(report.totalDiscount > 0 || report.totalTax > 0) && (
        <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
          {report.totalDiscount > 0 && (
            <div className="bg-coral-pale text-coral border border-coral/20 rounded-2xl p-5 shadow-sm">
              <p className="text-coral/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Total Discounts Given' : 'إجمالي الخصومات الممنوحة'}</p>
              <h2 className="text-[24px] font-black" dir="ltr">
                ₪{Number(report.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          )}
          {report.totalTax > 0 && (
            <div className="bg-mint-pale text-teal border border-teal/20 rounded-2xl p-5 shadow-sm">
              <p className="text-teal/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Total VAT Collected' : 'ضريبة القيمة المضافة المُحصّلة'}</p>
              <h2 className="text-[24px] font-black" dir="ltr">
                ₪{Number(report.totalTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            </div>
          )}
        </div>
      )}`;

const oldCards = `        <div className="bg-coral text-white rounded-2xl p-5 shadow-lg shadow-coral/20 transform hover:-translate-y-1 transition-all">
          <p className="text-white/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Operating Expenses' : 'المصروفات التشغيلية'}</p>
          <h2 className="text-[28px] font-black" dir="ltr">
            ₪{Number(report.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
        <div className="bg-teal text-white rounded-2xl p-5 shadow-lg shadow-teal/20 transform hover:-translate-y-1 transition-all">
          <p className="text-white/80 text-[14px] font-bold mb-1">{language === 'en' ? 'Net Profit' : 'صافي الربح'}</p>
          <h2 className="text-[28px] font-black" dir="ltr">
            ₪{Number(report.netProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </div>`;

page = page.replace(oldCards, insertCards);
fs.writeFileSync('web/src/app/reports/page.tsx', page, 'utf8');
console.log("Patched reports UI for taxes and discounts!");
