const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Use simple string replacements on the actual line patterns
code = code.replace(
  `db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
          });
          if (supplier_id`,
  `const effQty1 = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [effQty1, item.id, pharmacy_id]);
          });
          if (supplier_id`
);

code = code.replace(
  `db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);
          });
        } catch(e) {}`,
  `const effQty2 = Math.round((item.qty || 0) * (item.unit_size || 1));
            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [effQty2, item.id, pharmacy_id]);
          });
        } catch(e) {}`
);

code = code.replace(
  `db.run("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?", [item.qty, item.id, pharmacy_id]);`,
  `const effQty3 = Math.round((item.qty || 0) * (item.unit_size || 1));
              db.run("UPDATE inventory SET qty = MAX(0, qty - ?) WHERE id = ? AND pharmacy_id = ?", [effQty3, item.id, pharmacy_id]);`
);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Patched server!');
console.log('Occurrences of item.qty remaining:', (code.match(/\[item\.qty, item\.id/g) || []).length);
