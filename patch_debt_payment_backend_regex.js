const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

server = server.replace(
  /"تسديد دين",\s*custJSON,\s*date,\s*"غير محدد",\s*"الصيدلية الرئيسية",\s*"completed",/m,
  'req.body.paymentMethod || "cash",\n              custJSON,\n              date,\n              "غير محدد",\n              "الصيدلية الرئيسية",\n              "debt_payment",'
);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Updated PUT debt endpoint");
