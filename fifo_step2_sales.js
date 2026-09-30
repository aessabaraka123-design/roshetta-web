const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Find the old block using a unique partial string
const oldBlock = `                const deductAmount =
                  cartItem.deductQty || cartItem.cartQty || cartItem.qty || 1;
                const saleDate = date.split("T")[0];
                
                // FIFO: Read batches, deduct from oldest first, update current price to oldest batch price
                db.get("SELECT batches, qty FROM inventory WHERE id = ? AND pharmacy_id = ?", [cartItem.id, pharmacy_id], (bErr, invRow) => {
                  let batches = [];
                  try { batches = JSON.parse((invRow && invRow.batches) || '[]'); } catch(e) {}
                  
                  let remaining = deductAmount;
                  let activeBatchPrice = null;
                  let activeBatchCost = null;
                  
                  if (batches.length > 0) {
                    // Deduct from batches FIFO order (oldest first)
                    for (let i = 0; i < batches.length && remaining > 0; i++) {
                      const batchRemaining = batches[i].remaining || batches[i].qty || 0;
                      if (batchRemaining <= 0) continue;
                      
                      const toDeduct = Math.min(remaining, batchRemaining);
                      batches[i].remaining = batchRemaining - toDeduct;
                      remaining -= toDeduct;
                    }
                    
                    // Remove exhausted batches
                    batches = batches.filter(b => (b.remaining || 0) > 0);
                    
                    // Current active price = oldest remaining batch
                    if (batches.length > 0) {
                      activeBatchPrice = batches[0].price;
                      activeBatchCost = batches[0].cost;
                    }
                  }
                  
                  // Build update SQL
                  const batchesJson = JSON.stringify(batches);
                  if (activeBatchPrice !== null) {
                    // Update qty, batches, AND set price/cost to the current active (oldest) batch
                    db.run(
                      "UPDATE inventory SET qty = MAX(0, qty - ?), batches = ?, price = ?, cost = ?, lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                      [deductAmount, batchesJson, activeBatchPrice, activeBatchCost, saleDate, cartItem.id, pharmacy_id]
                    );
                  } else {
                    // No batches data — just deduct qty normally
                    db.run(
                      "UPDATE inventory SET qty = MAX(0, qty - ?), lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                      [deductAmount, saleDate, cartItem.id, pharmacy_id]
                    );
                  }
                });`;

// Check if already patched
if (server.includes(oldBlock)) {
  console.log('Already patched! No action needed.');
  process.exit(0);
}

// Try to find and replace the old pending logic
const oldPendingBlock = `                const deductAmount =
                  cartItem.deductQty || cartItem.cartQty || cartItem.qty || 1;
                const saleDate = date.split("T")[0];
                db.run(
                  \`UPDATE inventory 
                   SET 
                     price = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN pending_price ELSE price END,
                     cost = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN pending_cost ELSE cost END,
                     pending_price = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_price END,
                     pending_cost = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_cost END,
                     pending_qty = CASE WHEN (qty - ?) <= pending_qty AND pending_qty > 0 THEN 0 ELSE pending_qty END,
                     qty = MAX(0, qty - ?), 
                     lastSaleDate = ? 
                   WHERE id = ? AND pharmacy_id = ?\`,
                  [
                    deductAmount,
                    deductAmount,
                    deductAmount,
                    deductAmount,
                    deductAmount,
                    deductAmount,
                    saleDate,
                    cartItem.id,
                    pharmacy_id,
                  ],
                );`;

const newFifoBlock = `                const deductAmount =
                  cartItem.deductQty || cartItem.cartQty || cartItem.qty || 1;
                const saleDate = date.split("T")[0];
                
                // FIFO: Read batches, deduct from oldest first, update price to oldest remaining batch
                db.get("SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?", [cartItem.id, pharmacy_id], (bErr, invRow) => {
                  let batches = [];
                  try { batches = JSON.parse((invRow && invRow.batches) || '[]'); } catch(e) {}
                  
                  let toDeductLeft = deductAmount;
                  let activeBatchPrice = null;
                  let activeBatchCost = null;
                  
                  if (batches.length > 0) {
                    for (let i = 0; i < batches.length && toDeductLeft > 0; i++) {
                      const batchHas = batches[i].remaining || batches[i].qty || 0;
                      if (batchHas <= 0) continue;
                      const taken = Math.min(toDeductLeft, batchHas);
                      batches[i].remaining = batchHas - taken;
                      toDeductLeft -= taken;
                    }
                    batches = batches.filter(b => (b.remaining || 0) > 0);
                    if (batches.length > 0) {
                      activeBatchPrice = batches[0].price;
                      activeBatchCost = batches[0].cost;
                    }
                  }
                  
                  const batchesJson = JSON.stringify(batches);
                  if (activeBatchPrice !== null) {
                    db.run(
                      "UPDATE inventory SET qty = MAX(0, qty - ?), batches = ?, price = ?, cost = ?, lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                      [deductAmount, batchesJson, activeBatchPrice, activeBatchCost, saleDate, cartItem.id, pharmacy_id]
                    );
                  } else {
                    db.run(
                      "UPDATE inventory SET qty = MAX(0, qty - ?), batches = ?, lastSaleDate = ? WHERE id = ? AND pharmacy_id = ?",
                      [deductAmount, batchesJson, saleDate, cartItem.id, pharmacy_id]
                    );
                  }
                });`;

if (server.includes(oldPendingBlock)) {
  server = server.replace(oldPendingBlock, newFifoBlock);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log('SUCCESS: FIFO deduction logic applied to sales endpoint!');
} else {
  // Show what partial is found
  console.log('Block not found exactly. Checking fragments...');
  console.log('Has pending_qty logic?', server.includes('pending_qty AND pending_qty > 0 THEN pending_price'));
  console.log('Has FIFO logic already?', server.includes('FIFO: Read batches'));
}
