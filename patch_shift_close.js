const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldShiftClose = `        db.all(
          "SELECT * FROM sales WHERE pharmacy_id = ? AND date >= ? AND date <= ?",
          [pharmacy_id, shift.open_time, close_time],
          (err2, sales) => {
            let cash_sales = 0,
              card_sales = 0;
            (sales || []).forEach((s) => {
              if (s.paymentMethod === "cash" || s.paymentMethod === "نقدي")
                cash_sales += s.total || 0;
              if (s.paymentMethod === "card" || s.paymentMethod === "بطاقة")
                card_sales += s.total || 0;
            });
            const expected_amount = parseFloat(shift.opening_amount) + cash_sales;
            db.run(
              \`UPDATE shifts SET closing_amount = ?, expected_amount = ?, cash_sales = ?, card_sales = ?, status = 'closed', close_time = ?, notes = ? WHERE id = ?\`,
              [
                closing_amount,
                expected_amount,
                cash_sales,
                card_sales,
                close_time,
                notes || "",
                shiftId,
              ],`;

const newShiftClose = `        db.all(
          "SELECT * FROM sales WHERE pharmacy_id = ? AND date >= ? AND date <= ?",
          [pharmacy_id, shift.open_time, close_time],
          (err2, sales) => {
            // Also fetch expenses for this shift
            db.all(
              "SELECT * FROM expenses WHERE pharmacy_id = ? AND date >= ? AND date <= ?",
              [pharmacy_id, shift.open_time, close_time],
              (errExp, expenses) => {
                let cash_sales = 0,
                  card_sales = 0,
                  jawwal_sales = 0,
                  palpay_sales = 0,
                  bank_sales = 0;
                  
                let cash_expenses = 0;
                (expenses || []).forEach((e) => {
                   cash_expenses += e.amount || 0;
                });

                (sales || []).forEach((s) => {
                  if (s.status === "refunded") {
                     // Note: the original sale amount is still in s.total. If it was refunded in THIS shift, it should NOT add to cash_sales!
                     // Actually, if it's refunded, we shouldn't count it as revenue.
                     // But wait, if they refunded a past sale, we need a negative proxy. We will skip 'refunded' here because it cancels out its own revenue if it was sold today.
                     return;
                  }
                  
                  // For refund proxies
                  const isRefundProxy = s.status === "refund_proxy";
                  const total = s.total || 0; // If refund proxy, total is negative.
                  
                  const pm = (s.paymentMethod || "").toLowerCase();
                  if (pm === "cash" || pm === "نقدي" || pm === "كاش")
                    cash_sales += total;
                  else if (pm === "card" || pm === "بطاقة")
                    card_sales += total;
                  else if (pm === "jawwal" || pm === "جوال باي" || pm === "جوال")
                    jawwal_sales += total;
                  else if (pm === "palpay" || pm === "بال باي")
                    palpay_sales += total;
                  else if (pm === "bank" || pm === "بنكي" || pm === "شيك")
                    bank_sales += total;
                });
                
                // Expected Cash = Opening + Cash In (Sales/Debt) - Cash Out (Expenses)
                // Note: Refunds handled via negative proxy rows will automatically reduce cash_sales.
                const expected_amount = parseFloat(shift.opening_amount) + cash_sales - cash_expenses;
                
                db.run(
                  \`UPDATE shifts SET closing_amount = ?, expected_amount = ?, cash_sales = ?, card_sales = ?, status = 'closed', close_time = ?, notes = ? WHERE id = ?\`,
                  [
                    closing_amount,
                    expected_amount,
                    cash_sales,
                    card_sales,
                    close_time,
                    notes || "",
                    shiftId,
                  ],`;

server = server.replace(oldShiftClose, newShiftClose);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched shift close logic!");
