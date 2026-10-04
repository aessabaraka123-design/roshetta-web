const fs = require('fs');

let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const oldLogicStart = code.indexOf('const widthMm = printerSize === "80mm" ? 80 : 58;');
const oldLogicEnd = code.indexOf('console.error("PDF generation error", err);\n                  }\n                }}');

if (oldLogicStart > -1 && oldLogicEnd > -1) {
  const replacement = `const widthMm = printerSize === "80mm" ? 80 : 58;

                  try {
                    // Use html2canvas and jsPDF directly to guarantee a single page of exact size
                    const html2canvas = (await import("html2canvas")).default;
                    const jsPDF = (await import("jspdf")).jsPDF;
                    
                    // Temporarily remove shadow and border for clean capture
                    const originalBoxShadow = element.style.boxShadow;
                    const originalBorder = element.style.border;
                    element.style.boxShadow = "none";
                    element.style.border = "none";
                    
                    const canvas = await html2canvas(element, { 
                      scale: 3, 
                      useCORS: true,
                      backgroundColor: "#FDFAED"
                    });
                    
                    // Restore styles
                    element.style.boxShadow = originalBoxShadow;
                    element.style.border = originalBorder;

                    const imgData = canvas.toDataURL("image/png");
                    
                    // Calculate exact height preserving aspect ratio
                    const heightMm = (canvas.height * widthMm) / canvas.width;
                    
                    // Create single page PDF
                    const pdf = new jsPDF("p", "mm", [widthMm, heightMm]);
                    pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
                    pdf.save(\`invoice_\${lastInvoice?.id || Date.now()}.pdf\`);
                  } catch (err) {
                    `;
  
  const originalChunk = code.substring(oldLogicStart, oldLogicEnd + 'console.error("PDF generation error", err);\n                  }\n                }}'.length);
  const newChunk = replacement + 'console.error("PDF generation error", err);\n                  }\n                }}';
  
  code = code.replace(originalChunk, newChunk);
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Successfully updated POS PDF generation logic");
} else {
  console.log("Could not find the target chunk");
}
