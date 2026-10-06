const fs = require('fs');
const path = require('path');
function walk(d) {
  let files = [];
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) files.push(...walk(p));
    else if (p.endsWith('.tsx')) files.push(p);
  });
  return files;
}

let modified = 0;
walk('web/src/app').forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;
  c = c.replace(/([a-zA-Z]+)=language === "en" \? "([^"]+)" : "([^"]+)"/g, '$1={language === "en" ? "$2" : "$3"}');
  c = c.replace(/([a-zA-Z]+)=language === 'en' \? '([^']+)' : '([^']+)'/g, '$1={language === \'en\' ? \'$2\' : \'$3\'}');
  
  if (original !== c) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed', f);
    modified++;
  }
});
console.log('Modified files:', modified);
