const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Fix the two purchase invoice inventory update lines to respect unit_size
// Line 1: POST /purchase-invoices (when status is completed)
const old1 = `if (invStatus === 'completed') {
          (items || []).forEach((item) => {
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
          });`;
const new1 = `if (invStatus === 'completed') {
          (items || []).forEach((item) => {
            const effectiveQty = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [effectiveQty, item.id, pharmacy_id]);
          });`;

// Line 2: PUT /complete endpoint
const old2 = `const items = JSON.parse(invoice.items || '[]');
          items.forEach((item) => {
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
          });`;
const new2 = `const items = JSON.parse(invoice.items || '[]');
          items.forEach((item) => {
            const effectiveQty = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [effectiveQty, item.id, pharmacy_id]);
          });`;

// Also fix the DELETE endpoint that reverts inventory
const old3 = `(items || []).forEach((item) => {
            db.run("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);`;
const new3 = `(items || []).forEach((item) => {
            const effectiveQty = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?", [effectiveQty, item.id, pharmacy_id]);`;

if (code.includes(old1)) { code = code.replace(old1, new1); console.log('Fixed POST inventory update'); }
else console.log('Could not find POST inventory update');

if (code.includes(old2)) { code = code.replace(old2, new2); console.log('Fixed PUT /complete inventory update'); }
else console.log('Could not find PUT /complete inventory update');

if (code.includes(old3)) { code = code.replace(old3, new3); console.log('Fixed DELETE inventory revert'); }
else console.log('Could not find DELETE inventory revert');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
