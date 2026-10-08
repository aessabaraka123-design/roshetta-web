const fs = require('fs');

let register = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

// 1. Update labels
register = register.replace(
  'language === "en" ? "Transferer Name (Optional)" : "اسم المحول (اختياري)"',
  'language === "en" ? "Transferer Name" : "اسم المحول (مطلوب أحدهما)"'
);
register = register.replace(
  'language === "en" ? "Reference Number (Optional)" : "رقم المرجع (اختياري)"',
  'language === "en" ? "Reference Number" : "رقم المرجع (مطلوب أحدهما)"'
);

// 2. Add validation to handleRegister
const handleRegStart = 'const handleRegister = async () => {\n    setIsLoading(true);';
const handleRegStartNew = `const handleRegister = async () => {
    if (!transferName.trim() && !transferRef.trim()) {
      toast.error(language === "en" ? "Please enter either Transferer Name or Reference Number" : "يرجى إدخال اسم المحول أو رقم المرجع لتأكيد الدفعة");
      return;
    }
    setIsLoading(true);`;
register = register.replace(handleRegStart, handleRegStartNew);

// 3. Update disabled state
register = register.replace(
  'disabled={isLoading || !receiptImage}',
  'disabled={isLoading || !receiptImage || (!transferName.trim() && !transferRef.trim())}'
);
// Replace twice because it might appear in the `cursor:` logic too
register = register.replace(
  'opacity: !receiptImage || isLoading ? 0.5 : 1,',
  'opacity: (!receiptImage || isLoading || (!transferName.trim() && !transferRef.trim())) ? 0.5 : 1,'
);
register = register.replace(
  '!receiptImage || isLoading\n                              ? "not-allowed"',
  '(!receiptImage || isLoading || (!transferName.trim() && !transferRef.trim()))\n                              ? "not-allowed"'
);
register = register.replace(
  '!receiptImage || isLoading ? "not-allowed"',
  '(!receiptImage || isLoading || (!transferName.trim() && !transferRef.trim())) ? "not-allowed"'
);

fs.writeFileSync('web/src/app/register/page.tsx', register, 'utf8');
console.log('Successfully updated registration page to require transferName or transferRef');
