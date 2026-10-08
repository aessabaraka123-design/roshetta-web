const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const brokenBlockStart = 'app.get("/api/admin/subscription-requests", (req, res) => {';
const brokenBlockEnd = 'app.post("/api/admin/subscription-requests/:id/approve", (req, res) => {';

const index1 = code.indexOf(brokenBlockStart);
const index2 = code.indexOf(brokenBlockEnd);

if (index1 !== -1 && index2 !== -1) {
  const replacement = `app.put("/api/pharmacies/:id/subscription-request", (req, res) => {
  const { pharmacy_id } = req.params;
  const { plan, receiptImage, paymentMethod, transferName, transferRef } = req.body;
  if (!plan) return res.status(400).json({ success: false, error: "Missing plan" });

  db.get(
    "SELECT * FROM subscription_requests WHERE pharmacy_id = ? AND status = 'pending'",
    [pharmacy_id],
    (err, existing) => {
      if (existing) {
        db.run(
          "UPDATE subscription_requests SET plan_type = ?, receipt_url = ?, payment_method = ?, transferName = ?, transferRef = ?, createdAt = ? WHERE id = ?",
          [
            plan,
            receiptImage || existing.receipt_url,
            paymentMethod || existing.payment_method,
            transferName || existing.transferName,
            transferRef || existing.transferRef,
            new Date().toISOString(),
            existing.id
          ],
          (err) => {
            if (err) return handleError(res, err);
            res.json({ success: true, message: "تم تحديث طلبك بنجاح" });
          }
        );
      } else {
        const reqId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        db.run(
          "INSERT INTO subscription_requests (id, pharmacy_id, plan_type, receipt_url, payment_method, status, createdAt, transferName, transferRef) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
          [
            reqId,
            pharmacy_id,
            plan,
            receiptImage || "",
            paymentMethod || "",
            new Date().toISOString(),
            transferName || "",
            transferRef || ""
          ],
          (err) => {
            if (err) return handleError(res, err);
            res.json({ success: true, message: "تم إرسال طلب الاشتراك بنجاح" });
          }
        );
      }
    }
  );
});

app.get("/api/admin/subscription-requests", (req, res) => {
  db.all(
    \`SELECT r.id, r.pharmacy_id, r.plan_type, r.status, r.createdAt, r.payment_method, r.transferName, r.transferRef,
            CASE 
              WHEN r.receipt_url LIKE 'data:%' THEN 'base64'
              ELSE r.receipt_url 
            END as receipt_url,
            p.name as pharmacy_name, p.phone as pharmacy_phone 
            FROM subscription_requests r 
            LEFT JOIN pharmacies p ON r.pharmacy_id = p.id 
            ORDER BY r.createdAt DESC\`,
    (err, rows) => {
      if (err) return handleError(res, err);
      res.json({ success: true, requests: rows || [] });
    }
  );
});

app.get("/api/admin/subscription-requests/:id/receipt", (req, res) => {
  db.get("SELECT receipt_url FROM subscription_requests WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({success: false});
    res.json({success: true, receipt: row ? row.receipt_url : null});
  });
});

`;
  
  code = code.substring(0, index1) + replacement + code.substring(index2);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log("Fixed the syntax error by restructuring the endpoints correctly.");
} else {
  console.log("Could not find the bounds.");
}
