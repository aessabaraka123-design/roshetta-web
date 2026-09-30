const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const badCode = `
    // ==========================================
    // DATABASE PERFORMANCE UPGRADES (INDEXES)
    // ==========================================
    db.run("CREATE INDEX IF NOT EXISTS idx_inventory_pharmacy ON inventory(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, created_at)");
    db.run("CREATE INDEX IF NOT EXISTS idx_users_pharmacy ON users(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_patients_pharmacy ON patients(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_tickets_pharmacy ON tickets(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_expenses_pharmacy ON expenses(pharmacy_id, date)");
    db.run("CREATE INDEX IF NOT EXISTS idx_subscription_requests_pharmacy ON subscription_requests(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_branches_pharmacy ON branches(pharmacy_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_staff_pharmacy ON staff(pharmacy_id)");

    db.run(\``;

code = code.replace(badCode, "db.run(`");

const goodInjection = `
  // ==========================================
  // DATABASE PERFORMANCE UPGRADES (INDEXES)
  // ==========================================
  db.run("CREATE INDEX IF NOT EXISTS idx_inventory_pharmacy ON inventory(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON sales(pharmacy_id, created_at)");
  db.run("CREATE INDEX IF NOT EXISTS idx_users_pharmacy ON users(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_patients_pharmacy ON patients(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_tickets_pharmacy ON tickets(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_expenses_pharmacy ON expenses(pharmacy_id, date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_subscription_requests_pharmacy ON subscription_requests(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_branches_pharmacy ON branches(pharmacy_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_staff_pharmacy ON staff(pharmacy_id)");
`;

code = code.replace("db.serialize(() => {", "db.serialize(() => {\n" + goodInjection);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Fixed DB indexes injection.');
