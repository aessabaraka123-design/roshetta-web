const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Update SELECT in Partial Refund
server = server.replace(
  '"SELECT items, total, status FROM sales WHERE id = ? AND pharmacy_id = ?",',
  '"SELECT items, total, status, paymentMethod, customer FROM sales WHERE id = ? AND pharmacy_id = ?",'
);

// 2. Fix the loop in Partial Refund
const oldLoop = `          // Calculate refund amount
          const itemPrice = item.price || 0;
          totalRefundAmount += qtyToReturn * itemPrice;

          // Update inventory for this item
          db.run(
            \`UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?\`,
            [qtyToReturn, item.id, pharmacy_id],
            (err) => {`;

const newLoop = `          // Calculate refund amount using unitPrice if available (to handle fractional sales correctly)
          const itemPrice = item.unitPrice || item.price || 0;
          totalRefundAmount += qtyToReturn * itemPrice;

          // Update inventory taking into account fractional unitCount
          const baseUnitsToReturn = qtyToReturn * (item.unitCount || 1);
          db.run(
            \`UPDATE inventory SET qty = qty + ? WHERE id = ? AND pharmacy_id = ?\`,
            [baseUnitsToReturn, item.id, pharmacy_id],
            (err) => {`;

server = server.replace(oldLoop, newLoop);

// 3. Add Debt Reversal in Partial Refund
const oldPartialCommit = `            db.run("COMMIT", (err) => {
              if (err) return handleError(res, err);
              res.json({
                success: true,
              });
            });`;

const newPartialCommit = `            
            let customerObj = null;
            try {
              customerObj = row.customer ? JSON.parse(row.customer) : null;
            } catch(e) {}
            const pm = (row.paymentMethod || "").toLowerCase();
            
            if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {
              db.run(
                "UPDATE customers SET debt = COALESCE(debt, 0) - ? WHERE id = ? AND pharmacy_id = ?",
                [totalRefundAmount, customerObj.id, pharmacy_id],
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

server = server.replace(oldPartialCommit, newPartialCommit);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched Partial Refund");
