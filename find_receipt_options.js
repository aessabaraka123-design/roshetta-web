const fs = require('fs');
const lines = fs.readFileSync('web/src/app/receipt-upload/page.tsx', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('value="') || lines[i].includes('setPayMethod')) {
    console.log(i + 1, lines[i]);
  }
}
