const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const searchLabelRegex = /<label className="block text-\[13px\] font-bold text-ink-soft mb-1\.5">إضافة أصناف \*<\/label>/;
if (searchLabelRegex.test(code)) {
  const replacement = `<div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[13px] font-bold text-ink-soft">إضافة أصناف *</label>
                    <button type="button" onClick={() => {
                      const lowStock = inventory.filter((item: any) => item.qty <= (item.minQty || 5));
                      const newItems = lowStock.map((drug: any) => ({
                        id: drug.id,
                        name: drug.name,
                        qty: (drug.minQty || 5) - drug.qty + 10, // Suggest a quantity to order
                        purchase_price: drug.buyPrice || drug.cost || 0
                      }));
                      
                      // Merge with existing cart to avoid duplicates
                      const existingIds = new Set(cartItems.map((c: any) => c.id));
                      const itemsToAdd = newItems.filter((item: any) => !existingIds.has(item.id));
                      
                      if (itemsToAdd.length > 0) {
                        setCartItems((prev: any) => [...prev, ...itemsToAdd]);
                        toast.success(\`تمت إضافة \${itemsToAdd.length} صنف من النواقص تلقائياً\`);
                      } else {
                        toast.error("لا توجد نواقص جديدة لإضافتها أو أن جميع النواقص مضافة مسبقاً");
                      }
                    }} className="text-[12px] font-bold text-primary hover:underline bg-primary-pale px-3 py-1 rounded-lg">
                      + جلب النواقص تلقائياً
                    </button>
                  </div>`;
  
  code = code.replace(searchLabelRegex, replacement);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully injected Auto-Pull Low Stock button!');
} else {
  console.log('Failed to match search label in frontend.');
}
