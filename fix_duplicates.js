const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Fix filteredInv to respect form.branch_id and deduplicate names
const filteredInvRegex = /const filteredInv = inventory\.filter\(\(d: any\) => d\.name\?\.includes\(itemSearch\)\)\.slice\(0,6\);/;
if (filteredInvRegex.test(code)) {
  const replacement = `const branchInventory = form.branch_id === "all" ? inventory : inventory.filter((d: any) => d.branch_id === form.branch_id);
  
  // Deduplicate by name so we don't show the same item 5 times if "all" is selected
  const uniqueInv: any[] = [];
  const seenNames = new Set();
  for (const item of branchInventory) {
    if (!item.name) continue;
    if (!item.name.includes(itemSearch)) continue;
    if (!seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueInv.push(item);
    }
    if (uniqueInv.length >= 6) break;
  }
  const filteredInv = uniqueInv;`;
  
  code = code.replace(filteredInvRegex, replacement);
  console.log('Fixed filteredInv!');
} else {
  console.log('Failed to match filteredInvRegex');
}

// 2. Fix the Auto-pull button to respect form.branch_id
const lowStockRegex = /const lowStock = inventory\.filter\(\(item: any\) => item\.qty <= \(item\.minQty \|\| 5\)\);/;
if (lowStockRegex.test(code)) {
  const replacement = `const branchInventoryForDraft = form.branch_id === "all" ? inventory : inventory.filter((d: any) => d.branch_id === form.branch_id);
                      
                      // Deduplicate by name to pick only one entry per item
                      const uniqueLowStock: any[] = [];
                      const seen = new Set();
                      for (const item of branchInventoryForDraft) {
                        if (item.qty <= (item.minQty || 5)) {
                          if (!seen.has(item.name)) {
                            seen.add(item.name);
                            uniqueLowStock.push(item);
                          }
                        }
                      }
                      
                      const lowStock = uniqueLowStock;`;
                      
  code = code.replace(lowStockRegex, replacement);
  console.log('Fixed lowStock logic!');
} else {
  console.log('Failed to match lowStockRegex');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
