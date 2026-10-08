const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldPurchasesUpdate = `              batches.push({
                qty: _effQty1,
                remaining: _effQty1,
                cost: item.purchase_price || 0,
                price: item.sell_price || 0,
                date: new Date().toISOString(),
              });
              db.run(
                "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
                [
                  _effQty1,
                  item.purchase_price || 0,
                  item.sell_price || 0,
                  unitsData,
                  JSON.stringify(batches),
                  item.id,
                  pharmacy_id,
                ],
              );`;

const newPurchasesUpdate = `              batches.push({
                qty: _effQty1,
                remaining: _effQty1,
                cost: item.purchase_price || 0,
                price: item.sell_price || 0,
                date: new Date().toISOString(),
              });
              
              // FIFO Logic: Do NOT overwrite active cost/price if there is still old stock left.
              // Find the first batch that has remaining stock (should be batches[0] usually)
              const activeBatch = batches.find(b => (b.remaining || 0) > 0);
              const finalCost = activeBatch ? activeBatch.cost : (item.purchase_price || 0);
              const finalPrice = activeBatch ? activeBatch.price : (item.sell_price || 0);

              db.run(
                "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
                [
                  _effQty1,
                  finalCost,
                  finalPrice,
                  unitsData,
                  JSON.stringify(batches),
                  item.id,
                  pharmacy_id,
                ],
              );`;

server = server.replace(oldPurchasesUpdate, newPurchasesUpdate);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched purchases FIFO logic!");
