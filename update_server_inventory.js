const fs = require('fs');
let serverCode = fs.readFileSync('roshetta_server/server.js', 'utf8');

const postRegex = /const finalExpiry = expiry \|\| expiry_date \|\| "";\s*const itemId = require\("crypto"\)\.randomUUID\(\);\s*db\.run\([\s\S]*?res\.json\(\{ success: true, id: itemId \}\);\s*\},?\s*\);\s*\}\);/g;

serverCode = serverCode.replace(postRegex, (match) => {
  if (match.includes('UNIQUE NAME CHECK')) return match; // already applied
  return match.replace(
    'const itemId = require("crypto").randomUUID();\n  db.run(',
    `const itemId = require("crypto").randomUUID();
  
  // UNIQUE NAME CHECK
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

    db.run(`
  ).replace(
    'res.json({ success: true, id: itemId });\n      },\n    );\n  });',
    'res.json({ success: true, id: itemId });\n      },\n    );\n  });\n});'
  );
});

const putRegex = /const finalExpiry = expiry \|\| expiry_date \|\| "";\s*db\.run\(\s*"UPDATE inventory SET[\s\S]*?res\.json\(\{ success: true \}\);\s*\},?\s*\);\s*\}\);/g;

serverCode = serverCode.replace(putRegex, (match) => {
  if (match.includes('UNIQUE NAME CHECK')) return match; // already applied
  return match.replace(
    'const finalExpiry = expiry || expiry_date || "";\n  db.run(',
    `const finalExpiry = expiry || expiry_date || "";
  
  // UNIQUE NAME CHECK
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });
    }

    db.run(`
  ).replace(
    'res.json({ success: true });\n      },\n    );\n  });',
    'res.json({ success: true });\n      },\n    );\n  });\n});'
  );
});

fs.writeFileSync('roshetta_server/server.js', serverCode, 'utf8');
console.log("Updated roshetta_server/server.js");
