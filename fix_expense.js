const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/core/AddExpenseScreen.js', 'utf8');

// Remove opening and closing tags
code = code.replace(/<ScreenContainer scrollable=\{false\} noPadding>/g, '');
code = code.replace(/<\/ScreenContainer>/g, '');

// Remove import
code = code.replace(/import ScreenContainer from '\.\.\/\.\.\/components\/ScreenContainer';\n/g, '');

fs.writeFileSync('C:/roshetta_app/src/screens/core/AddExpenseScreen.js', code, 'utf8');
