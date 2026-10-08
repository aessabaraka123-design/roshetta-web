const fs = require('fs');
let content = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

const regex = /data\.error\s*\|\|\s*language\s*===\s*"en"\s*\?\s*"Something went wrong"\s*:\s*"حدث خطأ ما"/g;
const replacement = 'data.error || (language === "en" ? "Something went wrong" : "حدث خطأ ما")';

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('web/src/app/register/page.tsx', content, 'utf8');
  console.log('Successfully fixed toast error precedence in register page.');
} else {
  console.log('Regex did not match in register page.');
}
