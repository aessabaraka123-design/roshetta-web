const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('roshetta_server/roshetta.db');
db.all(\SELECT * FROM batches WHERE drug_name LIKE '%عيسى%'\, (err, rows) => {
  console.log('Batches with Issa:', rows);
});
db.all(\SELECT * FROM inventory WHERE name LIKE '%عيسى%'\, (err, rows) => {
  console.log('Inventory with Issa:', rows);
});
