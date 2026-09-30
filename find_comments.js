const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');
const lines = code.split('\n');

let inCommentBlock = false;
let blockLines = [];
let blocks = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('//')) {
    if (!inCommentBlock) {
      inCommentBlock = true;
      blockLines = [];
    }
    blockLines.push(i + 1 + ': ' + line);
  } else {
    if (inCommentBlock) {
      if (blockLines.length >= 3) {
        blocks.push(blockLines);
      }
      inCommentBlock = false;
    }
  }
}
if (inCommentBlock && blockLines.length >= 3) {
  blocks.push(blockLines);
}

console.log(`Found ${blocks.length} blocks of comments (>= 3 lines)`);
blocks.forEach((b, idx) => {
  console.log(`\nBlock ${idx + 1}:`);
  console.log(b.join('\n'));
});
