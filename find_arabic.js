const fs = require('fs');
const path = require('path');
function walk(d) {
  let files = [];
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) files.push(...walk(p));
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) files.push(p);
  });
  return files;
}

let found = [];
const arabicRegex = /[\u0600-\u06FF]+/g;

walk('web/src').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let matches = c.match(arabicRegex);
  if (matches && matches.length > 0) {
    let unique = [...new Set(matches)];
    found.push({ file: f, matches: unique });
  }
});

console.log(JSON.stringify(found, null, 2));
