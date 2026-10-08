const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('roshetta.db');
db.all("SELECT id, customer, items FROM sales LIMIT 5", [], (err, rows) => {
  console.log(JSON.stringify(rows, null, 2));
});
