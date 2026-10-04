const fs = require('fs');

let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const oldActionsStart = code.indexOf('{/* Actions (Hidden on Print) */}');
const oldActionsEnd = code.indexOf('          </div>\n        </div>\n      )}');

if (oldActionsStart > -1 && oldActionsEnd > -1) {
  const replacement = `{/* Actions (Hidden on Print) */}
            <div
              className="mt-8 flex flex-col gap-2 print:hidden w-full px-4"
              style={{ maxWidth: printerSize === "80mm" ? "320px" : "230px" }}
            >
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all text-sm"
              >
                طباعة حرارية (للكاشير)
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const element = document.getElementById("pos-receipt-content");
                    if (!element) return;
                    const widthMm = printerSize === "80mm" ? 80 : 58;
                    try {
                      const html2canvas = (await import("html2canvas")).default;
                      const jsPDF = (await import("jspdf")).jsPDF;
                      const originalBoxShadow = element.style.boxShadow;
                      const originalBorder = element.style.border;
                      element.style.boxShadow = "none";
                      element.style.border = "none";
                      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#FDFAED" });
                      element.style.boxShadow = originalBoxShadow;
                      element.style.border = originalBorder;
                      const imgData = canvas.toDataURL("image/png");
                      const heightMm = (canvas.height * widthMm) / canvas.width;
                      const pdf = new jsPDF("p", "mm", [widthMm, heightMm]);
                      pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
                      pdf.save(\`receipt_\${lastInvoice?.id || Date.now()}.pdf\`);
                    } catch (err) {
                      console.error("PDF error", err);
                    }
                  }}
                  className="flex-1 py-3 bg-amber text-white font-bold rounded-xl hover:bg-amber/90 transition-all text-sm"
                >
                  إيصال PDF
                </button>
                
                <button
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
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm"
                >
                  فاتورة A4
                </button>
              </div>

              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all text-sm"
              >
                إغلاق
              </button>
            </div>
`;

  const originalChunk = code.substring(oldActionsStart, oldActionsEnd);
  code = code.replace(originalChunk, replacement);
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Updated buttons successfully");
} else {
  console.log("Could not find boundaries");
}
