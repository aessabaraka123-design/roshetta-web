const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Fix POST
const postStartStr = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();`;
const postInsertPos = code.indexOf(postStartStr) + postStartStr.length;

const postQueryStr = `  db.run(
    "INSERT INTO inventory`;
const postQueryPos = code.indexOf(postQueryStr, postInsertPos);

// We find where the db.run callback ends
const postCallbackEndStr = `        itemId,
      });
    },
  );`;
const postEndPos = code.indexOf(postCallbackEndStr, postQueryPos) + postCallbackEndStr.length;

if (postInsertPos > -1 && postQueryPos > -1 && postEndPos > -1) {
  let before = code.slice(0, postInsertPos);
  let middle = code.slice(postInsertPos, postEndPos);
  let after = code.slice(postEndPos);

  const newCode = before + `
  
  // UNIQUE NAME CHECK POST
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }` + middle + `
  });`;
  
  code = newCode + after;
} else {
  console.log("Failed to find POST positions");
}

// Fix PUT
const putStartStr = `app.put("/api/pharmacies/:id/inventory/:itemId"`;
const putIdx = code.indexOf(putStartStr);

if (putIdx > -1) {
  const finalExpiryPut = `  const finalExpiry = expiry || expiry_date || "";`;
  const finalExpiryPutIdx = code.indexOf(finalExpiryPut, putIdx) + finalExpiryPut.length;
  
  const putCallbackEndStr = `        success: true,
      });
    },
  );`;
  const putEndPos = code.indexOf(putCallbackEndStr, finalExpiryPutIdx) + putCallbackEndStr.length;
  
  if (finalExpiryPutIdx > -1 && putEndPos > -1) {
    let before = code.slice(0, finalExpiryPutIdx);
    let middle = code.slice(finalExpiryPutIdx, putEndPos);
    let after = code.slice(putEndPos);
    
    const newCode = before + `
  
  // UNIQUE NAME CHECK PUT
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ? AND id != ?", [pharmacy_id, name, itemId], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج آخر بنفس هذا الاسم" });
    }` + middle + `
  });`;
    
    code = newCode + after;
  } else {
    console.log("Failed to find PUT internal positions");
  }
} else {
  console.log("Failed to find PUT endpoint");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Successfully injected unique name checks.");
