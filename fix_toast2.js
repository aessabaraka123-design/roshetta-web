const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/components/GlobalToast.js', 'utf8');
code = code.replace(/<Text style=\{\{fontSize: 20\}\}>\{toast.emoji\}<\/Text>/g, "<Text style={{fontSize: 20}}>{toast.emoji || '🔔'}</Text>");
fs.writeFileSync('C:/roshetta_app/src/components/GlobalToast.js', code, 'utf8');
