const fs = require('fs');

let page = fs.readFileSync('web/src/app/suppliers/page.tsx', 'utf8');

// 1. Add state for Payment Modal
if (!page.includes('isPaymentModalOpen')) {
  page = page.replace(
    'const [isModalOpen, setIsModalOpen] = useState(false);',
    `const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("كاش");
  const [isPaying, setIsPaying] = useState(false);`
  );
}

// 2. Add Payment Handler
if (!page.includes('handlePaymentSubmit')) {
  page = page.replace(
    'const handleDelete = async (id: string) => {',
    `const handleOpenPaymentModal = (e: React.MouseEvent, supplier: any) => {
    e.stopPropagation(); // prevent opening invoices
    setPayingSupplier(supplier);
    setPaymentAmount("");
    setPaymentMethod("كاش");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId || !payingSupplier) return;
    setIsPaying(true);

    try {
      const res = await fetch(
        \`\${API_BASE}/api/pharmacies/\${pharmacyId}/suppliers/\${payingSupplier.id}/payment\`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            paymentMethod,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to process payment");

      toast.success(language === 'en' ? 'Payment processed successfully' : "تم تسجيل الدفعة بنجاح");
      mutate();
      setIsPaymentModalOpen(false);
      setPayingSupplier(null);
    } catch (err) {
      toast.error(language === 'en' ? 'Error processing payment' : "حدث خطأ أثناء التسديد");
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async (id: string) => {`
  );
}

// 3. Add Pay button to table row
if (!page.includes('handleOpenPaymentModal(e, supplier)')) {
  page = page.replace(
    `                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(supplier);
                          }}`,
    `                        <button
                          onClick={(e) => handleOpenPaymentModal(e, supplier)}
                          className="text-teal hover:text-teal/80 transition-colors bg-teal/10 hover:bg-teal/20 w-8 h-8 flex items-center justify-center rounded-lg border border-teal/20"
                          title={language === 'en' ? 'Pay Supplier' : "تسديد دفعة"}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(supplier);
                          }}`
  );
}

// 4. Add Payment Modal JSX at the end
if (!page.includes('Payment Modal')) {
  page = page.replace(
    '{/* Add/Edit Modal */}',
    `{/* Payment Modal */}
      {isPaymentModalOpen && payingSupplier && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#CBD5E1] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[18px] text-primary">
                {language === 'en' ? 'Pay Supplier: ' : "تسديد المورد: "}
                <span className="text-teal">{payingSupplier.name}</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-ink-soft hover:text-coral transition-colors bg-white hover:bg-coral-pale w-8 h-8 flex items-center justify-center rounded-lg border border-[#CBD5E1]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === 'en' ? 'Amount' : "المبلغ (شيكل)"}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all font-mono"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  {language === 'en' ? 'Payment Method' : "طريقة الدفع"}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all"
                >
                  <option value="كاش">{language === 'en' ? 'Cash' : "كاش"}</option>
                  <option value="شيك">{language === 'en' ? 'Cheque' : "شيك"}</option>
                  <option value="حوالة بنكية">{language === 'en' ? 'Bank Transfer' : "حوالة بنكية"}</option>
                  <option value="جوال باي">{language === 'en' ? 'Jawwal Pay' : "جوال باي"}</option>
                  <option value="بال باي">{language === 'en' ? 'PalPay' : "بال باي"}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-ink hover:bg-[#F8FAFC] rounded-lg transition-colors border border-[#CBD5E1] font-medium"
                >
                  {language === 'en' ? 'Cancel' : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-4 py-2 bg-teal hover:bg-teal-dark text-white rounded-lg transition-colors font-medium flex items-center justify-center min-w-[100px]"
                >
                  {isPaying ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    language === 'en' ? 'Pay' : "تسديد"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}`
  );
}

fs.writeFileSync('web/src/app/suppliers/page.tsx', page, 'utf8');
console.log("Patched suppliers frontend UI successfully!");
