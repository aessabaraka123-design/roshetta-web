const fs = require('fs');
const path = require('path');
const screensDir = 'c:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/roshetta_app/src/screens';

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = getFiles(screensDir);
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let imports = content.match(/import\s+.*?\s+from\s+['\"].*?['\"]/g) || [];
  
  imports.forEach(imp => {
    let vars = imp.match(/import\s+(.*?)\s+from/);
    if (vars && vars[1]) {
      let varStr = vars[1].replace(/[{}]/g, '').split(',').map(v => v.trim());
      varStr.forEach(v => {
        // Strip alias e.g., "x as y"
        if(v.includes(' as ')) v = v.split(' as ')[1].trim();
        if (v && v !== 'React' && !v.includes('*')) {
          const escapedV = v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedV}\\b`, 'g');
          const matches = content.match(regex);
          if (matches && matches.length === 1) {
             console.log(file + ' unused import: ' + v);
          }
        }
      });
    }
  });
})
