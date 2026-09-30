const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/components/GlobalToast.js', 'utf8');
code = code.replace(/toast\.message \|\| \\}/g, "toast.message || ''}");
fs.writeFileSync('C:/roshetta_app/src/components/GlobalToast.js', code, 'utf8');
