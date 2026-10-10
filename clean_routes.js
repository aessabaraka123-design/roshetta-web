const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const regex = /const genericParsedRoutes = \[([\s\S]*?)\];\s*genericParsedRoutes\.forEach\(\(route\) => \{([\s\S]*?)\}\);\s*\n/m;

if (regex.test(code)) {
    code = code.replace(regex, "");
    fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
    console.log("Removed genericParsedRoutes dead code");
} else {
    console.log("Could not find genericParsedRoutes block");
}
