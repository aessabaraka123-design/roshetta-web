const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  /if \(pm === "cash" \|\| pm === "نقدي" \|\| pm === "كاش" \|\| isDebtPayment\)/,
  'if (pm === "cash" || pm === "نقدي" || pm === "كاش")'
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Fixed reports to route debt payment to correct drawer");
