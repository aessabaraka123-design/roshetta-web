const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

code = code.replace("db.run(\"CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, created_at)\");", "db.run(\"CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, date)\");");

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
