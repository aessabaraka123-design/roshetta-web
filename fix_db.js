const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace(/const dbGet = \(query, params = \[\]\) => new Promise\(async \(resolve, reject\) => \{[\s\S]*?\}\);/,
`const dbGet = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    err ? reject(err) : resolve(row);
  });
});`);

code = code.replace(/const dbAll = \(query, params = \[\]\) => new Promise\(async \(resolve, reject\) => \{[\s\S]*?\}\);/,
`const dbAll = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    err ? reject(err) : resolve(rows);
  });
});`);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
