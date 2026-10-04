const fs = require('fs');
let content = fs.readFileSync('web/src/app/sales/page.tsx', 'utf8');

// Add id to wrapper div
content = content.replace(
  '          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">',
  '          <div id="invoice-modal-content" className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">'
);

// Add id to close button
content = content.replace(
  '<button\n                onClick={() => setSelectedInvoice(null)}\n                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"\n              >',
  '<button\n                id="invoice-modal-close"\n                onClick={() => setSelectedInvoice(null)}\n                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"\n              >'
);

// Replace actions
const oldActions = `            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  router.push(\`/pos?edit=\${selectedInvoice.id}\`);
                }}
                className="flex-1 bg-white text-primary border-2 border-primary font-bold py-3.5 rounded-xl hover:bg-primary-pale transition-all"
              >
                تعديل الفاتورة
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all"
              >
                إغلاق
              </button>
            </div>`;

const newActions = `            <div id="invoice-modal-actions" className="flex gap-2 mt-6">
              <button
                onClick={async () => {
                  const element = document.getElementById("invoice-modal-content");
                  if (!element) return;
                  const actions = document.getElementById("invoice-modal-actions");
                  const closeBtn = document.getElementById("invoice-modal-close");
                  
                  if (actions) actions.style.display = "none";
                  if (closeBtn) closeBtn.style.display = "none";
                  
                  try {
                    const html2pdf = (await import("html2pdf.js")).default;
                    await html2pdf().set({
                      margin: 0.5,
                      filename: \`invoice_\${selectedInvoice.id}.pdf\`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    }).from(element).save();
                  } catch(e) {
                    console.error("PDF generation error:", e);
                  } finally {
                    if (actions) actions.style.display = "flex";
                    if (closeBtn) closeBtn.style.display = "block";
                  }
                }}
                className="flex-1 bg-[#1C2733] text-white font-bold py-3.5 rounded-xl hover:bg-[#5B6A78] transition-all text-[13px]"
              >
                تصدير PDF
              </button>
              <button
                onClick={() => {
                  router.push(\`/pos?edit=\${selectedInvoice.id}\`);
                }}
                className="flex-[1.2] bg-white text-primary border-2 border-primary font-bold py-3.5 rounded-xl hover:bg-primary-pale transition-all text-[13px]"
              >
                تعديل الفاتورة
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-[1.2] bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all text-[13px]"
              >
                إغلاق
              </button>
            </div>`;

content = content.replace(oldActions, newActions);

fs.writeFileSync('web/src/app/sales/page.tsx', content);
console.log("Injected PDF export logic");
