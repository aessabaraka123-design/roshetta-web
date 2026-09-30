const fs = require('fs');
let bCode = fs.readFileSync('C:/roshetta_app/src/screens/staff/BranchesScreen.js', 'utf8');
if (!bCode.includes("s.status !== 'refunded'")) {
  bCode = bCode.replace(
    "const weekTotal = branchSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);",
    "const weekTotal = branchSales.filter(s => s.status !== 'refunded').reduce((sum, s) => sum + (Number(s.total) || 0), 0);"
  );
  fs.writeFileSync('C:/roshetta_app/src/screens/staff/BranchesScreen.js', bCode, 'utf8');
}
