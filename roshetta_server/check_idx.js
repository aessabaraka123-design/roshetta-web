const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('roshetta.db');

db.all("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%'", [], (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Current Indexes:', rows.map(r => r.name).join(', '));
  }
});
