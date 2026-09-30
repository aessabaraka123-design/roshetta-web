const fs = require('fs');
let file = fs.readFileSync('server.js', 'utf8');

// Fix the db.run issue by splitting them into two db.run calls
file = file.replace(
  /CREATE TABLE IF NOT EXISTS broadcasts \([\s\S]*?\);\s*CREATE TABLE IF NOT EXISTS admin_settings \(/,
  `CREATE TABLE IF NOT EXISTS broadcasts (
      id TEXT PRIMARY KEY,
      title TEXT,
      message TEXT,
      date TEXT,
      type TEXT DEFAULT 'info'
    )
  \`);
  
  db.run(\`
    CREATE TABLE IF NOT EXISTS admin_settings (`
);

fs.writeFileSync('server.js', file);
console.log("Fixed server.js table creation!");
