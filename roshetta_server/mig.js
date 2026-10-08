const sqlite3 = require('sqlite3').verbose(); 
const db = new sqlite3.Database('roshetta.db'); 
db.get("SELECT * FROM purchase_orders WHERE id = 'PO62OI-000001'", (err, row) => { 
  if (row) { 
    db.run("INSERT OR IGNORE INTO purchase_invoices (id, pharmacy_id, supplier_id, supplier_name, items, total_cost, paid_amount, remaining, invoice_number, date, notes, branch_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
    [row.id, row.pharmacy_id, row.supplier_id || '', row.supplier_name || '', row.items || '[]', row.total || 0, row.status === 'received' ? row.total : 0, row.status === 'received' ? 0 : row.total, row.supplier_invoice_number || '', row.date, '', row.branch || 'Main', row.status === 'received' ? 'completed' : 'draft'], 
    (e) => {
      if (e) console.log(e); else console.log('Migrated lost invoice!');
    }); 
  } 
});
