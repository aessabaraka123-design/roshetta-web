const fs = require('fs');
let code = fs.readFileSync('web/src/components/icons.tsx', 'utf8');

// Replace jpg with png, remove blend mode
const targetStr = `    src="/logo.jpg" 
    alt="Roshetta Logo" 
    className={\`\${className} object-cover mix-blend-multiply\`}`;

const newStr = `    src="/logo.png" 
    alt="Roshetta Logo" 
    className={\`\${className} object-cover\`}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('web/src/components/icons.tsx', code, 'utf8');
  console.log("Patched icons.tsx to use PNG transparent logo");
} else {
  console.log("Could not find target string");
}
