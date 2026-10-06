const fs = require('fs');

let code = fs.readFileSync('web/src/app/reports/page.tsx', 'utf8');

const targetBlock = `                exportToExcel(
                  [
                    {
                      totalRevenue: report.totalRevenue,
                      totalProfit: report.totalProfit,
                      totalExpenses: report.totalExpenses,
                      netProfit: report.netProfit,
                    },
                  ],
                  "Financial_Report",
                )
              }
              className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              Excel
            </button>
            <button
              onClick={() =>
                exportComprehensivePDF(
                  report,
                  user.pharmacyName || "صيدليتي",
                  \`\${from} إلى \${to}\`,
                  "Financial_Report",
                )
              }
              className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              PDF
            </button>`;

const newBlock = `                {
                  const now = new Date();
                  const fileName = \`Sales_Report_\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}_\${String(now.getHours()).padStart(2, '0')}-\${String(now.getMinutes()).padStart(2, '0')}\`;
                  exportToExcel(
                    [
                      {
                        totalRevenue: report.totalRevenue,
                        totalProfit: report.totalProfit,
                        totalExpenses: report.totalExpenses,
                        netProfit: report.netProfit,
                      },
                    ],
                    fileName,
                  )
                }
              }
              className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              Excel
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const fileName = \`Sales_Report_\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-\${String(now.getDate()).padStart(2, '0')}_\${String(now.getHours()).padStart(2, '0')}-\${String(now.getMinutes()).padStart(2, '0')}\`;
                exportComprehensivePDF(
                  report,
                  user.pharmacyName || "صيدليتي",
                  \`\${from} إلى \${to}\`,
                  fileName,
                )
              }}
              className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-md"
            >
              PDF
            </button>`;

if (code.includes(targetBlock)) {
  code = code.replace(targetBlock, newBlock);
  fs.writeFileSync('web/src/app/reports/page.tsx', code, 'utf8');
  console.log("Patched PDF export filename in reports");
} else {
  console.log("Target block not found in reports page.");
}
