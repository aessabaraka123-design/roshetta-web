const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const target1 = 'app.get("/api/admin/subscription-requests"';
const target2 = '});\n          },\n        );\n      } else {';
const index1 = code.indexOf(target1);
const index2 = code.indexOf('app.post("/api/admin/subscription-requests/:id/approve"');
console.log(code.substring(Math.max(0, index1 - 200), index2));
