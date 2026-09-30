const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Add showPreviewModal state
const stateHook = /const \[showPayModal, setShowPayModal\] = useState<any>\(null\);/;
if (stateHook.test(code)) {
  code = code.replace(stateHook, `const [showPayModal, setShowPayModal] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<any>(null);`);
  console.log('Added showPreviewModal state');
} else {
  console.log('Could not find state hook');
}

// 2. Add "معاينة" button to the card
const actionButtons = /<button onClick=\{\(\) => handleDelete\(inv\.id\)\} className="px-4 py-2 bg-bg text-coral rounded-xl text-\[13px\] font-bold hover:bg-coral hover:text-white transition-all">حذف<\/button>\r?\n\s*<\/div>/;
if (actionButtons.test(code)) {
  const replacement = `<button onClick={() => setShowPreviewModal(inv)} className="px-4 py-2 bg-bg text-primary rounded-xl text-[13px] font-bold hover:bg-primary-pale transition-all">معاينة</button>
                    <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">حذف</button>
                  </div>`;
  code = code.replace(actionButtons, replacement);
  console.log('Added preview button');
} else {
  console.log('Could not find action buttons');
}

// 3. Add Preview Modal JSX at the end, right before </div></DashboardLayout>
const modalInsertion = /\{\/\* Pay Modal \*\/\}/;
if (modalInsertion.test(code)) {
  const modalJSX = `{/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl border border-mint-line max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">معاينة الفاتورة</h3>
              <button onClick={() => setShowPreviewModal(null)} className="p-2 bg-bg rounded-full text-ink-soft hover:text-coral">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2" id="printable-invoice">
              <div className="text-center mb-6">
                <div className="text-[24px] font-black text-primary mb-1">{showPreviewModal.supplier_name || 'لا يوجد مورد'}</div>
                <div className="text-[14px] font-bold text-ink-soft">
                  نوع الفاتورة: {showPreviewModal.status === 'draft' ? <span className="text-coral">مبدئية (طلبية)</span> : <span className="text-teal">فعلية (مكتملة)</span>}
                </div>
                {showPreviewModal.invoice_number && <div className="text-[13px] text-ink-soft mt-1">رقم الفاتورة: {showPreviewModal.invoice_number}</div>}
                <div className="text-[12px] text-ink-soft mt-1">{new Date(showPreviewModal.date).toLocaleString('ar-EG')}</div>
              </div>

              <div className="mb-6">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b-2 border-mint-line">
                      <th className="pb-2 text-[14px] font-bold text-ink">الصنف</th>
                      <th className="pb-2 text-[14px] font-bold text-ink text-center">الكمية</th>
                      <th className="pb-2 text-[14px] font-bold text-ink text-left">السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showPreviewModal.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-mint-line/50">
                        <td className="py-3 text-[14px] font-bold text-ink">{item.name}</td>
                        <td className="py-3 text-[14px] font-bold text-ink text-center">{item.qty}</td>
                        <td className="py-3 text-[14px] font-mono font-bold text-ink text-left">₪{(item.purchase_price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center bg-bg p-4 rounded-xl border border-mint-line">
                <span className="text-[16px] font-black text-ink">الإجمالي:</span>
                <span className="text-[20px] font-mono font-black text-primary">₪{(showPreviewModal.total_cost || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => {
                const printContents = document.getElementById('printable-invoice')?.innerHTML;
                if(printContents) {
                  const originalContents = document.body.innerHTML;
                  document.body.innerHTML = printContents;
                  window.print();
                  document.body.innerHTML = originalContents;
                  window.location.reload();
                }
              }} className="flex-1 bg-primary text-white py-3.5 rounded-xl font-bold text-[14px] hover:opacity-90">
                طباعة الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}`;
  
  code = code.replace(modalInsertion, modalJSX);
  console.log('Added preview modal');
} else {
  console.log('Could not find modal insertion point');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
