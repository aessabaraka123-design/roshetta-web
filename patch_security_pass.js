const fs = require('fs');

let security = fs.readFileSync('web/src/app/security/page.tsx', 'utf8');

const regexToReplace = /if \\(newPassword !== confirmPassword\\) \\{\\s*toast\\.error\\(language === "en" \\? "New passwords do not match" : "[\\s\\S]*?"\\);\\s*return;\\s*\\}/;
const newValidation = `if (newPassword.length < 6) {
      toast.error(language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }
    if (!/(?=.*[a-zA-Z\\u0600-\\u06FF])(?=.*\\d)(?=.*[^a-zA-Z\\u0600-\\u06FF\\d\\s])/.test(newPassword)) {
      toast.error(language === "en" ? "Password must contain letters, numbers, and symbols" : "يجب أن تحتوي كلمة المرور على أحرف، وأرقام، ورموز");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === "en" ? "New passwords do not match" : "كلمة المرور الجديدة غير متطابقة");
      return;
    }`;

if (regexToReplace.test(security)) {
  security = security.replace(regexToReplace, newValidation);
  fs.writeFileSync('web/src/app/security/page.tsx', security, 'utf8');
  console.log('Successfully updated password validation in security page.');
} else {
  console.log('Could not find password validation block.');
}
