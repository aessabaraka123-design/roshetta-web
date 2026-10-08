const fs = require('fs');

let register = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

const oldPassValidation = `} else if (formData.password.length < 6) {
      newErrors.password = language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات";
    }`;

const newPassValidation = `} else if (formData.password.length < 6) {
      newErrors.password = language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات";
    } else if (!/^(?=.*[a-zA-Z\\u0600-\\u06FF])(?=.*\\d)(?=.*[^a-zA-Z\\u0600-\\u06FF\\d\\s]).+$/.test(formData.password)) {
      newErrors.password = language === "en" ? "Password must contain letters, numbers, and symbols" : "يجب أن تحتوي كلمة المرور على أحرف وأرقام ورموز";
    }`;

// Wait, standard regex for letters, numbers, and symbols:
// /(?=.*[a-zA-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s])/
// Let's use this regex in the replacement.

const replacementScript = `
const regexToReplace = /\\} else if \\(formData\\.password\\.length < 6\\) \\{\\s*newErrors\\.password = [\\s\\S]*?\\}/;
const newValidation = \`} else if (formData.password.length < 6) {
      newErrors.password = language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات";
    } else if (!/(?=.*[a-zA-Z\\u0600-\\u06FF])(?=.*\\d)(?=.*[^a-zA-Z\\u0600-\\u06FF\\d\\s])/.test(formData.password)) {
      newErrors.password = language === "en" ? "Password must contain letters, numbers, and symbols" : "يجب أن تحتوي كلمة المرور على أحرف، وأرقام، ورموز";
    }\`;

if (regexToReplace.test(register)) {
  register = register.replace(regexToReplace, newValidation);
  fs.writeFileSync('web/src/app/register/page.tsx', register, 'utf8');
  console.log('Successfully updated password validation in register page.');
} else {
  console.log('Could not find password validation block.');
}
`;

fs.writeFileSync('patch_register_pass.js', replacementScript, 'utf8');
