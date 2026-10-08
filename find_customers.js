const fs = require('fs');
const lines = fs.readFileSync('roshetta_server/server.js', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('app.post("/api/pharmacies/:id/customers"')) {
    console.log(`Found at line ${i+1}`);
    for(let j=i; j<i+30; j++) {
      console.log(j+1, lines[j]);
    }
  }
});
