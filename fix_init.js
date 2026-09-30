const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const regex = /db\.serialize\(async \(\) => \{([\s\S]*?)\/\/ Users Table/g;

code = code.replace(regex, (match, p1) => {
  let fixed = match.replace(/try\s*\{\s*await dbRun\((.*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');
  return fixed;
});

// also fix for other tables in init block
const regex2 = /\/\/ Inventory Table([\s\S]*?)\/\/ Admin Settings Table/g;
code = code.replace(regex2, (match) => {
    return match.replace(/try\s*\{\s*await dbRun\((.*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');
});

const regex3 = /\/\/ Admin Settings Table([\s\S]*?)\}\);\r?\n\r?\n\/\/ ==========================================/g;
code = code.replace(regex3, (match) => {
    return match.replace(/try\s*\{\s*await dbRun\((.*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');
});

// One global catch-all just in case any errant handleError(res, err) is outside app.use or app.*
// Actually, it's safer to just replace all eturn handleError(res, err) outside of routes... but regex is hard.

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
