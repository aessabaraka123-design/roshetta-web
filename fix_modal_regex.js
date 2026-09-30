const fs = require('fs');

const filePath = 'web/src/app/inventory/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Use regex to replace the wrapper and form classes to be robust against CRLF
const wrapperRegex = /<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">\s*<div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">/g;
const newWrapper = `<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center shrink-0">`;

if (wrapperRegex.test(code)) {
    code = code.replace(wrapperRegex, newWrapper);
    console.log("Wrapper replaced successfully.");
} else {
    console.log("Could not find wrapper.");
}

const formStartRegex = /<form onSubmit=\{handleUpdate\} className="p-5 space-y-4">/g;
const newFormStart = `<form onSubmit={handleUpdate} className="flex flex-col flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">`;

if (formStartRegex.test(code)) {
    code = code.replace(formStartRegex, newFormStart);
    console.log("Form start replaced successfully.");
} else {
    console.log("Could not find form start.");
}

// Find the button and replace it
const submitButtonRegex = /<button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 mt-2 hover:bg-teal transition-colors">\s*حفظ التعديلات\s*<\/button>\s*<\/form>/g;
const newSubmitButton = `</div>
              <div className="p-5 border-t border-mint-line bg-white shrink-0">
                <button type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3 hover:bg-teal transition-colors">
                  حفظ التعديلات
                </button>
              </div>
            </form>`;

if (submitButtonRegex.test(code)) {
    code = code.replace(submitButtonRegex, newSubmitButton);
    console.log("Submit button replaced successfully.");
} else {
    console.log("Could not find submit button.");
}

fs.writeFileSync(filePath, code, 'utf8');
