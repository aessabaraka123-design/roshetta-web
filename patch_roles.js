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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('web/src/app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/role === "owner"/g, 'role === "owner" || user?.role === "manager"');
  newContent = newContent.replace(/role === 'owner'/g, "role === 'owner' || user?.role === 'manager'");
  
  // To avoid duplicate replacements if I run it twice:
  newContent = newContent.replace(/\|\| user\?\.role === "manager" \|\| user\?\.role === "manager"/g, '|| user?.role === "manager"');
  newContent = newContent.replace(/\|\| user\?\.role === 'manager' \|\| user\?\.role === 'manager'/g, "|| user?.role === 'manager'");

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
