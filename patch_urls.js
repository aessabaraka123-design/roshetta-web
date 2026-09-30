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

  // Replace $ENV_API_URL inside backticks: fetch(`$ENV_API_URL/api/...`)
  // Becomes: fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/...`)
  content = content.replace(/\`\$ENV_API_URL/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}');

  // Replace $ENV_API_URL inside double quotes: fetch("$ENV_API_URL/api/...")
  // Becomes: fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "/api/...")
  content = content.replace(/\"\$ENV_API_URL/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "');

  // Replace $ENV_API_URL inside single quotes: fetch('$ENV_API_URL/api/...')
  // Becomes: fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + '/api/...')
  content = content.replace(/\'\$ENV_API_URL/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + \'');
  
  // Also, just in case any literal http://localhost:3001 are still there:
  content = content.replace(/\`http:\/\/localhost:3001/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}');
  content = content.replace(/\"http:\/\/localhost:3001/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + "');
  content = content.replace(/\'http:\/\/localhost:3001/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") + \'');

  if (content !== original) {
    fs.writeFileSync(f, content);
    changedFiles++;
  }
});

console.log('Fixed URLs in', changedFiles, 'files.');
