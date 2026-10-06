const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const allTsx = getFiles('web/src/app');
let allArabic = new Set();

for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  // Match Arabic words and phrases (including spaces and punctuation inside them)
  const matches = content.match(/[\u0600-\u06FF][\u0600-\u06FF\s،.؟_!-]*[\u0600-\u06FF]/g) || [];
  
  // Also match single Arabic words
  const singleWords = content.match(/[\u0600-\u06FF]+/g) || [];
  
  for (const m of [...matches, ...singleWords]) {
    const clean = m.trim();
    if (clean.length > 0) allArabic.add(clean);
  }
}

const uniqueStrings = [...allArabic].sort();
fs.writeFileSync('arabic_strings.json', JSON.stringify(uniqueStrings, null, 2));
console.log(`Found ${uniqueStrings.length} unique Arabic strings.`);
