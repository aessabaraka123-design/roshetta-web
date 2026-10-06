const fs = require('fs');

let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetHook = `  useEffect(() => {
    async function fetchBranches() {`;

const newHook = `  // Auto-calculate sub-unit prices
  useEffect(() => {
    if (!editingItem) return;
    const mainPrice = Number(editingItem.price) || 0;
    const s1Qty = Number(editingItem.part1_qty) || 0;
    const s2Qty = Number(editingItem.part2_qty) || 0;
    
    let updated = false;
    let newPart1Price = editingItem.part1_price;
    let newPart2Price = editingItem.part2_price;

    if (mainPrice > 0 && editingItem.has_parts) {
      if (s1Qty > 0) {
        const calc1 = parseFloat((mainPrice / s1Qty).toFixed(2));
        if (editingItem.part1_price !== calc1) {
          newPart1Price = calc1;
          updated = true;
        }
        
        if (editingItem.has_subparts && s2Qty > 0) {
          const calc2 = parseFloat((mainPrice / (s1Qty * s2Qty)).toFixed(2));
          if (editingItem.part2_price !== calc2) {
            newPart2Price = calc2;
            updated = true;
          }
        }
      }
    }
    
    if (updated) {
      setEditingItem({
        ...editingItem,
        part1_price: newPart1Price,
        part2_price: newPart2Price
      });
    }
  }, [
    editingItem?.price,
    editingItem?.part1_qty,
    editingItem?.part2_qty,
    editingItem?.has_parts,
    editingItem?.has_subparts
  ]);

  useEffect(() => {
    async function fetchBranches() {`;

if (code.includes(targetHook)) {
  code = code.replace(targetHook, newHook);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Injected auto-calculate useEffect into inventory");
} else {
  console.log("Could not find target hook in inventory");
}
