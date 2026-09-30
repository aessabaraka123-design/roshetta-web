const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('roshetta.db');
db.all('SELECT * FROM notifications', (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
});
