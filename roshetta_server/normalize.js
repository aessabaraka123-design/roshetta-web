const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./roshetta.db');

db.serialize(() => {
    // Normalize cash
    db.run("UPDATE sales SET paymentMethod = 'cash' WHERE paymentMethod IN ('نقداً', 'نقدي', 'كاش', 'cash')");
    // Normalize jawwal
    db.run("UPDATE sales SET paymentMethod = 'jawwal' WHERE paymentMethod IN ('jawwalpay', 'جوال باي', 'jawwal')");
    // Normalize bank
    db.run("UPDATE sales SET paymentMethod = 'bank' WHERE paymentMethod IN ('بنكي', 'bank')");
    // Normalize palpay
    db.run("UPDATE sales SET paymentMethod = 'palpay' WHERE paymentMethod IN ('بال باي', 'palpay')");
    // Normalize maalchat
    db.run("UPDATE sales SET paymentMethod = 'maalchat' WHERE paymentMethod IN ('مالتشات', 'maalchat')");
    // Normalize credit
    db.run("UPDATE sales SET paymentMethod = 'credit' WHERE paymentMethod IN ('ذمم', 'دين', 'آجل', 'credit')");
});

db.close(() => {
    console.log("Database payment methods normalized!");
});
