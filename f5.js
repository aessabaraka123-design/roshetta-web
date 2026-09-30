const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('roshetta_server/roshetta.db');
db.all(\SELECT b.id, i.name as drug_name, b.batch_number, b.expiry_date, b.qty 
FROM batches b 
JOIN inventory i ON b.drug_id = i.id 
WHERE b.expiry_date <= date('now', '+30 days')\, (err, rows) => {
  console.log(err, rows);
});
