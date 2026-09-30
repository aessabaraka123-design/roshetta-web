const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');
const lines = code.split('\n');
let commentedLines = 0;
let emptyLines = 0;
let codeLines = 0;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) emptyLines++;
  else if (trimmed.startsWith('//')) commentedLines++;
  else codeLines++;
}

console.log('Total Lines:', lines.length);
console.log('Code Lines:', codeLines);
console.log('Comment Lines:', commentedLines);
console.log('Empty Lines:', emptyLines);

// Find potential duplicate endpoints
const endpoints = [];
const regex = /app\.(get|post|put|delete)\(['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(code)) !== null) {
  endpoints.push({ method: match[1].toUpperCase(), path: match[2] });
}

const duplicates = endpoints.filter((e, index, self) =>
  index !== self.findIndex((t) => (
    t.method === e.method && t.path === e.path
  ))
);

console.log('\nTotal Endpoints:', endpoints.length);
console.log('Duplicate Endpoints:', duplicates);
