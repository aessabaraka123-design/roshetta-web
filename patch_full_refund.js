const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Update SELECT in Full Refund
server = server.replace(
  '"SELECT items, status FROM sales WHERE id = ? AND pharmacy_id = ?",',
  '"SELECT items, status, total, paymentMethod, customer FROM sales WHERE id = ? AND pharmacy_id = ?",'
);

// 2. Add Debt Reversal in Full Refund
const oldFullRefundCommit = `        db.run("COMMIT", (err) => {
          if (err) return handleError(res, err);
          res.json({
            success: true,
          });
        });`;

const newFullRefundCommit = `        
        // Reverse debt if it was a credit sale
        let customerObj = null;
        try {
          customerObj = row.customer ? JSON.parse(row.customer) : null;
        } catch(e) {}
        
        const pm = (row.paymentMethod || "").toLowerCase();
        if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {
          db.run(
            "UPDATE customers SET debt = COALESCE(debt, 0) - ? WHERE id = ? AND pharmacy_id = ?",
            [row.total || 0, customerObj.id, pharmacy_id],
            (err) => {
               db.run("COMMIT", (err2) => {
                  if (err2) return handleError(res, err2);
                  res.json({ success: true });
               });
            }
          );
        } else {
          db.run("COMMIT", (err) => {
            if (err) return handleError(res, err);
            res.json({
              success: true,
            });
          });
        }`;

server = server.replace(oldFullRefundCommit, newFullRefundCommit);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched Full Refund");
