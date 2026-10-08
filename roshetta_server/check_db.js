const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('roshetta.db');
db.all("SELECT * FROM branches WHERE pharmacy_id LIKE '%6f2b8e70%'", [], (err, rows) => {
  console.log('branches:', rows);
});
db.all("SELECT * FROM suppliers WHERE pharmacy_id LIKE '%6f2b8e70%'", [], (err, rows) => {
  console.log('suppliers:', rows);
});
db.all("SELECT * FROM purchase_invoices WHERE pharmacy_id LIKE '%6f2b8e70%'", [], (err, rows) => {
  console.log('purchases:', rows);
});
