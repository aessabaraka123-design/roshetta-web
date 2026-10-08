const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('roshetta.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subscription_plans (id TEXT PRIMARY KEY, name TEXT, price REAL, oldPrice REAL, features TEXT, durationMonths INTEGER, isActive INTEGER DEFAULT 1)`);
  db.run(`INSERT OR IGNORE INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive) VALUES ('monthly', 'اشتراك شهري', 49, 60, '["إدارة المبيعات والمشتريات","دعم فني على مدار الساعة","تحديثات مجانية"]', 1, 1)`);
  db.run(`INSERT OR IGNORE INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive) VALUES ('annual', 'اشتراك سنوي', 499, 600, '["كل مميزات الشهري","خصم 20%","نطاق مخصص"]', 12, 1)`);
  db.run(`INSERT OR IGNORE INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive) VALUES ('lifetime', 'مدى الحياة', 1499, 2000, '["كل مميزات السنوي","دفع لمرة واحدة","دعم VIP"]', 1200, 1)`);
});
db.close();
console.log('seeded');
