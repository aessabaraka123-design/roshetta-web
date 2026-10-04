const fs = require('fs');
let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

// Add ID to receipt container
code = code.replace(
  'className="bg-[#FDFAED] border border-mint-line shadow-[0_10px_40px_-15px_rgba(34,62,86,0.15)] p-5 font-mono text-ink relative mx-auto print:shadow-none print:border-none print:p-0 print:w-auto"',
  'id="pos-receipt-content"\n              className="bg-[#FDFAED] border border-mint-line shadow-[0_10px_40px_-15px_rgba(34,62,86,0.15)] p-5 font-mono text-ink relative mx-auto print:shadow-none print:border-none print:p-0 print:w-auto"'
);

// Replace button onClick and text
const oldBtn = `onClick={() =>
                  exportInvoicePDF(
                    {
                      items: cart.map((item: any) => ({
                        ...item,
                        qty: item.cartQty,
                      })),
                      subTotal: total,
                      discount: 0,
                      finalTotal: total,
                      customerName: "",
                    },
                    pharmacyData?.pharmacy?.name || "صيدليتي",
                    Date.now().toString().slice(-6),
                  )
                }
                className="flex-1 py-3 bg-amber text-white font-bold rounded-xl hover:bg-amber/90 transition-all text-sm"
              >
                تصدير A4`;

const newBtn = `onClick={async () => {
                  const element = document.getElementById("pos-receipt-content");
                  if (!element) return;
                  
                  const widthMm = printerSize === "80mm" ? 80 : 58;
                  const pxHeight = element.offsetHeight;
                  // Convert pixels to mm (assuming 96 DPI)
                  const heightMm = (pxHeight * 25.4) / 96;

                  try {
                    const html2pdf = (await import("html2pdf.js")).default;
                    await html2pdf().set({
                      margin: 0,
                      filename: \`invoice_\${lastInvoice?.id || Date.now()}.pdf\`,
                      image: { type: 'jpeg', quality: 1 },
                      html2canvas: { scale: 3, useCORS: true },
                      jsPDF: { unit: 'mm', format: [widthMm, heightMm], orientation: 'portrait' }
                    }).from(element).save();
                  } catch (err) {
                    console.error("PDF generation error", err);
                  }
                }}
                className="flex-1 py-3 bg-amber text-white font-bold rounded-xl hover:bg-amber/90 transition-all text-sm"
              >
                تصدير PDF`;

code = code.replace(oldBtn, newBtn);

fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
console.log("Updated POS page export PDF logic");
