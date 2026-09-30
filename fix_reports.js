const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/reports/ReportsScreen.js', 'utf8');
code = code.replace(/<\/ScreenContainer>/, '');
// And remove import ScreenContainer
code = code.replace(/import ScreenContainer from '\.\.\/\.\.\/components\/ScreenContainer';\n/, '');
fs.writeFileSync('C:/roshetta_app/src/screens/reports/ReportsScreen.js', code, 'utf8');
