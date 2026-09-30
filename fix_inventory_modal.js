const fs = require('fs');

const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace the modal wrapper
const oldWrapperStart = `<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">`;
const newWrapperStart = `<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center shrink-0">`;
code = code.replace(oldWrapperStart, newWrapperStart);

// Replace the form start
const oldFormStart = `<form onSubmit={handleUpdate} className="p-5 space-y-4">`;
const newFormStart = `<form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden">\n              <div className="p-5 space-y-4 overflow-y-auto flex-1">`;
code = code.replace(oldFormStart, newFormStart);

// Replace the submit button
const oldSubmitButton = `<button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 mt-2 hover:bg-teal transition-colors">
                حفظ التعديلات
              </button>
            </form>`;
const newSubmitButton = `</div>\n              <div className="p-5 border-t border-mint-line bg-white shrink-0">\n                <button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 hover:bg-teal transition-colors">\n                  حفظ التعديلات\n                </button>\n              </div>\n            </form>`;
code = code.replace(oldSubmitButton, newSubmitButton);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Fixed inventory edit modal layout');
