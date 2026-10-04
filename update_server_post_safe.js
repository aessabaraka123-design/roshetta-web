const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const postStartStr = `app.post("/api/pharmacies/:id/inventory", (req, res) => {`;
const postIdx = code.indexOf(postStartStr);

if (postIdx > -1) {
  const finalExpiryPost = `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();`;
  const finalExpiryPostIdx = code.indexOf(finalExpiryPost, postIdx) + finalExpiryPost.length;
  
  const postCallbackEndStr = `        success: true,
        itemId,
      });
    },
  );`;
  const postEndPos = code.indexOf(postCallbackEndStr, finalExpiryPostIdx) + postCallbackEndStr.length;
  
  if (finalExpiryPostIdx > -1 && postEndPos > -1) {
    let before = code.slice(0, finalExpiryPostIdx);
    let middle = code.slice(finalExpiryPostIdx, postEndPos);
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
    console.log("Failed to find POST internal positions");
  }
} else {
  console.log("Failed to find POST endpoint");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Successfully injected unique name checks for POST.");
