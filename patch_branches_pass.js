const fs = require('fs');

let branches = fs.readFileSync('web/src/app/branches/page.tsx', 'utf8');

const regexToReplace = /if \\(!newStaff\\.name \\|\\| !newStaff\\.phone \\|\\| !newStaff\\.password\\) \\{\\s*toast\\.error\\(language === 'en' \\? 'Please fill all required fields' : "يرجى تعبئة كافة الحقول"\\);\\s*return;\\s*\\}/;

const newValidation = `if (!newStaff.name || !newStaff.phone || !newStaff.password) {
      toast.error(language === 'en' ? 'Please fill all required fields' : "يرجى تعبئة كافة الحقول");
      return;
    }
    if (newStaff.password.length < 6) {
      toast.error(language === 'en' ? 'Password must be at least 6 characters' : "كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }
    if (!/(?=.*[a-zA-Z\\u0600-\\u06FF])(?=.*\\d)(?=.*[^a-zA-Z\\u0600-\\u06FF\\d\\s])/.test(newStaff.password)) {
      toast.error(language === 'en' ? 'Password must contain letters, numbers, and symbols' : "يجب أن تحتوي كلمة المرور على أحرف، وأرقام، ورموز");
      return;
    }`;

if (regexToReplace.test(branches)) {
  branches = branches.replace(regexToReplace, newValidation);
  fs.writeFileSync('web/src/app/branches/page.tsx', branches, 'utf8');
  console.log('Successfully updated password validation in branches page.');
} else {
  console.log('Could not find password validation block.');
}
