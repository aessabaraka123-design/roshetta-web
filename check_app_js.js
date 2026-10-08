const fs = require('fs');
const js = fs.readFileSync('superadmin/assets/app.js', 'utf8');
const lines = js.split('\n');
lines.forEach((line, i) => {
  if (line.includes('invDetId') || line.includes('invoiceModal')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
