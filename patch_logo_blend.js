const fs = require('fs');
let code = fs.readFileSync('web/src/components/icons.tsx', 'utf8');

const targetStr = `className={\`\${className} rounded-lg object-cover shadow-sm bg-white\`}`;
const newStr = `className={\`\${className} object-cover mix-blend-multiply\`}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('web/src/components/icons.tsx', code, 'utf8');
  console.log("Patched icons.tsx with mix-blend-multiply");
} else {
  console.log("Could not find target string");
}
