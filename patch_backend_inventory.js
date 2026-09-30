const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// We need to update the POST /api/pharmacies/:id/purchase-invoices endpoint
// to also update cost and units JSON in the inventory.

const postSearch = `
        (items || []).forEach((item) => {
          const _effQty1 = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [_effQty1, item.id, pharmacy_id]);
        });`;

const postReplace = `
        (items || []).forEach((item) => {
          const _effQty1 = Math.round((item.qty || 0) * (item.unit_size || 1));
          const unitsData = JSON.stringify({
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
            "UPDATE inventory SET qty = qty + ?, cost = ?, units = ? WHERE id = ? AND pharmacy_id = ?", 
            [_effQty1, item.purchase_price || 0, unitsData, item.id, pharmacy_id]
          );
        });`;

code = code.replace(postSearch, postReplace);

// We also need to update the PUT /api/pharmacies/:id/purchase-invoices/:invId/complete endpoint
const putSearch = `
        items.forEach((item) => {
          const _effQty2 = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [_effQty2, item.id, pharmacy_id]);
        });`;

const putReplace = `
        items.forEach((item) => {
          const _effQty2 = Math.round((item.qty || 0) * (item.unit_size || 1));
          const unitsData = JSON.stringify({
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
            "UPDATE inventory SET qty = qty + ?, cost = ?, units = ? WHERE id = ? AND pharmacy_id = ?", 
            [_effQty2, item.purchase_price || 0, unitsData, item.id, pharmacy_id]
          );
        });`;

code = code.replace(putSearch, putReplace);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Backend inventory update logic patched for unit structures and cost.');
