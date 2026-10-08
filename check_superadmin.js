const fs = require('fs');
const html = fs.readFileSync('superadmin/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((line, i) => {
  if (line.includes('customer') || line.includes('invoice') || line.includes('فاتورة')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
