const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const regex = /setEditingItem\(\{\n\s*\.\.\.med,\n\s*has_parts: hp,/;
const replacement = `setEditingItem({
                      ...med,
                      expiry_date: med.expiry_date || med.expiry || '',
                      batch_number: med.batch_number || '',
                      has_parts: hp,`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
    console.log("Updated setEditingItem");
} else {
    console.log("Could not find setEditingItem");
}
