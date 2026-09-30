const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('web/src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
let changedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const original = content;

  content = content.replace(/\`\`\"\}\/api\//g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/');
  content = content.replace(/\"\`\"\}\/api\//g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/');
  content = content.replace(/\'\`\"\}\/api\//g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/');

  if (content !== original) {
    fs.writeFileSync(f, content);
    changedFiles++;
  }
});

console.log('Fixed broken URLs in', changedFiles, 'files.');
