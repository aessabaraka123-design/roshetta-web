const fs = require('fs');
const code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const webEndpoints = (code.match(/\/api\/web\//g) || []).length;
const mobileEndpoints = (code.match(/\/api\/mobile\//g) || []).length;
const genericEndpoints = (code.match(/\/api\/pharmacies\//g) || []).length;
const adminEndpoints = (code.match(/\/api\/admin\//g) || []).length;

console.log(`Web specific endpoints: ${webEndpoints}`);
console.log(`Mobile specific endpoints: ${mobileEndpoints}`);
console.log(`Generic Pharmacy endpoints: ${genericEndpoints}`);
console.log(`Admin endpoints: ${adminEndpoints}`);
