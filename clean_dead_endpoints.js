const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const endpointsToRemove = [
  "app.put('/api/admin/pharmacies/:id/readonly'",
  "app.post('/api/admin/pharmacies/:id/renew'",
  "app.get('/api/broadcasts'",
  "app.post('/api/admin/broadcasts'",
  "app.post('/api/auth/register-admin'" // if exists
];

let removedCount = 0;

endpointsToRemove.forEach(ep => {
  const index = code.indexOf(ep);
  if (index !== -1) {
    let openBraces = 0;
    let endIndex = -1;
    for (let i = index; i < code.length; i++) {
      if (code[i] === '{') openBraces++;
      if (code[i] === '}') {
        openBraces--;
        if (openBraces === 0) {
          // Found the end of the block
          endIndex = i + 1; // include the brace
          // check if there's a semicolon or newline
          while (code[endIndex] === ';' || code[endIndex] === ')' || code[endIndex] === '\n' || code[endIndex] === '\r') {
             endIndex++;
          }
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      code = code.substring(0, index) + code.substring(endIndex);
      removedCount++;
      console.log('Removed:', ep);
    }
  }
});

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log(`Removed ${removedCount} dead endpoints.`);
