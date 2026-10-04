const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const postIdx = code.indexOf('app.post("/api/pharmacies/:id/inventory"');
console.log('POST:\n' + code.slice(postIdx, postIdx + 1200));

const putIdx = code.indexOf('app.put("/api/pharmacies/:id/inventory/:itemId"');
console.log('PUT:\n' + code.slice(putIdx, putIdx + 1000));
