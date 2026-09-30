const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

if (!code.includes("require('helmet')")) {
  const reqInjection = `
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
`;
  code = code.replace("const express = require('express');", "const express = require('express');" + reqInjection);
}

if (!code.includes("app.use(helmet())")) {
  const useInjection = `
// ==========================================
// SECURITY & PERFORMANCE UPGRADES
// ==========================================
app.use(helmet());
app.use(compression()); // Gzip all responses

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);
`;
  code = code.replace("app.use(cors());", "app.use(cors());\n" + useInjection);
}

if (!code.includes("idx_inventory_pharmacy")) {
  const indexesInjection = `
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
  code = code.replace("db.run(`", indexesInjection + "\n    db.run(`");
}

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Injected security, performance, and db indexes.');
