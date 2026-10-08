const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Replace all instances of 	ry { await dbRun(...) } catch { return handleError(res, err); }
// using regex with newline matching
code = code.replace(/try\s*\{\s*await dbRun\(([\s\S]*?)\);\s*\}\s*catch\s*\(err\)\s*\{\s*return handleError\(res, err\);\s*\}/g, 'db.run(, () => {});');

// Also, the first block was:
// await dbRun(CREATE TABLE..., [])
// we need to make sure that is safely replaced.

fs.writeFileSync('server.js', code, 'utf8');
console.log('Fixed multiline');
