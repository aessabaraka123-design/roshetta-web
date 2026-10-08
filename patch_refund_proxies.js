const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Inside full refund, before db.run("COMMIT"...)
const oldFullRefundCommit = `        if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {`;
const newFullRefundCommit = `        
        // Insert refund proxy for shift balancing
        db.run(
          "INSERT INTO sales (id, pharmacy_id, items, total, paymentMethod, customer, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          ["REF-" + Date.now(), pharmacy_id, "[]", -(row.total || 0), row.paymentMethod, row.customer, new Date().toISOString(), "refund_proxy"]
        );

        if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {`;

server = server.replace(oldFullRefundCommit, newFullRefundCommit);

// Inside partial refund, before db.run("COMMIT"...)
const oldPartialRefundCommit = `            if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {`;
const newPartialRefundCommit = `
            // Insert refund proxy for shift balancing
            db.run(
              "INSERT INTO sales (id, pharmacy_id, items, total, paymentMethod, customer, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              ["REF-PART-" + Date.now(), pharmacy_id, "[]", -totalRefundAmount, row.paymentMethod, row.customer, new Date().toISOString(), "refund_proxy"]
            );

            if ((pm === "credit" || pm === "آجل" || pm === "ذمم") && customerObj && customerObj.id) {`;

server = server.replace(oldPartialRefundCommit, newPartialRefundCommit);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched refunds to insert proxies for shifts");
