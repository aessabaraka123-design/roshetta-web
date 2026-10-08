const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('roshetta.db'); db.all('SELECT * FROM broadcasts;', (err, rows) => { console.log(rows); });
