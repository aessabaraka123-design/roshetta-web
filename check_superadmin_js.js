const fs = require('fs');
const html = fs.readFileSync('superadmin/index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((line, i) => {
  if (line.includes('invDetId') || line.includes('showInvoice') || line.includes('viewInvoice') || line.includes('invoiceModal')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
