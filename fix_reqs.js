const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const reqInjection = `
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
`;
code = code.replace('const express = require("express");', 'const express = require("express");' + reqInjection);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log('Injected requires.');
