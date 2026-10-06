const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('web/src');

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let original = c;

  // Fix all messed up ternaries
  c = c.replace(/\$\{language === 'en' \? 'text-end' : 'text-start'\}/g, 'text-start');
  c = c.replace(/\$\{language === "en" \? "text-end" : "text-start"\}/g, 'text-start');
  
  c = c.replace(/\$\{language === 'en' \? 'text-start' : 'text-end'\}/g, 'text-start');
  c = c.replace(/\$\{language === "en" \? "text-start" : "text-end"\}/g, 'text-start');

  // Replace any static text-end with text-start unless it's specifically meant to be on the opposite side.
  // Actually, replacing text-end with text-start everywhere is generally safer for LTR/RTL conversion of originally text-right forms!
  // Wait, if it was originally text-right, in RTL it was right (which is start). In LTR, text-right is right (which is end).
  // But forms and tables SHOULD be text-start universally.
  // Let's just fix the ternaries first, and also fix static text-end.
  c = c.replace(/ text-end /g, ' text-start ');
  c = c.replace(/"text-end"/g, '"text-start"');
  c = c.replace(/'text-end'/g, "'text-start'");
  c = c.replace(/text-end"/g, 'text-start"');

  if (c !== original) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('Fixed', f);
  }
});

console.log('Done');
