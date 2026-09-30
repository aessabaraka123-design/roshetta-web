const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('roshetta_server/roshetta.db');
db.all('SELECT * FROM notifications', (err, rows) => {
  console.log(rows);
});
