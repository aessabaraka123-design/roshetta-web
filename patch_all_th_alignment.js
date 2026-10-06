const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('web/src/app');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace `<th ... className="... "` adding `text-start` if not present
  content = content.replace(/<th\b([^>]*?)className=(["'])([^"']*?)\2/g, (match, beforeClass, quote, classNames) => {
    if (classNames.includes('text-start') || classNames.includes('text-left') || classNames.includes('text-right') || classNames.includes('text-center')) {
      return match;
    }
    return `<th${beforeClass}className=${quote}${classNames} text-start${quote}`;
  });
  
  // Handle <th without className, wait, do any of them not have className?
  // Let's just catch the ones with className for now since that was our issue.

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
  }
});

console.log(`Modified ${modifiedCount} files to add text-start to <th> tags`);
