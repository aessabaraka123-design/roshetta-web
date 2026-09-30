const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Replace all remaining [item.qty, item.id, pharmacy_id] in inventory update context
let count = 0;
code = code.replace(
  /db\.run\("UPDATE inventory SET qty = qty \+ \? WHERE id = \? AND pharmacy_id = \?", \[item\.qty, item\.id, pharmacy_id\]\);/g,
  (match) => {
    count++;
    return `const _effQty${count} = Math.round((item.qty || 0) * (item.unit_size || 1));\n            db.run("UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?", [_effQty${count}, item.id, pharmacy_id]);`;
  }
);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log(`Replaced ${count} occurrences`);
