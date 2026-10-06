const fs = require('fs');

let logo = fs.readFileSync('web/src/components/RoshettaLogo.tsx', 'utf8');
logo = logo.replace('{showText && <span className={textClassName}>{language === "en" ? "Roshetta" : "روشتة"}</span>}', '');
fs.writeFileSync('web/src/components/RoshettaLogo.tsx', logo, 'utf8');

console.log('Removed text from RoshettaLogo');
