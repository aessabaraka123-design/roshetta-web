const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('roshetta.db');

db.run(
  `INSERT OR IGNORE INTO subscription_plans (id, name, price, oldPrice, features, durationMonths, isActive)
   VALUES ('free', 'تجريبية مجانية', 0, NULL, '["وصول كامل لجميع الميزات","دعم فني أساسي","14 يوم مجانًا بدون بطاقة"]', 0, 1)`,
  (err) => {
    if (err) console.error(err);
    else console.log('Free plan added!');
    db.close();
  }
);
