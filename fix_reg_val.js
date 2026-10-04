const fs = require('fs');
let c = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

c = c.replace(
  'if (!formData.pharmacyName || !formData.email || !formData.password) {',
  'if (!formData.pharmacyName || !formData.managerName || !formData.email || !formData.phone || !formData.password) {'
);

// We need to find the toast and replace the text.
// The text might be garbled in the file if it was saved with wrong encoding, but we just want to replace whatever is there.
// Let's replace the whole handleNext function to be safe.
const handleNextRegex = /const handleNext = \(\) => \{[\s\S]*?return;[\s\S]*?\}/;
c = c.replace(handleNextRegex, `const handleNext = () => {
    if (!formData.pharmacyName || !formData.managerName || !formData.email || !formData.phone || !formData.password) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح");
      return;
    }`);

fs.writeFileSync('web/src/app/register/page.tsx', c, 'utf8');
console.log('Fixed handleNext validation');
