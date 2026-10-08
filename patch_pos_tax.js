const fs = require('fs');
let page = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

if (!page.includes('print-settings')) {
    // 1. Add SWR for settings
    const insertSWR = `
  const { data: presData } = useSWR(
    user
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/prescriptions\`
      : null,
    fetcher,
  );
  
  const { data: settingsData } = useSWR(
    user
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/print-settings\`
      : null,
    fetcher,
  );
  const pharmacySettings = settingsData?.settings || {};
  const enableTax = pharmacySettings.enableTax === 1;
  const taxRate = pharmacySettings.taxRate || 16;
  
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">("amount");
  
  // Calculate Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice || item.price) * item.cartQty, 0);
  
  let discountAmount = 0;
  if (discountValue && !isNaN(parseFloat(discountValue))) {
    if (discountType === "percent") {
      discountAmount = subtotal * (parseFloat(discountValue) / 100);
    } else {
      discountAmount = parseFloat(discountValue);
    }
  }
  
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = enableTax ? taxableAmount * (taxRate / 100) : 0;
  const finalTotal = taxableAmount + taxAmount;
  `;
  
    page = page.replace(
        `  const { data: presData } = useSWR(
    user
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/prescriptions\`
      : null,
    fetcher,
  );`,
        insertSWR
    );
    
    // 2. Modify cart total calculation
    page = page.replace(
        `const cartTotal = cart.reduce(
    (sum, item) => sum + (item.unitPrice || item.price) * item.cartQty,
    0,
  );`,
        `const cartTotal = finalTotal;`
    );
    
    // 3. Modify API submission to include tax and discount
    page = page.replace(
        `          body: JSON.stringify({
            items: cart.map((i) => ({
              id: i.id,
              name: i.name,
              qty: 1, // original logic keeps 1, wait, let's keep it exactly as is
              cartQty: i.cartQty,
              deductQty: i.cartQty * (i.unitCount || 1), // How many pills to deduct
              price: i.price, // full box price
              unitPrice: i.unitPrice, // price per pill
              cost: i.cost,
              unitCount: i.unitCount,
              unitName: i.unitName,
            })),
            paymentMethod: payMethod,
            total: cartTotal,
            customerId: selectedCustomerId,
            customerName: selectedCustomerName,
            date: new Date().toISOString(),
            cashierName: user?.managerName || user?.username,
            branchName: user?.branch || "all",
          }),`,
        `          body: JSON.stringify({
            items: cart.map((i) => ({
              id: i.id,
              name: i.name,
              qty: 1,
              cartQty: i.cartQty,
              deductQty: i.cartQty * (i.unitCount || 1),
              price: i.price,
              unitPrice: i.unitPrice,
              cost: i.cost,
              unitCount: i.unitCount,
              unitName: i.unitName,
            })),
            paymentMethod: payMethod,
            subtotal,
            discount: discountAmount,
            tax: taxAmount,
            total: cartTotal,
            customerId: selectedCustomerId,
            customerName: selectedCustomerName,
            date: new Date().toISOString(),
            cashierName: user?.managerName || user?.username,
            branchName: user?.branch || "all",
          }),`
    );
    
    // 4. Reset discount after checkout
    page = page.replace(
        `setCart([]);
        setSelectedCustomerId(null);
        setSelectedCustomerName("");
        setInvoiceCustomer(null);`,
        `setCart([]);
        setSelectedCustomerId(null);
        setSelectedCustomerName("");
        setInvoiceCustomer(null);
        setDiscountValue("");`
    );
    
    // 5. Add Discount UI before total
    const uiInsert = `
              {/* Discount Section */}
              <div className="flex gap-2 items-center mb-4">
                <div className="flex bg-white/10 rounded-xl overflow-hidden border border-white/20">
                  <button 
                    onClick={() => setDiscountType("amount")}
                    className={\`px-3 py-1 text-sm font-bold \${discountType === "amount" ? "bg-white text-primary" : "text-white"}\`}
                  >
                    ₪
                  </button>
                  <button 
                    onClick={() => setDiscountType("percent")}
                    className={\`px-3 py-1 text-sm font-bold \${discountType === "percent" ? "bg-white text-primary" : "text-white"}\`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  placeholder={language === 'en' ? "Discount" : "الخصم"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl p-2 text-white placeholder:text-white/50 outline-none focus:border-white text-start font-mono"
                  dir="ltr"
                />
              </div>

              {/* Totals Breakdown */}
              {(discountAmount > 0 || enableTax) && (
                <div className="space-y-2 mb-4 text-[14px] border-b border-white/20 pb-4">
                  <div className="flex justify-between items-center text-white/80">
                    <span>{language === 'en' ? "Subtotal:" : "المجموع الفرعي:"}</span>
                    <span dir="ltr">₪{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-coral-pale font-bold">
                      <span>{language === 'en' ? "Discount:" : "الخصم:"}</span>
                      <span dir="ltr">-₪{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {enableTax && (
                    <div className="flex justify-between items-center text-mint-pale font-bold">
                      <span>{language === 'en' ? \`VAT (\${taxRate}%):\` : \`ضريبة (\${taxRate}%):\`}</span>
                      <span dir="ltr">+₪{taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
    `;
    
    // Find where the Total is displayed
    page = page.replace(
        `          <div className="bg-gradient-to-br from-primary to-teal p-6 rounded-2xl shadow-xl border border-white/10 mt-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="text-white/80 text-[16px] font-medium">
                {language === 'en' ? "Total Amount:" : "الإجمالي المطلوب:"}
              </span>`,
        `          <div className="bg-gradient-to-br from-primary to-teal p-6 rounded-2xl shadow-xl border border-white/10 mt-auto">
            ${uiInsert}
            <div className="flex justify-between items-center mb-6">
              <span className="text-white/80 text-[16px] font-medium">
                {language === 'en' ? "Final Total:" : "الإجمالي النهائي:"}
              </span>`
    );

    fs.writeFileSync('web/src/app/pos/page.tsx', page, 'utf8');
    console.log("Patched POS UI for taxes and discounts!");
} else {
    console.log("POS already patched!");
}
