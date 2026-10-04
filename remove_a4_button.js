const fs = require('fs');

let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const targetStr = `              <button
                onClick={() =>
                  exportInvoicePDF(
                    {
                      items: cart.map((item: any) => ({
                        ...item,
                        qty: item.cartQty,
                      })),
                      subTotal: total,
                      discount: 0,
                      finalTotal: total,
                      customerName: customers.find((c: any) => c.id === selectedCustomerId)?.name || "",
                    },
                    pharmacyData?.pharmacy?.name || user?.pharmacyName || "صيدليتي",
                    lastInvoice?.id || Date.now().toString().slice(-6)
                  )
                }
                className="flex-1 min-w-[100px] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm"
              >
                فاتورة A4
              </button>
`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, '');
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Removed A4 invoice button");
} else {
  console.log("Could not find the exact button string");
}
