const fs = require('fs');

const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Ensure the form has min-h-0 and correct flex setup
const oldFormStart = `<form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">`;
const newFormStart = `<form onSubmit={handleUpdate} className="flex flex-col overflow-hidden min-h-0 flex-1">`;
code = code.replace(oldFormStart, newFormStart);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed flex layout for form');
