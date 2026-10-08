const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldStockTake = `app.post("/api/pharmacies/:id/stock-take", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { items } = req.body; // array of { id, actual }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      error: "Invalid items array",
    });
  }
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    items.forEach((item) => {
      db.run(\`UPDATE inventory SET qty = ? WHERE id = ? AND pharmacy_id = ?\`, [
        item.actual,
        item.id,
        pharmacy_id,
      ]);
    });
    db.run("COMMIT", (err) => {
      if (err) return handleError(res, err);
      res.json({
        success: true,
      });
    });
  });
});`;

const newStockTake = `app.post("/api/pharmacies/:id/stock-take", (req, res) => {
  const { id: pharmacy_id } = req.params;
  const { items } = req.body; // array of { id, actual, expected, name, cost, branch_id }

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "Invalid items array" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const promises = items.map((item) => {
      return new Promise((resolve, reject) => {
        db.get("SELECT batches, cost FROM inventory WHERE id = ? AND pharmacy_id = ?", [item.id, pharmacy_id], (err, invRow) => {
          if (err) return reject(err);
          let batches = [];
          try {
            batches = JSON.parse((invRow && invRow.batches) || "[]");
          } catch(e) {}
          
          const expected = item.expected || 0;
          const actual = item.actual || 0;
          const diff = expected - actual; // Positive means shortage/damage/expiry (Loss)
          
          if (diff > 0) {
            let toDeduct = diff;
            let lossValue = 0;
            
            // 1. Deduct from batches queue (FIFO)
            if (batches.length > 0) {
              for (let i = 0; i < batches.length && toDeduct > 0; i++) {
                const batchHas = batches[i].remaining || batches[i].qty || 0;
                if (batchHas <= 0) continue;
                const taken = Math.min(toDeduct, batchHas);
                batches[i].remaining = batchHas - taken;
                toDeduct -= taken;
                // Calculate loss value based on the exact batch cost!
                lossValue += taken * (batches[i].cost || invRow.cost || item.cost || 0);
              }
              // Keep empty batches for history? Usually better to filter them if remaining <= 0, or just leave them. We'll filter.
              batches = batches.filter(b => (b.remaining || 0) > 0);
            } else {
               lossValue = diff * (invRow.cost || item.cost || 0);
            }
            
            // 2. Update inventory qty and batches
            db.run(\`UPDATE inventory SET qty = ?, batches = ? WHERE id = ? AND pharmacy_id = ?\`, 
              [actual, JSON.stringify(batches), item.id, pharmacy_id], 
              (uErr) => {
                if (uErr) return reject(uErr);
                
                // 3. Record Financial Loss in Expenses (Operating Expense)
                const expId = "LOSS-" + Date.now() + Math.floor(Math.random()*1000);
                const desc = \`عجز جرد / توالف (Damage/Shortage) - \${item.name || item.id}\`;
                db.run(
                  \`INSERT INTO expenses (id, pharmacy_id, description, amount, date, created_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)\`,
                  [expId, pharmacy_id, desc, lossValue, new Date().toISOString(), "System/Stock-Take", item.branch_id || "all"],
                  (eErr) => {
                    if (eErr) return reject(eErr);
                    resolve();
                  }
                );
            });
          } else if (diff < 0) {
            // Surplus -> Add to newest/oldest batch
            const surplus = Math.abs(diff);
            if (batches.length > 0) {
               batches[batches.length - 1].qty = (batches[batches.length - 1].qty || 0) + surplus;
               batches[batches.length - 1].remaining = (batches[batches.length - 1].remaining || 0) + surplus;
            }
            db.run(\`UPDATE inventory SET qty = ?, batches = ? WHERE id = ? AND pharmacy_id = ?\`, 
              [actual, JSON.stringify(batches), item.id, pharmacy_id], 
              (uErr) => {
                if (uErr) return reject(uErr);
                resolve();
              }
            );
          } else {
            resolve();
          }
        });
      });
    });

    Promise.all(promises)
      .then(() => {
        db.run("COMMIT", (err) => {
          if (err) return handleError(res, err);
          res.json({ success: true });
        });
      })
      .catch((err) => {
        db.run("ROLLBACK");
        return res.status(500).json({ success: false, error: err.message || "Failed to process stock take" });
      });
  });
});`;

server = server.replace(oldStockTake, newStockTake);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched stock-take for expired/damaged goods logic!");
