const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const portDeclaration = `
const PORT = process.env.PORT || 3001;
const IP = process.env.IP || '0.0.0.0';
`;

code = code.replace('const app = express();', portDeclaration + 'const app = express();');

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Fixed PORT and IP missing declarations.');
