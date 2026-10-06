const fs = require('fs');

let logo = fs.readFileSync('web/src/components/RoshettaLogo.tsx', 'utf8');
logo = logo.replace('className = "w-10 h-10"', 'className = "h-10 w-auto"');
// Add max-width so it doesn't break containers if it's too wide
logo = logo.replace('className={`${className} object-contain', 'className={`${className} max-w-full object-contain');
fs.writeFileSync('web/src/components/RoshettaLogo.tsx', logo, 'utf8');

let icons = fs.readFileSync('web/src/components/icons.tsx', 'utf8');
icons = icons.replace('className = "w-6 h-6"', 'className = "h-6 w-auto"');
icons = icons.replace('object-cover', 'object-contain max-w-full');
fs.writeFileSync('web/src/components/icons.tsx', icons, 'utf8');

let login = fs.readFileSync('web/src/app/login/page.tsx', 'utf8');
login = login.replace('className="w-12 h-12"', 'className="h-12 w-auto"');
fs.writeFileSync('web/src/app/login/page.tsx', login, 'utf8');

let reg = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');
reg = reg.replace('className="w-5 h-5"', 'className="h-6 w-auto"');
fs.writeFileSync('web/src/app/register/page.tsx', reg, 'utf8');

let appbar = fs.readFileSync('web/src/components/AppBar.tsx', 'utf8');
appbar = appbar.replace('className="w-[30px] h-[30px] shrink-0"', 'className="h-[30px] w-auto shrink-0"');
fs.writeFileSync('web/src/components/AppBar.tsx', appbar, 'utf8');

console.log('Fixed all logo constraints');
