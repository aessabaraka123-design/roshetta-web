const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('roshetta.db');
db.all("PRAGMA table_info(sales)", [], (err, rows) => {
  console.log(rows);
});
