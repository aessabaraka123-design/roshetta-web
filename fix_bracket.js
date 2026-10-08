const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const target = `              if (!res.headersSent)
                res.json({
                  success: true,
                  saleId,
                });
            });`;

const replacement = `              if (!res.headersSent)
                res.json({
                  success: true,
                  saleId,
                });
            });
            });`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log("Fixed missing closing bracket for Promise.all!");
} else {
  console.log("Target string not found!");
}
