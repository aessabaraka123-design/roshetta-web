const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  "AND paymentMethod != 'debt_payment' AND paymentMethod != '???? ???'",
  "AND paymentMethod != 'debt_payment' AND paymentMethod != 'تسديد دين'"
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Fixed dashboard encoding issue for debt payments!");
