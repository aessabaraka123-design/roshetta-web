const fs = require('fs');

let logo = fs.readFileSync('web/src/components/RoshettaLogo.tsx', 'utf8');
logo = logo.replace('className = "w-10 h-10"', 'className = "h-10 w-auto"');
fs.writeFileSync('web/src/components/RoshettaLogo.tsx', logo, 'utf8');

let icons = fs.readFileSync('web/src/components/icons.tsx', 'utf8');
icons = icons.replace('className = "w-6 h-6"', 'className = "h-6 w-auto"');
fs.writeFileSync('web/src/components/icons.tsx', icons, 'utf8');

console.log('Fixed logo width');
