const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// =============================================
// 1. Add migration to create batches column
// =============================================
// Find the inventory table creation section and add ALTER TABLE for batches
const migrationTarget = `cols.forEach((c) =>\n              db.run(\`ALTER TABLE inventory ADD COLUMN \${c}\`, () => {}),\n            );`;

const migrationReplace = `cols.forEach((c) =>\n              db.run(\`ALTER TABLE inventory ADD COLUMN \${c}\`, () => {}),\n            );\n            // Add batches column for FIFO pricing\n            db.run(\`ALTER TABLE inventory ADD COLUMN batches TEXT DEFAULT '[]'\`, () => {});`;

server = server.replace(migrationTarget, migrationReplace);

// =============================================
// 2. Patch POST purchase-invoices to create batches instead of overwriting price
// =============================================
const postInventoryUpdate = `          const unitsData = JSON.stringify({
            has_parts: item.has_parts,
            part1_name: item.part1_name,
            part1_qty: item.part1_qty,
            part1_price: item.part1_price,
            has_subparts: item.has_subparts,
            part2_name: item.part2_name,
            part2_qty: item.part2_qty,
            part2_price: item.part2_price
          });
          db.run(
            "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ? WHERE id = ? AND pharmacy_id = ?", 
            [_effQty1, item.purchase_price || 0, item.sell_price || 0, unitsData, item.id, pharmacy_id]
          );`;

const postInventoryReplace = `          const unitsData = JSON.stringify({
            has_parts: item.has_parts,
            part1_name: item.part1_name,
            part1_qty: item.part1_qty,
            part1_price: item.part1_price,
            has_subparts: item.has_subparts,
            part2_name: item.part2_name,
            part2_qty: item.part2_qty,
            part2_price: item.part2_price
          });
          // FIFO: read existing batches, append new batch, update qty & cost & units
          db.get("SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?", [item.id, pharmacy_id], (bErr, row) => {
            let batches = [];
            try { batches = JSON.parse((row && row.batches) || '[]'); } catch(e) {}
            // Add new batch
            batches.push({
              qty: _effQty1,
              remaining: _effQty1,
              cost: item.purchase_price || 0,
              price: item.sell_price || 0,
              date: new Date().toISOString()
            });
            db.run(
              "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
              [_effQty1, item.purchase_price || 0, item.sell_price || 0, unitsData, JSON.stringify(batches), item.id, pharmacy_id]
            );
          });`;

server = server.replace(postInventoryUpdate, postInventoryReplace);

// =============================================
// 3. Patch PUT /complete to also use FIFO batch approach
// =============================================
const putInventoryUpdate = `          const unitsData = JSON.stringify({
            has_parts: item.has_parts,
            part1_name: item.part1_name,
            part1_qty: item.part1_qty,
            part1_price: item.part1_price,
            has_subparts: item.has_subparts,
            part2_name: item.part2_name,
            part2_qty: item.part2_qty,
            part2_price: item.part2_price
          });
          db.run(
            "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ? WHERE id = ? AND pharmacy_id = ?", 
            [_effQty2, item.purchase_price || 0, item.sell_price || 0, unitsData, item.id, pharmacy_id]
          );`;

const putInventoryReplace = `          const unitsData = JSON.stringify({
            has_parts: item.has_parts,
            part1_name: item.part1_name,
            part1_qty: item.part1_qty,
            part1_price: item.part1_price,
            has_subparts: item.has_subparts,
            part2_name: item.part2_name,
            part2_qty: item.part2_qty,
            part2_price: item.part2_price
          });
          db.get("SELECT batches FROM inventory WHERE id = ? AND pharmacy_id = ?", [item.id, pharmacy_id], (bErr, row) => {
            let batches = [];
            try { batches = JSON.parse((row && row.batches) || '[]'); } catch(e) {}
            batches.push({
              qty: _effQty2,
              remaining: _effQty2,
              cost: item.purchase_price || 0,
              price: item.sell_price || 0,
              date: new Date().toISOString()
            });
            db.run(
              "UPDATE inventory SET qty = qty + ?, cost = ?, price = ?, units = ?, batches = ? WHERE id = ? AND pharmacy_id = ?",
              [_effQty2, item.purchase_price || 0, item.sell_price || 0, unitsData, JSON.stringify(batches), item.id, pharmacy_id]
            );
          });`;

server = server.replace(putInventoryUpdate, putInventoryReplace);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log('Step 1: Inventory batch creation patched successfully!');
