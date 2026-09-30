const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /user \? \`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:3001"\}\/api\/pharmacies\/\$\{user\.pharmacy_id\}\/branches\` : null/;

if(regex.test(code)) {
  code = code.replace(regex, 'user ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}/branches` : null');
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully patched branch API endpoint!');
} else {
  // If NEXT_PUBLIC_API_URL isn't used there:
  const regex2 = /user \? \`http:\/\/localhost:3001\/api\/pharmacies\/\$\{user\.pharmacy_id\}\/branches\` : null/;
  if(regex2.test(code)) {
    code = code.replace(regex2, 'user ? `http://localhost:3001/api/admin/pharmacies/${user.pharmacy_id}/branches` : null');
    fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
    console.log('Successfully patched branch API endpoint!');
  } else {
    console.log('Failed to match branch API endpoint regex!');
  }
}
