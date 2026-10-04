const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// Patch POST staff
code = code.replace(
  'INSERT INTO staff (id, pharmacy_id, name, email, password, role, branch, phone, salary, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO staff (id, pharmacy_id, name, email, password, role, branch, phone, salary, active, controlledMedsAccess) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

code = code.replace(
  '      parseFloat(salary) || 0,\n      1,\n    ],',
  '      parseFloat(salary) || 0,\n      1,\n      controlledMedsAccess ? 1 : 0,\n    ],'
);

// Patch PUT staff
code = code.replace(
  'UPDATE staff SET name=?, email=?, password=?, role=?, branch=?, phone=?, salary=? WHERE id=? AND pharmacy_id=?',
  'UPDATE staff SET name=?, email=?, password=?, role=?, branch=?, phone=?, salary=?, controlledMedsAccess=? WHERE id=? AND pharmacy_id=?'
);

code = code.replace(
  '      parseFloat(salary) || 0,\n      staffId,',
  '      parseFloat(salary) || 0,\n      controlledMedsAccess ? 1 : 0,\n      staffId,'
);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Patched server.js for staff controlledMedsAccess");
