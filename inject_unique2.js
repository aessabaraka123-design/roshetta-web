const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');
code = code.replace(/\r\n/g, '\n');

// 1. Fix POST
const postStart = 'app.post("/api/pharmacies/:id/inventory", (req, res) => {';
const postIdx = code.indexOf(postStart);

const insertPostStart = '  const finalExpiry = expiry || expiry_date || "";\n  const itemId = require("crypto").randomUUID();\n  db.run(';
const insertPostStartIdx = code.indexOf(insertPostStart, postIdx);

const insertPostEnd = '        success: true,\n        itemId,\n      });\n    },\n  );\n});';
const insertPostEndIdx = code.indexOf(insertPostEnd, insertPostStartIdx);

if (postIdx > -1 && insertPostStartIdx > -1 && insertPostEndIdx > -1) {
  let before = code.slice(0, insertPostStartIdx);
  let middle = code.slice(insertPostStartIdx + insertPostStart.length, insertPostEndIdx);
  let after = code.slice(insertPostEndIdx + insertPostEnd.length);

  const newCode = before + '  const finalExpiry = expiry || expiry_date || "";\n  const itemId = require("crypto").randomUUID();\n\n  // UNIQUE NAME CHECK POST\n  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {\n    if (err) return handleError(res, err);\n    if (row) {\n      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });\n    }\n\n  db.run(' + middle + '        success: true,\n        itemId,\n      });\n    },\n  );\n  });\n});';

  code = newCode;
  console.log("POST fixed");
}

// 2. Fix PUT
const putStart = 'app.put("/api/pharmacies/:id/inventory/:itemId", (req, res) => {';
const putIdx = code.indexOf(putStart);

const insertPutStart = '  const finalExpiry = expiry || expiry_date || "";\n  db.run(';
const insertPutStartIdx = code.indexOf(insertPutStart, putIdx);

const insertPutEnd = '        success: true,\n      });\n    },\n  );\n});';
const insertPutEndIdx = code.indexOf(insertPutEnd, insertPutStartIdx);

if (putIdx > -1 && insertPutStartIdx > -1 && insertPutEndIdx > -1) {
  let before = code.slice(0, insertPutStartIdx);
  let middle = code.slice(insertPutStartIdx + insertPutStart.length, insertPutEndIdx);
  let after = code.slice(insertPutEndIdx + insertPutEnd.length);

  const newCode = before + '  const finalExpiry = expiry || expiry_date || "";\n\n  // UNIQUE NAME CHECK PUT\n  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {\n    if (err) return handleError(res, err);\n    if (row) {\n      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });\n    }\n\n  db.run(' + middle + '        success: true,\n      });\n    },\n  );\n  });\n});';

  code = newCode;
  console.log("PUT fixed");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Done");
