const fs = require('fs');
let serverCode = fs.readFileSync('roshetta_server/server.js', 'utf8');

serverCode = serverCode.replace(
  `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  db.run(
    "INSERT INTO inventory`,
  `  const finalExpiry = expiry || expiry_date || "";
  const itemId = require("crypto").randomUUID();
  
  // UNIQUE NAME CHECK POST
  db.get("SELECT id FROM inventory WHERE pharmacy_id = ? AND name = ?", [pharmacy_id, name], (err, row) => {
    if (err) return handleError(res, err);
    if (row) {
      return res.status(400).json({ success: false, error: "عذراً، يوجد منتج بنفس هذا الاسم بالفعل" });
    }

    db.run(
      "INSERT INTO inventory`
);

serverCode = serverCode.replace(
  `        itemId,
      });
    },
  );
});`,
  `        itemId,
      });
    },
  );
  });
});`
);

fs.writeFileSync('roshetta_server/server.js', serverCode, 'utf8');
console.log("Updated POST properly");
