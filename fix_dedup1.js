const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

code = code.replace(/id: "low_stock_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "low_stock_" + item.id,');
code = code.replace(/id: "exp_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "exp_" + item.id,');
code = code.replace(/id: "exp_passed_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "exp_passed_" + item.id,');

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
